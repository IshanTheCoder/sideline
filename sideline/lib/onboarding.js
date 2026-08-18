/**
 * First-run onboarding state — whether this coach has already seen the
 * home-screen tutorial.
 *
 * Source of truth is `profiles.tutorial_seen_at` (migration 008), so signing in
 * on a second device doesn't replay the tour. A per-user AsyncStorage flag
 * mirrors it as a local cache for the cases the database can't cover: the write
 * is still in flight, the coach is offline, or the migration hasn't been run
 * yet. Either flag being set means "seen" — the tutorial must never nag.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const seenKey = (userId) => `@sideline/tutorial_seen_${userId}`;

/**
 * Should the first-run tutorial show for this coach?
 *
 * Reads the flag itself rather than taking AuthContext's `profile` object: right
 * after signup the profile row is still being created (and can briefly fail to
 * load), and a coach whose very first session has no profile yet is exactly the
 * coach the tour is for.
 *
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export const shouldShowTutorial = async (userId) => {
  if (!userId) return false;

  // The local flag is authoritative for "already seen" — it's set the moment the
  // tour ends, even if the database write can't land.
  try {
    const seen = await AsyncStorage.getItem(seenKey(userId));
    if (seen) return false;
  } catch (error) {
    console.log('⚠️ Could not read local tutorial flag:', error?.message);
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('tutorial_seen_at')
      .eq('id', userId)
      .maybeSingle();

    // No row yet (brand-new account mid-signup) or the 008 column doesn't exist
    // yet — either way the local flag above is the only signal, and it says the
    // coach hasn't seen the tour.
    if (error || !data) return true;
    return !data.tutorial_seen_at;
  } catch {
    return true;
  }
};

/**
 * Record that the coach finished (or skipped) the tutorial. Writes the local
 * flag first so the overlay can't come back even if the network call fails.
 * @param {string} userId
 */
export const markTutorialSeen = async (userId) => {
  if (!userId) return;
  const now = new Date().toISOString();

  try {
    await AsyncStorage.setItem(seenKey(userId), now);
  } catch (error) {
    console.log('⚠️ Could not cache tutorial flag locally:', error?.message);
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ tutorial_seen_at: now })
      .eq('id', userId);
    if (error) {
      // Most likely the 008 migration hasn't been run — the local flag still
      // keeps the tutorial from reappearing on this device.
      console.log('⚠️ Could not persist tutorial_seen_at:', error.message);
    }
  } catch (error) {
    console.log('⚠️ Unexpected error persisting tutorial_seen_at:', error?.message);
  }
};

/**
 * Clear both flags so the tutorial plays again — for manual QA of the first-run
 * experience without creating a throwaway account.
 * @param {string} userId
 */
export const resetTutorial = async (userId) => {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(seenKey(userId));
  } catch {
    // ignore — the database flag below is what matters across devices
  }
  try {
    await supabase.from('profiles').update({ tutorial_seen_at: null }).eq('id', userId);
  } catch (error) {
    console.log('⚠️ Could not reset tutorial_seen_at:', error?.message);
  }
};
