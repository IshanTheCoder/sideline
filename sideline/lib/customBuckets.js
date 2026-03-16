/**
 * Custom categories coaches create for sorting their recordings — like making
 * your own playlists but for coaching notes. Saved per-user and fed to the AI
 * so it starts tagging new recordings with them automatically.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = '@sideline/custom_buckets';

function storageKey(userId) {
  return `${STORAGE_KEY_PREFIX}_${userId}`;
}

/**
 * @param {string} userId - whose custom buckets we're loading
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
 * @param {string} userId - the coach's user ID
 * @param {string} name - what to call this bucket (e.g. "Serve pressure")
 * @param {'skill'|'position'|'feedback'} type - which category lane it belongs to
 * @param {string} [description] - optional AI-generated blurb so future prompts know what it means
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
 * Groups bucket names by type so we can inject them straight into the label-generation prompt.
 * @param {string} userId - whose buckets we're grabbing
 * @returns {Promise<{ skill: string[], position: string[], feedback: string[] }>}
 */
export async function getCustomBucketsForPrompt(userId) {
  const buckets = await getCustomBuckets(userId);
  const skill = buckets.filter((b) => b.type === 'skill').map((b) => b.name);
  const position = buckets.filter((b) => b.type === 'position').map((b) => b.name);
  const feedback = buckets.filter((b) => b.type === 'feedback').map((b) => b.name);
  return { skill, position, feedback };
}

import { groqChat, getGroqApiKey } from './groqClient';

/**
 * Gets the AI to write a one-liner explaining what this bucket is about — like a tooltip for future you.
 * @param {string} bucketName - whatever the coach named it
 * @param {string} [recordingContext] - optional context (label + transcription snippet) so the AI has a clue
 * @returns {Promise<string>} a short description, or empty string if the AI has nothing to say
 */
export async function describeBucketWithAI(bucketName, recordingContext = '') {
  if (!getGroqApiKey() || !bucketName?.trim()) return '';
  const prompt = recordingContext
    ? `You are a coaching assistant. The coach added a custom category "${bucketName}" in the context of this recording note: "${recordingContext.slice(0, 300)}". In one short sentence (under 15 words), describe what this category means or when to use it for tagging future recordings. No quotes or preamble.`
    : `You are a coaching assistant. The coach added a custom category "${bucketName}". In one short sentence (under 15 words), describe what this category means for volleyball coaching. No quotes or preamble.`;

  try {
    const data = await groqChat({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 60,
      temperature: 0.3,
    });
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    return text.slice(0, 120);
  } catch {
    return '';
  }
}
