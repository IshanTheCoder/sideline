/**
 * User-defined buckets (categories) for recordings. Stored per-user and passed to
 * label generation so the AI can tag future recordings with these categories.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = '@sideline/custom_buckets';

function storageKey(userId) {
  return `${STORAGE_KEY_PREFIX}_${userId}`;
}

/**
 * @param {string} userId
 * @returns {Promise<{ name: string, type: 'skill'|'position'|'feedback', description?: string }[]>}
 */
export async function getCustomBuckets(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {string} userId
 * @param {string} name - Bucket name (e.g. "Injury management")
 * @param {'skill'|'position'|'feedback'} type
 * @param {string} [description] - Optional AI-generated description for future prompts
 */
export async function addCustomBucket(userId, name, type, description = '') {
  if (!userId || !name?.trim()) return;
  const buckets = await getCustomBuckets(userId);
  const trimmed = name.trim();
  if (buckets.some((b) => b.name.toLowerCase() === trimmed.toLowerCase() && b.type === type)) return;
  buckets.push({
    name: trimmed,
    type,
    description: description?.trim() || undefined,
  });
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(buckets));
}

/**
 * Get custom bucket names by type for use in label-generation prompt.
 * @param {string} userId
 * @returns {Promise<{ skill: string[], position: string[], feedback: string[] }>}
 */
export async function getCustomBucketsForPrompt(userId) {
  const buckets = await getCustomBuckets(userId);
  const skill = buckets.filter((b) => b.type === 'skill').map((b) => b.name);
  const position = buckets.filter((b) => b.type === 'position').map((b) => b.name);
  const feedback = buckets.filter((b) => b.type === 'feedback').map((b) => b.name);
  return { skill, position, feedback };
}

const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

/**
 * Use AI to describe how this bucket relates to the recording context (for storage and future use).
 * @param {string} bucketName
 * @param {string} [recordingContext] - e.g. label + snippet of transcription
 * @returns {Promise<string>} Short description or empty string
 */
export async function describeBucketWithAI(bucketName, recordingContext = '') {
  if (!groqApiKey || !bucketName?.trim()) return '';
  const prompt = recordingContext
    ? `You are a coaching assistant. The coach added a custom category "${bucketName}" in the context of this recording note: "${recordingContext.slice(0, 300)}". In one short sentence (under 15 words), describe what this category means or when to use it for tagging future recordings. No quotes or preamble.`
    : `You are a coaching assistant. The coach added a custom category "${bucketName}". In one short sentence (under 15 words), describe what this category means for volleyball coaching. No quotes or preamble.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 60,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    return text.slice(0, 120);
  } catch {
    return '';
  }
}
