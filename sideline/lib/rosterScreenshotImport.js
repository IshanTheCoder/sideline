/**
 * Points a Groq vision model at a roster photo/screenshot and returns
 * structured player rows. Shares the base64/model-loop plumbing with
 * lib/scheduleScreenshotImport.js via lib/visionImport.js.
 */
import { runVisionExtraction } from './visionImport';

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

/**
 * Uses a vision model to parse a roster screenshot into structured rows.
 * @param {{ uri: string, mimeType?: string }} imageAsset
 * @returns {Promise<{ players: Array<{name: string, number: string, position: string, grade: string}>, error: Error|null }>}
 */
export async function parseRosterFromScreenshot(imageAsset) {
  const { items, error } = await runVisionExtraction({
    imageAsset,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: 'Extract the roster table from this screenshot and return players JSON only.',
    sanitize: sanitizePlayers,
  });
  return { players: items, error };
}
