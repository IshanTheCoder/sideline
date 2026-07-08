import { supabase } from './supabase';

const isMissingColumnError = (error, column) => {
  if (!error || typeof error !== 'object') return false;
  const message = String(error.message ?? '').toLowerCase();
  const detail = String(error.details ?? '').toLowerCase();
  const hint = String(error.hint ?? '').toLowerCase();
  const haystack = `${message} ${detail} ${hint}`;
  const normalizedColumn = String(column).toLowerCase();

  return (
    haystack.includes(`'${normalizedColumn}'`) ||
    haystack.includes(`"${normalizedColumn}"`) ||
    haystack.includes(` ${normalizedColumn} `) ||
    haystack.includes(`.${normalizedColumn}`) ||
    haystack.includes(`${normalizedColumn} column`) ||
    haystack.includes(`column ${normalizedColumn}`)
  );
};

// grab the user's team, or spawn a new one if they're fresh — the roster screen needs this
export const getOrCreateDefaultTeam = async (userId) => {
  try {
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('coach_id', userId)
      .limit(1)
      .single();

    if (existingTeam) {
      return { id: existingTeam.id, error: null };
    }

    const { data: newTeam, error: teamError } = await supabase
      .from('teams')
      .insert({
        coach_id: userId,
        name: 'My Team',
        sport: 'volleyball',
      })
      .select()
      .single();

    if (teamError || !newTeam) {
      return {
        id: '',
        error: new Error('Failed to create team. Please try again.'),
      };
    }

    return { id: newTeam.id, error: null };
  } catch (error) {
    return {
      id: '',
      error: error,
    };
  }
};

// look up just the opponent's name for a game session — used to give the AI
// context so it can tell "our team" notes apart from "scout the other team" notes.
// Best-effort: returns '' on any error so callers can degrade gracefully.
export const getOpponentNameForGameSession = async (gameSessionId) => {
  if (!gameSessionId) return { opponentName: '', error: null };
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('opponent_name')
      .eq('id', gameSessionId)
      .single();
    if (error) return { opponentName: '', error };
    return { opponentName: data?.opponent_name ?? '', error: null };
  } catch (error) {
    return { opponentName: '', error };
  }
};

// set up a fresh game session — time to ball out, it's game day
export const createGameSession = async ({ userId, opponentName, date, location, matchType }) => {
  try {
    const { id: teamId, error: teamError } = await getOrCreateDefaultTeam(userId);
    if (teamError || !teamId) {
      return {
        id: '',
        error: teamError || new Error('Failed to get team'),
      };
    }

    let { data, error } = await supabase
      .from('game_sessions')
      .insert({
        team_id: teamId,
        opponent_name: opponentName,
        date: date.toISOString().split('T')[0],
        location: location ?? null,
        match_type: matchType ?? null,
      })
      .select('id')
      .single();

    // backward compat: if DB hasn't added match_type yet, retry without it
    if (error && isMissingColumnError(error, 'match_type')) {
      const retry = await supabase
        .from('game_sessions')
        .insert({
          team_id: teamId,
          opponent_name: opponentName,
          date: date.toISOString().split('T')[0],
          location: location ?? null,
        })
        .select('id')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      return {
        id: '',
        error: error || new Error('Failed to create game session'),
      };
    }

    return { id: data.id, error: null };
  } catch (error) {
    return {
      id: '',
      error: error,
    };
  }
};
