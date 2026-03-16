/**
 * The post-game storyteller — takes a pile of raw recording labels and asks
 * Groq to distill them into "What You Noticed Most" themes and a smooth
 * "Match Flow" narrative. Basically turns coach brain-dump into readable prose.
 */

const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

const NOTICED_MOST_SYSTEM = `You are a volleyball coach assistant. Given a list of in-game feedback labels and optional transcriptions from a single match, synthesize 3–6 OVERARCHING themes the coach explicitly talked about.

CRITICAL RULES — READ CAREFULLY:
- ONLY include themes the coach EXPLICITLY SAID. If the coach did not say it, do NOT include it.
- Do NOT infer, imply, guess, or extrapolate anything beyond the exact words in the labels and transcriptions.
- Do NOT add conclusions like "team improved", "skills developing", "confidence grew" unless the coach literally said those words.
- Do NOT repeat specific player names or copy the exact wording of the labels.
- Do NOT list each recording; group similar feedback into broader themes.
- Use clear, concise phrasing. Each item should be a short phrase or sentence (under 12 words).
- When in doubt, LEAVE IT OUT.
- Output a JSON array of strings only, no other text. Example: ["Theme one", "Theme two", "Theme three"]`;

const MATCH_FLOW_SYSTEM = `You are a volleyball coach assistant. Given a chronological list of in-game feedback labels from one match, write bullet points that summarize what the coach said, in order.

CRITICAL RULES — READ CAREFULLY:
- Each bullet must come DIRECTLY from the provided labels. Do NOT add anything the coach did not say.
- Do NOT infer outcomes, emotions, improvements, or narrative (e.g. "teamwork strengthened", "skills lifted the team", "confidence grew"). If the coach didn't say it, don't write it.
- Do NOT fabricate player names. Only mention a player if their name appears in the labels.
- Use "First L." format for player names (e.g. "Arha J." not "Arha Jadhav").
- Write each bullet as a simple sentence restating what the coach said. Keep it factual and grounded.
- Do NOT end any bullet with a period.
- Keep each sentence under 20 words.
- When in doubt, LEAVE IT OUT.
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

  const userPrompt = `Synthesize overarching coaching themes from these in-game notes. Include ONLY themes the coach EXPLICITLY SAID — nothing inferred or implied. Reply with ONLY a JSON array of 3–6 theme strings.\n\n${input}`;

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
        temperature: 0.2,
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

  const userPrompt = `Summarize what the coach said based on these labels, in chronological order. Use ONLY the content in these labels — do NOT add, infer, or imply anything the coach did not explicitly say. Do not end any bullet with a period. Reply with ONLY a JSON array of bullet strings.\n\n${input}`;

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
        temperature: 0.2,
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
