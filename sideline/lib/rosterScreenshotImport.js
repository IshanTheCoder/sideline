import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.2-11b-vision-preview',
];

const SYSTEM_PROMPT = `You extract volleyball roster tables from screenshots.
Return ONLY valid JSON with this exact shape:
{"players":[{"name":"string","number":"string|null","position":"string|null","grade":"string|null"}]}

Rules:
- Extract all visible player rows.
- Keep jersey number as plain digits string when present (example: "12"), else null.
- Keep position as comma-separated initials when possible (S, OH, MB, O, L, DS). Example: "L, DS".
- Keep grade/class text concise ("Freshman", "Sophomore", "Junior", "Senior", or original class text if unclear).
- If a row has no player name, skip it.
- Never include markdown or extra text.`;

function parseJsonFromModelOutput(content) {
  if (!content || typeof content !== 'string') return null;
  let raw = content.trim();
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock) raw = codeBlock[1].trim();
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sanitizePlayers(payload) {
  const list = Array.isArray(payload?.players) ? payload.players : [];
  const cleaned = list
    .map((p) => ({
      name: String(p?.name ?? '').trim(),
      number: p?.number == null || String(p.number).trim() === '' ? '' : String(p.number).replace(/[^\d]/g, '').trim(),
      position: p?.position == null ? '' : String(p.position).trim(),
      grade: p?.grade == null ? '' : String(p.grade).trim(),
    }))
    .filter((p) => p.name.length > 0);

  // De-duplicate by name + number while preserving order.
  const seen = new Set();
  const deduped = [];
  for (const player of cleaned) {
    const key = `${player.name.toLowerCase()}::${player.number}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(player);
  }
  return deduped;
}

async function blobToBase64(blob) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to convert screenshot to base64.'));
        return;
      }
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read screenshot data.'));
    reader.readAsDataURL(blob);
  });
}

async function readImageAsBase64(uri) {
  if (Platform.OS === 'web') {
    if (uri.startsWith('data:')) {
      const parts = uri.split(',');
      return parts.length > 1 ? parts[1] : '';
    }
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to read screenshot: ${response.status}`);
    }
    const blob = await response.blob();
    return blobToBase64(blob);
  }

  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

/**
 * Uses a vision model to parse a roster screenshot into structured rows.
 * @param {{ uri: string, mimeType?: string }} imageAsset
 * @returns {Promise<{ players: Array<{name: string, number: string, position: string, grade: string}>, error: Error|null }>}
 */
export async function parseRosterFromScreenshot(imageAsset) {
  try {
    if (!groqApiKey) {
      return { players: [], error: new Error('Missing Groq API key') };
    }
    if (!imageAsset?.uri) {
      return { players: [], error: new Error('No screenshot selected') };
    }

    const mimeType = imageAsset.mimeType || 'image/jpeg';
    const base64 = await readImageAsBase64(imageAsset.uri);
    if (!base64) {
      return { players: [], error: new Error('Could not read screenshot data') };
    }

    const userPrompt = 'Extract the roster table from this screenshot and return players JSON only.';
    const imageDataUrl = `data:${mimeType};base64,${base64}`;

    let lastError = null;

    for (const model of GROQ_VISION_MODELS) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 1000,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: imageDataUrl } },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Groq vision API error (${model}): ${response.status} ${errText}`);
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      const parsed = parseJsonFromModelOutput(content);
      if (!parsed) {
        lastError = new Error(`Could not parse roster output (${model})`);
        continue;
      }

      const players = sanitizePlayers(parsed);
      return { players, error: null };
    }

    return {
      players: [],
      error: lastError ?? new Error('Could not parse roster screenshot.'),
    };
  } catch (error) {
    return {
      players: [],
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
