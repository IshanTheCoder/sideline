/**
 * The post-game storyteller — takes a pile of raw recording labels and asks
 * Groq to distill them into "What You Noticed Most" themes and a smooth
 * "Match Flow" narrative. Basically turns coach brain-dump into readable prose.
 */

import { groqChat, getGroqApiKey } from './groqClient';

const VALID_SKILLS = new Set([
  'serving', 'passing', 'setting', 'attacking', 'blocking',
  'defense', 'transition', 'communication', 'positioning', 'strategy',
]);

const NOTICED_MOST_SYSTEM = `You are a volleyball coaching assistant that produces specific, actionable practice priorities. Given in-game recording labels and transcriptions from a single match, produce 3–6 concrete coaching takeaways.

CRITICAL RULES:
- Each takeaway must reference a SPECIFIC skill, drill, or tactical adjustment the coach can act on at the next practice.
- Be specific: instead of "Improve Communication" say "Work on calling the ball louder during serve-receive". Instead of "Stay Aggressive" say "Push for faster tempo on outside sets".
- Ground every point in the labels/transcriptions provided. Do NOT invent feedback the coach never gave.
- Do NOT use vague motivational language like "trust instincts", "stay focused", "keep energy up", "build confidence".
- Include player first names when the labels mention them — e.g. "Ishan needs to hold setter position closer to net".
- The "text" of each takeaway should be 6–15 words, phrased as a specific observation or action item.
- Output a JSON array of objects only, no other text. Each object has:
  - "text": the takeaway (string)
  - "skill": ONE of serving, passing, setting, attacking, blocking, defense, transition, communication, positioning, strategy — or null if none fits
  - "players": array of player first names this takeaway is about (empty array if team-wide)
  - "priority": 1 if the coach flagged it repeatedly or it cost points, 2 for a clear correction, 3 for a minor note
- Example: [{"text": "Tighten serve-receive platform angle on float serves", "skill": "passing", "players": ["Maya"], "priority": 1}]`;

const MATCH_FLOW_SYSTEM = `You are a volleyball coaching assistant. Given in-game feedback labels and transcriptions from a single match, write a short post-game summary paragraph.

CRITICAL RULES:
- Write exactly 4–5 sentences that synthesize the coach's observations into a cohesive summary.
- Base EVERY sentence on the provided labels and transcriptions. Do NOT add anything the coach did not say.
- Mention players by first name when the labels reference them.
- Write in third person from the perspective of an assistant summarizing the coach's notes (e.g. "The coach noted…", "Midyan showed…").
- Keep the tone professional and concise — like a brief scouting report.
- Do NOT use vague filler like "overall the team did great" or "the match was intense" unless the coach said it.
- Each sentence must be grammatically correct.
- Do NOT end the paragraph with a period on the last sentence.
- Output a single JSON string (the paragraph). No other text. Example: "First sentence. Second sentence. Third sentence. Fourth sentence"`;

/**
 * Normalizes one raw takeaway from the model into { text, skill, players, priority }.
 * Accepts both the new object shape and legacy plain strings, so an older/dumber
 * model response degrades gracefully instead of blanking the section.
 * @param {unknown} raw
 * @returns {{ text: string, skill: string|null, players: string[], priority: number }|null}
 */
export function normalizeTakeaway(raw) {
  if (typeof raw === 'string') {
    const text = raw.trim().slice(0, 150);
    return text ? { text, skill: null, players: [], priority: 2 } : null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const text = typeof raw.text === 'string' ? raw.text.trim().slice(0, 150) : '';
  if (!text) return null;
  const skillRaw = typeof raw.skill === 'string' ? raw.skill.trim().toLowerCase() : '';
  const skill = VALID_SKILLS.has(skillRaw) ? skillRaw : null;
  const players = Array.isArray(raw.players)
    ? raw.players.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim().slice(0, 40)).slice(0, 6)
    : [];
  const priorityNum = Number(raw.priority);
  const priority = priorityNum >= 1 && priorityNum <= 3 ? Math.round(priorityNum) : 2;
  return { text, skill, players, priority };
}

/**
 * @param {{ displayLabel: string, transcription?: string }[]} items - labels + optional raw transcriptions from the game
 * @returns {Promise<{ takeaways: { text: string, skill: string|null, players: string[], priority: number }[], themes: string[], error: Error|null }>}
 *   `themes` (plain strings) is kept for backward compatibility with older callers.
 */
