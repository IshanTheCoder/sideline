/**
 * Teams — multi-team support for coaches (new-season teams, club teams, …).
 * The `teams` table always allowed several teams per coach; this module adds
 * the app-level notion of an *active* team (persisted per-user in
 * AsyncStorage) that roster, schedule, and games are scoped to.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const activeTeamKey = (userId) => `@sideline/active_team_${userId}`;

// every team this coach owns, oldest first (so index 0 is the original team)
export const fetchTeamsForUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, sport, created_at')
      .eq('coach_id', userId)
      .order('created_at', { ascending: true });
    if (error) return { teams: [], error };
    return { teams: data ?? [], error: null };
  } catch (error) {
    return { teams: [], error };
  }
};

export const createTeam = async (userId, { name, sport = 'volleyball' }) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .insert({ coach_id: userId, name, sport })
      .select('id, name, sport, created_at')
      .single();
    if (error || !data) {
      return { team: null, error: error || new Error('Failed to create team') };
    }
    return { team: data, error: null };
  } catch (error) {
    return { team: null, error };
  }
};

/**
 * Update a team's editable details (name, sport). Scoped to the coach so a
 * user can only edit their own teams.
 * @returns {Promise<{ team: object|null, error: Error|null }>}
 */
export const updateTeam = async (userId, teamId, { name, sport }) => {
  try {
    const patch = {};
    if (typeof name === 'string' && name.trim()) patch.name = name.trim();
    if (typeof sport === 'string' && sport.trim()) patch.sport = sport.trim().toLowerCase();
    if (Object.keys(patch).length === 0) {
      return { team: null, error: new Error('Nothing to update') };
    }
    const { data, error } = await supabase
      .from('teams')
      .update(patch)
      .eq('id', teamId)
      .eq('coach_id', userId)
      .select('id, name, sport, created_at')
      .single();
    if (error || !data) {
      return { team: null, error: error || new Error('Failed to update team') };
    }
    return { team: data, error: null };
  } catch (error) {
    return { team: null, error };
  }
};

export const setActiveTeamId = async (userId, teamId) => {
  try {
    await AsyncStorage.setItem(activeTeamKey(userId), teamId);
  } catch {
    // non-fatal — worst case the app falls back to the first team
  }
};

/**
 * The team the app should scope everything to. Validates the stored choice
 * against the coach's real teams; falls back to the first team, creating a
 * default one for brand-new coaches.
 * @returns {Promise<{ team: {id,name,sport}|null, teams: Array, error: Error|null }>}
 */
export const getActiveTeam = async (userId) => {
  try {
    let { teams, error } = await fetchTeamsForUser(userId);
    if (error) return { team: null, teams: [], error };

    if (teams.length === 0) {
      const { team: created, error: createError } = await createTeam(userId, { name: 'My Team' });
      if (createError || !created) {
        return { team: null, teams: [], error: createError || new Error('Failed to create team') };
      }
      teams = [created];
    }

    let storedId = null;
    try {
      storedId = await AsyncStorage.getItem(activeTeamKey(userId));
    } catch {
      storedId = null;
    }

    const team = teams.find((t) => t.id === storedId) ?? teams[0];
    return { team, teams, error: null };
  } catch (error) {
    return { team: null, teams: [], error };
  }
};

// convenience: just the active team's id (mirrors the old getTeamIdForUser shape)
export const getActiveTeamId = async (userId) => {
  const { team, error } = await getActiveTeam(userId);
  return { teamId: team?.id ?? null, error };
};
