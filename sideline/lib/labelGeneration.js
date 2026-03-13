import {
  getSkillCategoryList,
  getPositionList,
  getFeedbackTypeList,
} from './volleyballVocabulary';
import { getVolleyballRulesContext } from './volleyballRules';

// grab the Groq API key — without this, label generation is basically dead on arrival
const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

if (!groqApiKey) {
  console.warn(
    'Missing Groq API key. Label generation will not work.\n' +
    'Please add EXPO_PUBLIC_GROQ_API_KEY to your .env file.'
  );
}

const SKILL_LIST = getSkillCategoryList().join(', ');
const POSITION_LIST = getPositionList().join(', ');
const FEEDBACK_LIST = getFeedbackTypeList().join(', ');

/** few-shot examples so the AI knows exactly what kind of labels we're looking for */
const VOLLEYBALL_LABEL_EXAMPLES = [
  'Sarah needs to improve blocking footwork',
  "Emma's serve receive positioning correction",
  "John's arm swing follow-through on spikes",
  'Setter tempo with middles - quick sets',
  'Libero digging angle and platform',
  'Rotation 5 serve receive adjustment',
  'Outside hitter approach timing',
  'Double block hand penetration',
];

function buildVolleyballSystemPrompt(isLongRecording, playerNames = [], customBuckets = {}) {
  const namesHint =
    playerNames.length > 0
      ? `\nKnown player names on this team (use EXACT spelling when mentioned): ${playerNames.join(', ')}.\n`
      : '';
  const lengthGuidance = isLongRecording
    ? 'For LONGER recordings with multiple topics, create a GENERAL summary of the main themes (e.g., "Halftime adjustments and team strategy", "Multiple player technique corrections", "Set review and tactical changes"). Maximum 8 words.'
    : 'For SHORT, focused recordings: ALWAYS include player names when mentioned. Be as specific as possible about the exact technique or feedback. Maximum 8 words. Prioritize: 1) Player name (if mentioned), 2) Volleyball skill/technique, 3) What needs improvement.';

  const rulesContext = getVolleyballRulesContext();

  const customSkill = (customBuckets.skill && customBuckets.skill.length) ? `, ${customBuckets.skill.join(', ')}` : '';
  const customPosition = (customBuckets.position && customBuckets.position.length) ? `, ${customBuckets.position.join(', ')}` : '';
  const customFeedback = (customBuckets.feedback && customBuckets.feedback.length) ? `, ${customBuckets.feedback.join(', ')}` : '';

  return `You are a volleyball coach assistant. You create labels and metadata for coaching recordings using VOLLEYBALL terminology only.
${namesHint}
Volleyball rules (use to interpret technique/rule discussion; flag possible violations or incorrect calls):
${rulesContext}

Volleyball skill categories (use exactly one, or null if unclear): ${SKILL_LIST}${customSkill}

Player positions (use exactly one if mentioned, else null): ${POSITION_LIST}${customPosition}

Feedback types (use exactly one, or null): ${FEEDBACK_LIST}${customFeedback}

Play patterns (use if mentioned, else null): "6-2", "5-1", "4-2", "rotation one" through "rotation six", "serve receive", "out of system", or null.

${lengthGuidance}

If the discussion clearly mentions a possible rule violation, incorrect technique call, or ref dispute, set ruleNote to a brief rule-based suggestion (one short sentence). Otherwise set ruleNote to null.

Respond with ONLY a valid JSON object, no other text:
{"label":"your 8-word max label here","skillCategory":"one of skill categories or null","position":"one of positions or null","playPattern":"formation/rotation or null","feedbackType":"one of feedback types or null","ruleNote":"brief rule suggestion or null"}

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
    if (!groqApiKey) {
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

    const playerNames = options.playerNames && Array.isArray(options.playerNames) ? options.playerNames : [];
    const customBuckets = options.customBuckets && typeof options.customBuckets === 'object' ? options.customBuckets : {};

    console.log('Generating label for transcription:', transcriptionText.substring(0, 100) + '...');

    const wordCount = transcriptionText.trim().split(/\s+/).length;
    const isLongRecording = wordCount > 50;

    const systemPrompt = buildVolleyballSystemPrompt(isLongRecording, playerNames, customBuckets);
    const userPrompt = isLongRecording
      ? `Create a general summary label and metadata for this longer coaching recording. Reply with JSON only:\n\n${transcriptionText}`
      : `Create a specific coaching label and metadata for this recording. Include any player names. Reply with JSON only:\n\n${transcriptionText}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 120,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return {
        label: null,
        error: new Error('Failed to generate label from Groq response'),
      };
    }

    const structured = parseStructuredResponse(content);
    if (structured) {
      console.log('✅ Label generated (volleyball):', structured.label, structured.skillCategory ?? '', structured.position ?? '');
      return {
        label: structured.label,
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
    console.log('✅ Label generated (plain fallback):', fallbackLabel);
    return {
      label: fallbackLabel,
      skillCategory: null,
      position: null,
      playPattern: null,
      feedbackType: null,
      ruleNote: null,
      error: null,
    };
  } catch (error) {
    console.error('Error generating label:', error);
    let errorMessage = 'Failed to generate label';
    if (error instanceof Error) {
      if (error.message.includes('API key')) errorMessage = 'Invalid Groq API key';
      else if (error.message.includes('quota')) errorMessage = 'Groq API quota exceeded';
      else if (error.message.includes('network')) errorMessage = 'Network error - please check your connection';
      else if (error.message.includes('model')) errorMessage = 'Model not available - check your Groq account';
      else errorMessage = error.message;
    }
    return {
      label: null,
      error: new Error(errorMessage),
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
