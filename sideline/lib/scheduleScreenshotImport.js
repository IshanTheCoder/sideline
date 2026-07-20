/**
 * Schedule screenshot import — points a Groq vision model at a photo or
 * screenshot of a game schedule and returns structured rows
 * ({opponent, date, time, venue}) ready for the Add Games review list.
 * Shares the base64/model-loop plumbing with lib/rosterScreenshotImport.js
 * via lib/visionImport.js.
 */
import { runVisionExtraction } from './visionImport';

const SYSTEM_PROMPT = `You extract sports game schedules from photos and screenshots.
Return ONLY valid JSON with this exact shape:
{"games":[{"opponent":"string","date":"YYYY-MM-DD|null","time":"string|null","venue":"Home|Away|null"}]}

Rules:
- Extract every visible game row.
- "opponent" is the other team's name, without any "vs", "@", or "at" prefix.
- A leading "@" or "at" before the opponent means venue is "Away"; otherwise use any Home/Away column if present, else null.
- "date" must be ISO YYYY-MM-DD with the correct month. Many schedules group rows under month or season headers (e.g. "SEPTEMBER", "Fall 2026") — apply that header's month/year to every row beneath it until the next header. If a row shows only a day number, take the month from its section header or column.
- If no year is shown anywhere, assume the current year ${new Date().getFullYear()}; if the schedule spans a year boundary (e.g. Dec then Jan), roll the later months into the following year. If no date is readable at all, null.
- "time" is the printed start time (example: "6:00 PM"), else null.
- Skip byes, practices, and rows with no opponent.
- Never include markdown or extra text.`;

function sanitizeGames(payload) {
  const list = Array.isArray(payload?.games) ? payload.games : [];
  const cleaned = list
    .map((g) => {
      const rawDate = g?.date == null ? '' : String(g.date).trim();
      const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : '';
      const rawVenue = g?.venue == null ? '' : String(g.venue).trim().toLowerCase();
      const venue = rawVenue === 'home' ? 'Home' : rawVenue === 'away' ? 'Away' : '';
      return {
        opponent: String(g?.opponent ?? '').trim().replace(/^(vs\.?|@|at)\s+/i, ''),
        date,
        time: g?.time == null ? '' : String(g.time).trim(),
        venue,
      };
    })
    .filter((g) => g.opponent.length > 0);

  // De-duplicate by opponent + date while preserving order.
  const seen = new Set();
  const deduped = [];
  for (const game of cleaned) {
    const key = `${game.opponent.toLowerCase()}::${game.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(game);
  }
  return deduped;
}

/**
 * Uses a vision model to parse a schedule photo/screenshot into structured rows.
 * @param {{ uri: string, mimeType?: string }} imageAsset
 * @returns {Promise<{ games: Array<{opponent: string, date: string, time: string, venue: string}>, error: Error|null }>}
 */
export async function parseScheduleFromScreenshot(imageAsset) {
  const { items, error } = await runVisionExtraction({
    imageAsset,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: 'Extract the game schedule from this image and return games JSON only.',
    sanitize: sanitizeGames,
  });
  return { games: items, error };
}