export async function synthesizeNoticedMost(items) {
  if (!getGroqApiKey()) {
    return { takeaways: [], themes: [], error: new Error('Missing Groq API key') };
  }
  if (!items?.length) {
    return { takeaways: [], themes: [], error: null };
  }

  const input = items
    .slice(0, 25)
    .map((i) => (i.transcription ? `Label: ${i.displayLabel}\nTranscription: ${i.transcription}` : i.displayLabel))
    .join('\n---\n');

  const userPrompt = `From these in-game notes, produce 3–6 specific, actionable coaching takeaways the coach can use at the next practice. Reference specific skills, players, and situations — no vague motivational phrases. Reply with ONLY a JSON array of objects with keys text, skill, players, priority.\n\n${input}`;

  try {
    const data = await groqChat({
      messages: [
        { role: 'system', content: NOTICED_MOST_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 700,
      temperature: 0.3,
    });

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { takeaways: [], themes: [], error: new Error('Empty Groq response') };

    const parsed = parseJsonArray(content);
    const takeaways = Array.isArray(parsed)
      ? parsed.map(normalizeTakeaway).filter(Boolean).slice(0, 6)
      : [];
    // most urgent first — priority 1 means "cost us points"
    takeaways.sort((a, b) => a.priority - b.priority);
    return { takeaways, themes: takeaways.map((t) => t.text), error: null };
  } catch (err) {
    console.error('synthesizeNoticedMost error:', err);
    return {
      takeaways: [],
      themes: [],
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * @param {string[]} labels - recording labels from the game
 * @returns {Promise<{ summary: string, error: Error|null }>}
 */
export async function synthesizePostGameSummary(labels) {
  if (!getGroqApiKey()) {
    return { summary: '', error: new Error('Missing Groq API key') };
  }
  if (!labels?.length) {
    return { summary: '', error: null };
  }

  const input = labels.slice(0, 25).join('\n');

  const userPrompt = `Write a 4–5 sentence post-game summary paragraph based ONLY on these coaching notes. Mention players by first name. Keep it concise and professional. Reply with ONLY a JSON string.\n\n${input}`;

  try {
    const data = await groqChat({
      messages: [
        { role: 'system', content: MATCH_FLOW_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { summary: '', error: new Error('Empty Groq response') };

    const summary = extractSummaryText(content);

    return { summary: summary.slice(0, 600), error: null };
  } catch (err) {
    console.error('synthesizePostGameSummary error:', err);
    return {
      summary: '',
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

const PLAYER_SUMMARIES_SYSTEM = `You are a volleyball coaching assistant. You are given coaching notes from a match AND a list of players on the roster. Produce a 4–6 word performance summary for each roster player mentioned in the notes.

CRITICAL RULES:
- ONLY include players whose EXACT first name appears in the ROSTER list provided. No other names.
- Volleyball terms like "line", "angle", "set", "block", "kill", "ace", "serve", "cross", "slide" are NOT player names.
- Use each player's first name EXACTLY as spelled in the roster.
- Summarize ONLY what the coach explicitly said about them in 4–6 words.
- Capitalize the first word only. Do NOT end with a period.
- If a roster player is not mentioned in the notes, skip them.
- Output a JSON object mapping each player's first name to their summary. No other text.
- Example: {"Ishan": "Tighten setter position near net", "Eshwar": "Strong left side combination attacks"}`;

/**
 * @param {string[]} excerpts - raw labels and transcriptions from the game
 * @param {string[]} rosterNames - first names of players on the roster
 * @returns {Promise<{ summaries: { name: string, summary: string }[], error: Error|null }>}
 */
export async function synthesizePlayerSummaries(excerpts, rosterNames = []) {
  if (!getGroqApiKey()) {
    return { summaries: [], error: new Error('Missing Groq API key') };
  }
  if (!excerpts?.length || !rosterNames?.length) {
    return { summaries: [], error: null };
  }

  const input = excerpts.slice(0, 30).join('\n');
  const rosterList = rosterNames.join(', ');

  const userPrompt = `ROSTER PLAYERS: ${rosterList}\n\nCOACHING NOTES:\n${input}\n\nFor each roster player mentioned in the notes, write a 4–6 word performance summary. ONLY use names from the roster list — ignore all other words. Reply with ONLY a JSON object.`;

  try {
    const data = await groqChat({
      messages: [
        { role: 'system', content: PLAYER_SUMMARIES_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.2,
    });

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { summaries: [], error: new Error('Empty Groq response') };

    const parsed = parseJsonObject(content);
    if (!parsed || typeof parsed !== 'object') {
      return { summaries: [], error: new Error('Invalid Groq response format') };
    }

    const rosterSet = new Set(rosterNames.map((n) => n.toLowerCase()));
    const summaries = Object.entries(parsed)
      .filter(([name]) => rosterSet.has(name.toLowerCase().trim()))
      .map(([name, summary]) => {
        const correctName = rosterNames.find((r) => r.toLowerCase() === name.toLowerCase().trim()) || name;
        return {
          name: correctName,
          summary: typeof summary === 'string' ? summary.trim().replace(/\.+$/, '').slice(0, 80) : '',
        };
      })
      .filter((s) => s.summary);

    return { summaries, error: null };
  } catch (err) {
    console.error('synthesizePlayerSummaries error:', err);
    return {
      summaries: [],
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

const PRACTICE_PLAN_SYSTEM = `You are a volleyball coaching assistant that turns one game's notes into a concrete practice plan. Given the coach's in-game notes (labels + transcriptions), produce a JSON object with:
- "hero": {"drill": one specific drill name (3-6 words) that addresses the single most repeated problem, "evidence": one sentence tying it to the notes, e.g. "5 of your 12 notes were the same note, platforms collapse when the pace goes up."}
- "players": array (max 4, most-noted first) of {"name": player first name from the notes, "insight": 1-2 sentence specific summary of what the notes say about them, "drill": a short drill suggestion with reps/minutes, or "None, reinforce publicly" for pure praise}
- "plan": array of exactly 3 {"name": drill name, "why": short phrase naming players/skills it targets, "mins": like "15 min"}

CRITICAL RULES:
- Ground everything ONLY in the provided notes. Do NOT invent problems or players.
- Be specific and tactical — never vague ("work hard", "stay focused" are banned).
- Use player first names exactly as they appear in the notes.
- Output the JSON object only, no other text.`;

/**
 * One-call practice plan for the Game Analysis screen: the "do one thing"
 * hero, per-player insight cards with drill suggestions, and a 3-drill
 * numbered practice plan.
 * @param {{ displayLabel: string, transcription?: string }[]} items
 * @returns {Promise<{ hero: {drill: string, evidence: string}|null, players: Array<{name: string, insight: string, drill: string}>, plan: Array<{name: string, why: string, mins: string}>, error: Error|null }>}
 */
export async function synthesizePracticePlan(items) {
  if (!getGroqApiKey()) {
    return { hero: null, players: [], plan: [], error: new Error('Missing Groq API key') };
  }
  if (!items?.length) {
    return { hero: null, players: [], plan: [], error: null };
  }

  const input = items
    .slice(0, 25)
    .map((i) => (i.transcription ? `Label: ${i.displayLabel}\nTranscription: ${i.transcription}` : i.displayLabel))
    .join('\n---\n');

  const userPrompt = `From these in-game notes, produce the practice-plan JSON object.\n\n${input}`;

  try {
    const data = await groqChat({
      messages: [
        { role: 'system', content: PRACTICE_PLAN_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 900,
      temperature: 0.3,
    });

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { hero: null, players: [], plan: [], error: new Error('Empty Groq response') };

    const parsed = parseJsonObject(content);
    if (!parsed || typeof parsed !== 'object') {
      return { hero: null, players: [], plan: [], error: new Error('Invalid Groq response format') };
    }

    const hero =
      parsed.hero && typeof parsed.hero.drill === 'string'
        ? {
            drill: parsed.hero.drill.trim(),
            evidence: typeof parsed.hero.evidence === 'string' ? parsed.hero.evidence.trim() : '',
          }
        : null;
    const players = Array.isArray(parsed.players)
      ? parsed.players
          .filter((p) => p && typeof p.name === 'string' && typeof p.insight === 'string')
          .map((p) => ({
            name: p.name.trim(),
            insight: p.insight.trim(),
            drill: typeof p.drill === 'string' ? p.drill.trim() : '',
          }))
          .slice(0, 4)
      : [];
    const plan = Array.isArray(parsed.plan)
      ? parsed.plan
          .filter((d) => d && typeof d.name === 'string')
          .map((d) => ({
            name: d.name.trim(),
            why: typeof d.why === 'string' ? d.why.trim() : '',
            mins: typeof d.mins === 'string' ? d.mins.trim() : '',
          }))
          .slice(0, 3)
      : [];

    return { hero, players, plan, error: null };
  } catch (err) {
    console.error('synthesizePracticePlan error:', err);
    return {
      hero: null,
      players: [],
      plan: [],
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

const OPPONENT_SCOUTING_SYSTEM = `You are a volleyball scouting assistant. Given a coach's in-game observations about the OPPOSING team from a single match, produce 3–6 concrete, actionable scouting points the coach can use to exploit that opponent next time.

CRITICAL RULES:
- Every point must describe a specific opponent tendency, weakness, or matchup to attack (e.g. "Serve zone 1 — their libero struggles to pass deep floats", "Their middle is slow to close the block on slides").
- Ground every point ONLY in the observations provided. Do NOT invent tendencies the coach never mentioned.
- Frame points as how to exploit or what to watch for — not as feedback for your own players.
- Do NOT use vague filler like "play hard" or "stay focused".
- Each point should be 6–16 words, phrased as a specific tactical action or observation.
- Output a JSON array of strings only, no other text.`;

/**
 * @param {{ displayLabel: string, transcription?: string }[]} items - opponent-tagged labels + optional transcriptions
 * @param {string} [opponentName] - name of the opposing team, for context
 * @returns {Promise<{ points: string[], error: Error|null }>}
 */
export async function synthesizeOpponentScoutingReport(items, opponentName = '') {
  if (!getGroqApiKey()) {
    return { points: [], error: new Error('Missing Groq API key') };
  }
  if (!items?.length) {
    return { points: [], error: null };
  }

  const input = items
    .slice(0, 25)
    .map((i) => (i.transcription ? `Label: ${i.displayLabel}\nTranscription: ${i.transcription}` : i.displayLabel))
    .join('\n---\n');

  const opponentLine = opponentName ? `The opposing team is "${opponentName}". ` : '';
  const userPrompt = `${opponentLine}From these in-game observations about the opposing team, produce 3–6 specific, actionable scouting points to exploit them next time. Reference specific skills, situations, and tendencies — no vague phrases. Reply with ONLY a JSON array of strings.\n\n${input}`;

  try {
    const data = await groqChat({
      messages: [
        { role: 'system', content: OPPONENT_SCOUTING_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 480,
      temperature: 0.3,
    });

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { points: [], error: new Error('Empty Groq response') };

    const parsed = parseJsonArray(content);
    const points = Array.isArray(parsed)
      ? parsed.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim().slice(0, 150))
      : [];
    return { points: points.slice(0, 6), error: null };
  } catch (err) {
    console.error('synthesizeOpponentScoutingReport error:', err);
    return {
      points: [],
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Robustly pull the post-game summary paragraph out of whatever shape the model
 * returned. The prompt asks for a bare JSON string, but the model sometimes wraps
 * it in an object ({"summary":"..."}) or emits a malformed fragment. The old code
 * only handled a bare string: a valid object silently produced an empty summary,
 * and a malformed one leaked a trailing `"}` into the UI. This handles all four:
 * bare JSON string, JSON object (summary/text/paragraph or first string value),
 * code-fenced JSON, and malformed fragments (strip the object-key wrapper, leading
 * quote, and any stray trailing quote/brace).
 * @param {string} content - raw model output
 * @returns {string}
 */
export function extractSummaryText(content) {
  if (!content || typeof content !== 'string') return '';
  let str = content.trim();
  const codeBlock = str.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) str = codeBlock[1].trim();

  // 1. Iteratively unwrap JSON layers until stable. The model returns the
  //    paragraph in several shapes: a bare JSON string ("..."), an object
  //    ({summary|text|paragraph: "..."}), OR — the one that bit us — a JSON
  //    string whose content is itself a stringified object
  //    ("{\"paragraph\": \"...\"}"). A single parse of that last shape yields a
  //    STRING that still reads {"paragraph": "..."}, so one pass isn't enough.
  //    Loop (capped) so each layer peels off.
  for (let pass = 0; pass < 4; pass++) {
    let next = null;
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed === 'string') {
        next = parsed.trim();
      } else if (parsed && typeof parsed === 'object') {
        const val = parsed.summary ?? parsed.text ?? parsed.paragraph
          ?? Object.values(parsed).find((v) => typeof v === 'string');
        if (typeof val === 'string') next = val.trim();
      }
    } catch {
      // not strict JSON at this layer — stop unwrapping, fall to lenient cleanup
    }
    if (next === null || next === str) break;
    str = next;
  }

  // 2. Lenient cleanup for output that never parsed as strict JSON (or a residual
  //    stringified object). Independent of JSON validity, unwrap a leading object
  //    key of ANY style — {"paragraph": , {paragraph: , {'paragraph': — by
  //    dropping from the opening brace to the first colon (non-greedy, barred from
  //    crossing another brace/colon so it can't eat into the value). Then strip a
  //    leading quote and any trailing quote/brace clutter. The quote class covers
  //    ASCII (" ') and typographic quotes (“ ” ‘ ’), since models that emit smart
  //    apostrophes tend to wrap the whole paragraph in smart quotes too.
  const Q = '["\'“”‘’]';
  str = str.replace(/^\{\s*[^:{}]*?:\s*/, '');
  str = str.replace(new RegExp('^' + Q), '');
  str = str.replace(new RegExp('[\\s' + '"\'“”‘’' + ']*\\}?\\s*$'), '');
  return str.trim();
}

function parseJsonObject(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let str = raw.trim();
  const codeBlock = str.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) str = codeBlock[1].trim();
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function parseJsonArray(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let str = raw.trim();
  const codeBlock = str.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) str = codeBlock[1].trim();
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
