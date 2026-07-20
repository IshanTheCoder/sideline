import { supabase } from './supabase';
import { getActiveTeamId } from './teams';

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

// grab the user's active team, or spawn a default one if they're fresh.
// Multi-team aware: honors the coach's active-team choice from lib/teams.js.
export const getOrCreateDefaultTeam = async (userId) => {
  const { teamId, error } = await getActiveTeamId(userId);
  if (error || !teamId) {
    return { id: '', error: error || new Error('Failed to get team. Please try again.') };
  }
  return { id: teamId, error: null };
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

/**
 * Schedule support (redesign): upcoming games live in game_sessions with
 * status='scheduled' and flip to 'played' when capture starts. All reads
 * select('*') and filter client-side so pre-migration databases (missing the
 * time/venue/status columns) degrade to an empty schedule instead of erroring.
 */

// Local calendar day, not UTC — lib/scheduleFormat.js parses 'YYYY-MM-DD' as
// local too, so toISOString() here would silently shift the date by a day
// for any coach east of UTC (evening) or west of UTC (early morning).
const toDateString = (d) => {
  if (!d) return null;
  if (typeof d === 'string') return d;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// upcoming (scheduled, not yet captured) games for a team, soonest first
export const fetchScheduledGames = async (teamId) => {
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('team_id', teamId)
      .order('date', { ascending: true });
    if (error) return { games: [], error };
    const games = (data ?? []).filter((g) => g.status === 'scheduled');
    return { games, error: null };
  } catch (error) {
    return { games: [], error };
  }
};

// add a future game to the schedule
export const createScheduledGame = async ({ teamId, opponentName, date, time, venue }) => {
  try {
    let { data, error } = await supabase
      .from('game_sessions')
      .insert({
        team_id: teamId,
        opponent_name: opponentName,
        date: toDateString(date) ?? toDateString(new Date()),
        time: time ?? null,
        venue: venue ?? null,
        status: 'scheduled',
      })
      .select('*')
      .single();

    if (error && (isMissingColumnError(error, 'status') || isMissingColumnError(error, 'venue') || isMissingColumnError(error, 'time'))) {
      return {
        game: null,
        error: new Error('Schedule needs a database update — run supabase-migrations/007_schedule_columns.sql in Supabase.'),
      };
    }
    if (error || !data) {
      return { game: null, error: error || new Error('Failed to add game') };
    }
    return { game: data, error: null };
  } catch (error) {
    return { game: null, error };
  }
};

// capture is starting for a scheduled game — it's now a real (played) game
export const startScheduledGame = async (gameId) => {
  try {
    const { error } = await supabase
      .from('game_sessions')
      .update({ status: 'played' })
      .eq('id', gameId);
    return { error };
  } catch (error) {
    return { error };
  }
};

// remove a scheduled game that never happened
export const deleteScheduledGame = async (gameId) => {
  try {
    const { error } = await supabase.from('game_sessions').delete().eq('id', gameId);
    return { error };
  } catch (error) {
    return { error };
  }
};

// set up a fresh game session — time to ball out, it's game day
export const createGameSession = async ({ userId, opponentName, date, location, matchType, time, venue }) => {
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
        date: toDateString(date),
        location: location ?? null,
        match_type: matchType ?? null,
        time: time ?? null,
        venue: venue ?? null,
        status: 'played',
      })
      .select('id')
      .single();

    // backward compat: pre-migration DBs may be missing newer columns — retry lean
    if (
      error &&
      (isMissingColumnError(error, 'match_type') ||
        isMissingColumnError(error, 'time') ||
        isMissingColumnError(error, 'venue') ||
        isMissingColumnError(error, 'status'))
    ) {
      const retry = await supabase
        .from('game_sessions')
        .insert({
          team_id: teamId,
          opponent_name: opponentName,
          date: toDateString(date),
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
