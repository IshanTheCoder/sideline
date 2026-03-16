import {
  getSkillCategoryList,
  getPositionList,
  getFeedbackTypeList,
} from './volleyballVocabulary';
import { getVolleyballRulesContext } from './volleyballRules';
import { groqChat, getGroqApiKey } from './groqClient';

const SKILL_LIST = getSkillCategoryList().join(', ');
const POSITION_LIST = getPositionList().join(', ');
const FEEDBACK_LIST = getFeedbackTypeList().join(', ');

/** few-shot examples so the AI knows exactly what kind of labels we're looking for */
const VOLLEYBALL_LABEL_EXAMPLES = [
  'Sarah N. improve blocking footwork',
  "Emma K. serve receive positioning correction",
  "John R. arm swing follow-through on spikes",
  'Setter tempo with middles - quick sets',
  'Libero digging angle and platform',
  'Rotation 5 serve receive adjustment',
  'Outside hitter approach timing',
  'Double block hand penetration',
];

function levenshtein(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toTitleCase(str) {
  if (!str) return str;
  return str.replace(/\b[a-zA-Z][a-zA-Z'-]*\b/g, (word) => {
    if (/^[A-Z]\.?$/.test(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
}

const LABEL_COMMON_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
  'was', 'one', 'our', 'out', 'has', 'his', 'how', 'its', 'let', 'may',
  'new', 'now', 'old', 'see', 'way', 'who', 'did', 'get', 'got', 'him',
  'had', 'she', 'set', 'hit', 'run', 'use', 'say', 'put', 'try', 'ask',
  'keep', 'left', 'right', 'side', 'back', 'good', 'great', 'need',
  'make', 'like', 'just', 'over', 'such', 'take', 'come', 'than',
  'them', 'been', 'have', 'from', 'they', 'with', 'this', 'that',
  'what', 'when', 'your', 'will', 'each', 'more', 'some', 'work',
  'kill', 'ball', 'pass', 'block', 'serve', 'swing', 'angle', 'trust',
  'lock', 'line', 'combo', 'energy', 'patience', 'improve', 'approach',
  'aggressive', 'explosive', 'perfect', 'communicate', 'composed',
  'attack', 'defense', 'setter', 'libero', 'hitter', 'blocker',
  'receive', 'position', 'rotation', 'technique', 'coverage', 'dig',
  'spike', 'float', 'pipe', 'tighten', 'overlap', 'Noah',
]);

function correctLabelSpelling(label, players = []) {
  if (!label || !Array.isArray(players) || players.length === 0) return label;

  const rosterTokens = [];
  players.forEach((p) => {
    const name = typeof p?.name === 'string' ? p.name.trim() : '';
    if (!name) return;
    name
      .split(/\s+/)
      .map((token) => token.replace(/[^a-zA-Z'-]/g, '').trim())
      .filter((token) => token.length >= 3)
      .forEach((token) => rosterTokens.push(token));
  });

  if (!rosterTokens.length) return label;

  let corrected = label;
  const words = corrected.match(/\b[A-Z][a-zA-Z'-]+\b/g) ?? [];
  const seen = new Set();

  words.forEach((word) => {
    const cleanWord = word.replace(/[^a-zA-Z'-]/g, '').trim();
    const lowerWord = cleanWord.toLowerCase();
    if (!cleanWord || cleanWord.length < 3 || seen.has(lowerWord)) return;
    if (LABEL_COMMON_WORDS.has(lowerWord)) return;
    seen.add(lowerWord);

    let bestMatch = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    rosterTokens.forEach((token) => {
      const lowerToken = token.toLowerCase();
      if (lowerToken === lowerWord) return;
      if (lowerWord[0] !== lowerToken[0]) return;
      const lenDiff = Math.abs(lowerToken.length - lowerWord.length);
      if (lenDiff > 1) return;
      const maxDist = lowerWord.length <= 4 ? 1 : 2;
      const distance = levenshtein(lowerWord, lowerToken);
      if (distance >= 1 && distance <= maxDist && distance < bestDistance) {
        bestDistance = distance;
        bestMatch = token;
      }
    });

    if (bestMatch) {
      const re = new RegExp(`\\b${escapeRegex(cleanWord)}\\b`, 'g');
      corrected = corrected.replace(re, bestMatch);
    }
  });

  return corrected;
}

function abbreviatePlayerNames(label, players = []) {
  if (!label || !Array.isArray(players) || players.length === 0) return label;

  let result = label;
  const sorted = [...players]
    .map((p) => (typeof p?.name === 'string' ? p.name.trim() : ''))
    .filter((n) => n.includes(' '))
    .sort((a, b) => b.length - a.length);

  for (const fullName of sorted) {
    const parts = fullName.split(/\s+/);
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1][0].toUpperCase() + '.';
    const abbreviated = `${firstName} ${lastInitial}`;
    const re = new RegExp(`\\b${escapeRegex(fullName)}\\b`, 'gi');
    result = result.replace(re, abbreviated);
  }

  return result;
}

function buildVolleyballSystemPrompt(isLongRecording, players = [], customBuckets = {}) {
  let namesHint = '';
  if (players.length > 0) {
    const withNumbers = players.filter((p) => p.number);
    const withoutNumbers = players.filter((p) => !p.number);
    if (withNumbers.length > 0) {
      const rows = withNumbers.map((p) => `#${p.number} = ${p.name}`).join(', ');
      const extras = withoutNumbers.length > 0 ? ` Also: ${withoutNumbers.map((p) => p.name).join(', ')}.` : '';
      namesHint = `\nRoster for spelling reference: ${rows}.${extras}\n`;
    } else {
      const names = players.map((p) => p.name).join(', ');
      namesHint = `\nRoster for spelling reference: ${names}.\n`;
    }
  }

  const lengthGuidance = isLongRecording
    ? 'For LONGER recordings: summarize the main themes. Maximum 10 words.'
    : 'For SHORT recordings: summarize what the coach said. Include names if spoken. Maximum 10 words.';

  const rulesContext = getVolleyballRulesContext();

  const customSkill = (customBuckets.skill && customBuckets.skill.length) ? `, ${customBuckets.skill.join(', ')}` : '';
  const customPosition = (customBuckets.position && customBuckets.position.length) ? `, ${customBuckets.position.join(', ')}` : '';
  const customFeedback = (customBuckets.feedback && customBuckets.feedback.length) ? `, ${customBuckets.feedback.join(', ')}` : '';

  return `You are a volleyball coach assistant. You create labels and metadata for coaching recordings.
${namesHint}
NAME RULES (VERY IMPORTANT — follow strictly):
- ALWAYS start the label with every player name that appears in the transcription. This is the #1 priority.
- Example: transcription "Midyan, Ishan, talk to each other on the overlap" → label MUST start with "Midyan Ishan" then the topic.
- Example: transcription "Eshwar, that was a perfect swing" → label MUST start with "Eshwar" then the topic.
- Use ONLY first names. Do NOT add last names unless the transcription contains them.
- If NO name appears in the transcription, do NOT add one.
- Capitalize the first letter of every word (Title Case).

Volleyball rules context:
${rulesContext}

Volleyball skill categories (pick one, or null): ${SKILL_LIST}${customSkill}
Player positions (pick one if mentioned, else null): ${POSITION_LIST}${customPosition}
Feedback types (pick one, or null): ${FEEDBACK_LIST}${customFeedback}
Play patterns (if mentioned, else null): "6-2", "5-1", "4-2", "rotation one" through "rotation six", "serve receive", "out of system", or null.

${lengthGuidance}

If the transcription mentions a rule violation or ref dispute, set ruleNote to a brief suggestion. Otherwise null.

Respond with ONLY a valid JSON object:
{"label":"concise label from transcription words only","skillCategory":"or null","position":"or null","playPattern":"or null","feedbackType":"or null","ruleNote":"or null"}

Examples of good labels: ${VOLLEYBALL_LABEL_EXAMPLES.join('; ')}`;
}

/**
 * extracts structured data from the AI's reply — deals with both raw JSON and markdown-wrapped JSON
 * @param {string} content - the text the AI spit back at us
 * @returns {{ label: string, skillCategory?: string|null, position?: string|null, playPattern?: string|null, feedbackType?: string|null, ruleNote?: string|null }|null}
 */
function parseStructuredResponse(content) {
  if (!content || typeof content !== 'string') return null;
  let raw = content.trim();
  const markdownMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (markdownMatch) raw = markdownMatch[1].trim();
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.label !== 'string') return null;
    return {
      label: parsed.label.trim(),
      skillCategory: parsed.skillCategory ?? null,
      position: parsed.position ?? null,
      playPattern: parsed.playPattern ?? null,
      feedbackType: parsed.feedbackType ?? null,
      ruleNote: typeof parsed.ruleNote === 'string' && parsed.ruleNote.trim() ? parsed.ruleNote.trim() : null,
    };
  } catch {
    return null;
  }
}

/**
 * feeds a transcription to the AI and gets back a label + volleyball metadata — auto-summarizer vibes
 * @param {string} transcriptionText - the full transcription to distill into a label
 * @param {{ playerNames?: string[] }} [options] - roster names for spelling accuracy
 * @returns {Promise<{label: string|null, skillCategory?: string|null, position?: string|null, playPattern?: string|null, feedbackType?: string|null, error: Error|null}>}
 */
export async function generateLabel(transcriptionText, options = {}) {
  try {
    if (!getGroqApiKey()) {
      return {
        label: null,
        error: new Error('Groq API key not configured'),
      };
    }

    if (!transcriptionText || transcriptionText.trim().length === 0) {
      return {
        label: null,
        error: new Error('Transcription text is required'),
      };
    }

    const players = options.players && Array.isArray(options.players)
      ? options.players
      : (options.playerNames && Array.isArray(options.playerNames)
          ? options.playerNames.map((name) => ({ name, number: null }))
          : []);
    const customBuckets = options.customBuckets && typeof options.customBuckets === 'object' ? options.customBuckets : {};

    console.log('Generating label for transcription:', transcriptionText.substring(0, 100) + '...');

    const wordCount = transcriptionText.trim().split(/\s+/).length;
    const isLongRecording = wordCount > 50;

    const systemPrompt = buildVolleyballSystemPrompt(isLongRecording, players, customBuckets);
    const userPrompt = isLongRecording
      ? `Create a label and metadata for this coaching recording. Start the label with any player names mentioned. Reply with JSON only:\n\n${transcriptionText}`
      : `Create a label and metadata for this recording. IMPORTANT: If any player names appear in the transcription, the label MUST start with those names. Reply with JSON only:\n\n${transcriptionText}`;

    const result = await groqChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const content = result.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return {
        label: null,
        error: new Error('Failed to generate label from Groq response'),
      };
    }

    const structured = parseStructuredResponse(content);
    if (structured) {
      const finalLabel = toTitleCase(
        abbreviatePlayerNames(
          correctLabelSpelling(structured.label, players),
          players
        )
      );
      console.log('✅ Label generated (volleyball):', finalLabel, structured.skillCategory ?? '', structured.position ?? '');
      return {
        label: finalLabel,
        skillCategory: structured.skillCategory ?? null,
        position: structured.position ?? null,
        playPattern: structured.playPattern ?? null,
        feedbackType: structured.feedbackType ?? null,
        ruleNote: structured.ruleNote ?? null,
        error: null,
      };
    }

    // plan B: AI didn't return proper JSON — use the raw text as a label, it's better than nothing
    const fallbackLabel = content.replace(/^["']|["']$/g, '').trim().slice(0, 80);
    const finalFallbackLabel = toTitleCase(
      abbreviatePlayerNames(
        correctLabelSpelling(fallbackLabel, players),
        players
      )
    );
    console.log('✅ Label generated (plain fallback):', finalFallbackLabel);
    return {
      label: finalFallbackLabel,
      skillCategory: null,
      position: null,
      playPattern: null,
      feedbackType: null,
      ruleNote: null,
      error: null,
    };
  } catch (error) {
    console.error('Error generating label:', error);
    return {
      label: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * smoke test: toss a sample transcription at the label generator and see if it survives
 * @param {string} sampleTranscription - test text to run through the pipeline
 * @returns {Promise<boolean>} true if we got a good label back, false if it blew up
 */
export async function testLabelGeneration(sampleTranscription = 'Great spike by player number 7, the ball went straight down for a kill.') {
  console.log('🧪 Testing label generation service...');
  const result = await generateLabel(sampleTranscription);

  if (result.error) {
    console.error('❌ Label generation test failed:', result.error.message);
    return false;
  }

  console.log('✅ Label generation test passed!');
  console.log('Generated label:', result.label);
  if (result.skillCategory) console.log('Skill category:', result.skillCategory);
  if (result.position) console.log('Position:', result.position);
  return true;
}
