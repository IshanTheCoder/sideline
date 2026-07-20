/**
 * Shared plumbing for the Groq vision-model screenshot importers (roster,
 * schedule): reading an image into base64 across web/native, extracting
 * JSON from a model response, and running the model-with-fallback loop.
 * Callers supply the prompt + sanitize step for their own data shape.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

// Groq retired its llama vision preview models; qwen/qwen3.6-27b is the only
// vision-capable model left on the account as of 2026-07-19 (checked via
// console.groq.com/dashboard and GET /v1/models).
export const GROQ_VISION_MODELS = ['qwen/qwen3.6-27b'];

export function parseJsonFromModelOutput(content) {
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

export async function readImageAsBase64(uri) {
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
 * Runs a photo/screenshot through the Groq vision models (with fallback)
 * and hands the parsed JSON to `sanitize` for shaping into the caller's
 * result type.
 * @param {{ imageAsset: {uri: string, mimeType?: string}, systemPrompt: string, userPrompt: string, sanitize: (parsed: unknown) => Array<object> }} params
 * @returns {Promise<{ items: Array<object>, error: Error|null }>}
 */
export async function runVisionExtraction({ imageAsset, systemPrompt, userPrompt, sanitize }) {
  try {
    if (!groqApiKey) {
      return { items: [], error: new Error('Missing Groq API key') };
    }
    if (!imageAsset?.uri) {
      return { items: [], error: new Error('No screenshot selected') };
    }

    const mimeType = imageAsset.mimeType || 'image/jpeg';
    const base64 = await readImageAsBase64(imageAsset.uri);
    if (!base64) {
      return { items: [], error: new Error('Could not read screenshot data') };
    }

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
          max_tokens: 3000,
          // qwen3.6 is a reasoning model — its hidden <think> tokens count
          // toward max_tokens and can crowd out the actual JSON answer
          // (confirmed: default reasoning ate the full budget on a 24-game
          // schedule with finish_reason 'length' and no JSON). We just want
          // extraction, not deliberation, so turn thinking off entirely.
          reasoning_effort: 'none',
          messages: [
            { role: 'system', content: systemPrompt },
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
        lastError = new Error(`Could not parse vision model output (${model})`);
        continue;
      }

      return { items: sanitize(parsed), error: null };
    }

    return {
      items: [],
      error: lastError ?? new Error('Could not parse screenshot.'),
    };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
