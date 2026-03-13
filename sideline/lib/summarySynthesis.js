/**
 * The post-game storyteller — takes a pile of raw recording labels and asks
 * Groq to distill them into "What You Noticed Most" themes and a smooth
 * "Match Flow" narrative. Basically turns coach brain-dump into readable prose.
 */

const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

const NOTICED_MOST_SYSTEM = `You are a volleyball coach assistant. Given a list of in-game feedback labels and optional transcriptions from a single match, synthesize 3–6 OVERARCHING themes or problems the coach noticed—not the raw labels.

CRITICAL: Include ONLY what is implied or stated in the coach's recordings. Do NOT add any observation, theme, or problem that was not said or clearly implied by the coach. Every theme must be directly supported by at least one label or transcription.

Rules:
- Write as high-level observations (e.g. "Liberos struggle to move to the ball quickly", "Outside hitters need cleaner approach timing") but only if the recordings support that theme.
- Do NOT repeat specific player names or copy the exact wording of the labels.
- Do NOT list each recording; group similar feedback into broader themes.
- Do NOT invent or extrapolate beyond what the coach said or implied.
- Use clear, concise phrasing. Each item should be a short phrase or sentence (under 12 words).
- Output a JSON array of strings only, no other text. Example: ["Theme one", "Theme two", "Theme three"]`;

const MATCH_FLOW_SYSTEM = `You are a volleyball coach assistant. Given a chronological list of in-game feedback labels from one match, write 5–10 bullet points that read as a smooth MATCH FLOW—a progression of what the coach noticed over the course of the game.

CRITICAL: Include ONLY what is implied or stated in the coach's recordings. Each bullet must reflect one or more of the provided labels. Do NOT add observations, outcomes, or narrative (e.g. "teamwork strengthened", "skills lifted the team") that the coach did not say or imply. Stick strictly to the sequence and content of the labels.

Rules:
- Write each bullet as a full sentence in your own words. Do NOT copy the raw labels verbatim.
- The bullets should feel like a narrative progression but must be grounded only in the given labels (e.g. "Early in the match, receive technique was a focus" "As the set developed, blocking footwork came up").
- Do NOT end any bullet with a period. No periods at the end of strings.
- Vary sentence structure. Use transitions where natural (e.g. "Later, ...", "Throughout, ...").
- Keep each sentence under 20 words. No numbering or bullets in the text.
- Output a JSON array of strings only, one string per bullet. No other text.`;

/**
 * @param {{ displayLabel: string, transcription?: string }[]} items - labels + optional raw transcriptions from the game
 * @returns {Promise<{ themes: string[], error: Error|null }>}
 */
export async function synthesizeNoticedMost(items) {
  if (!groqApiKey) {
    return { themes: [], error: new Error('Missing Groq API key') };
  }
  if (!items?.length) {
    return { themes: [], error: null };
  }

  const input = items
    .slice(0, 25)
    .map((i) => (i.transcription ? `Label: ${i.displayLabel}\nTranscription: ${i.transcription}` : i.displayLabel))
    .join('\n---\n');

  const userPrompt = `Synthesize overarching coaching themes from these in-game notes. Include ONLY themes directly supported by what the coach said or implied. Reply with ONLY a JSON array of 3–6 theme strings.\n\n${input}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: NOTICED_MOST_SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 320,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { themes: [], error: new Error('Empty Groq response') };

    const parsed = parseJsonArray(content);
    const themes = Array.isArray(parsed)
      ? parsed.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim().slice(0, 120))
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
 * @param {string[]} labels - recording labels in chronological order, like a git log for the game
 * @returns {Promise<{ bullets: string[], error: Error|null }>}
 */
export async function synthesizeMatchFlow(labels) {
  if (!groqApiKey) {
    return { bullets: [], error: new Error('Missing Groq API key') };
  }
  if (!labels?.length) {
    return { bullets: [], error: null };
  }

  const input = labels.slice(0, 20).join('\n');

  const userPrompt = `Turn this chronological list of in-game feedback labels into a smooth match flow. Use ONLY the content in these labels; do not add anything the coach did not say or imply. Do not end any bullet with a period. Reply with ONLY a JSON array of 5–10 full-sentence bullets in your own words.\n\n${input}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: MATCH_FLOW_SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 480,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { bullets: [], error: new Error('Empty Groq response') };

    const parsed = parseJsonArray(content);
    const bullets = Array.isArray(parsed)
      ? parsed
          .filter((b) => typeof b === 'string' && b.trim())
          .map((b) => b.trim().replace(/\.+$/, '').slice(0, 150))
      : [];
    return { bullets: bullets.slice(0, 10), error: null };
  } catch (err) {
    console.error('synthesizeMatchFlow error:', err);
    return {
      bullets: [],
      error: err instanceof Error ? err : new Error(String(err)),
    };
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
