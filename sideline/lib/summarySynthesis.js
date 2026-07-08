/**
 * The post-game storyteller — takes a pile of raw recording labels and asks
 * Groq to distill them into "What You Noticed Most" themes and a smooth
 * "Match Flow" narrative. Basically turns coach brain-dump into readable prose.
 */

import { groqChat, getGroqApiKey } from './groqClient';

const NOTICED_MOST_SYSTEM = `You are a volleyball coaching assistant that produces specific, actionable practice priorities. Given in-game recording labels and transcriptions from a single match, produce 3–6 concrete coaching takeaways.

CRITICAL RULES:
- Each takeaway must reference a SPECIFIC skill, drill, or tactical adjustment the coach can act on at the next practice.
- Be specific: instead of "Improve Communication" say "Work on calling the ball louder during serve-receive". Instead of "Stay Aggressive" say "Push for faster tempo on outside sets".
- Ground every point in the labels/transcriptions provided. Do NOT invent feedback the coach never gave.
- Do NOT use vague motivational language like "trust instincts", "stay focused", "keep energy up", "build confidence".
- Include player first names when the labels mention them — e.g. "Ishan needs to hold setter position closer to net".
- Each takeaway should be 6–15 words, phrased as a specific observation or action item.
- Output a JSON array of strings only, no other text.`;

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
 * @param {{ displayLabel: string, transcription?: string }[]} items - labels + optional raw transcriptions from the game
 * @returns {Promise<{ themes: string[], error: Error|null }>}
 */
export async function synthesizeNoticedMost(items) {
  if (!getGroqApiKey()) {
    return { themes: [], error: new Error('Missing Groq API key') };
  }
  if (!items?.length) {
    return { themes: [], error: null };
  }

  const input = items
    .slice(0, 25)
    .map((i) => (i.transcription ? `Label: ${i.displayLabel}\nTranscription: ${i.transcription}` : i.displayLabel))
    .join('\n---\n');

  const userPrompt = `From these in-game notes, produce 3–6 specific, actionable coaching takeaways the coach can use at the next practice. Reference specific skills, players, and situations — no vague motivational phrases. Reply with ONLY a JSON array of strings.\n\n${input}`;

  try {
    const data = await groqChat({
      messages: [
        { role: 'system', content: NOTICED_MOST_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 480,
      temperature: 0.3,
    });

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { themes: [], error: new Error('Empty Groq response') };

    const parsed = parseJsonArray(content);
    const themes = Array.isArray(parsed)
      ? parsed.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim().slice(0, 150))
      : [];
    return { themes: themes.slice(0, 6), error: null };
  } catch (err) {
    console.error('synthesizeNoticedMost error:', err);
    return {
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

    let summary = '';
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === 'string') {
        summary = parsed.trim();
      }
    } catch {
      let str = content;
      const codeBlock = str.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlock) str = codeBlock[1].trim();
      str = str.replace(/^["']|["']$/g, '');
      summary = str.trim();
    }

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
