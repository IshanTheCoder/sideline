/**
 * Roster (players) per team: CRUD, CSV import, and helpers for transcription/labels.
 * Players have: name, number, position, grade.
 */

import { supabase } from './supabase';
import { getOrCreateDefaultTeam } from './gameSessions';

/**
 * Get team ID for the current user (create default team if needed).
 * @param {string} userId
 * @returns {Promise<{ teamId: string|null, error: Error|null }>}
 */
export async function getTeamIdForUser(userId) {
  const { id, error } = await getOrCreateDefaultTeam(userId);
  return { teamId: id || null, error };
}

/**
 * Fetch all players for a team.
 * @param {string} teamId
 * @returns {Promise<{ data: Array<{ id: string, name: string, number: string|null, position: string|null, grade: string|null }>, error: Error|null }>}
 */
export async function fetchPlayersForTeam(teamId) {
  if (!teamId) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, number, position, grade, created_at')
      .eq('team_id', teamId)
      .order('name');

    if (error) return { data: [], error };
    return { data: data ?? [], error: null };
  } catch (e) {
    return { data: [], error: e };
  }
}

/**
 * Fetch roster for the current user's (default) team.
 * @param {string} userId
 * @returns {Promise<{ data: Array, error: Error|null }>}
 */
export async function fetchRosterForUser(userId) {
  const { teamId, error: teamError } = await getTeamIdForUser(userId);
  if (teamError || !teamId) return { data: [], error: teamError };
  return fetchPlayersForTeam(teamId);
}

/**
 * Add a player to a team.
 * @param {string} teamId
 * @param {{ name: string, number?: string, position?: string, grade?: string }} player
 */
export async function addPlayer(teamId, player) {
  try {
    const { data, error } = await supabase
      .from('players')
      .insert({
        team_id: teamId,
        name: (player.name || '').trim(),
        number: player.number != null ? String(player.number).trim() : null,
        position: player.position != null ? String(player.position).trim() : null,
        grade: player.grade != null ? String(player.grade).trim() : null,
      })
      .select()
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

/**
 * Update a player.
 * @param {string} playerId
 * @param {{ name?: string, number?: string, position?: string, grade?: string }} updates
 */
export async function updatePlayer(playerId, updates) {
  try {
    const payload = {};
    if (updates.name !== undefined) payload.name = String(updates.name).trim();
    if (updates.number !== undefined) payload.number = updates.number === '' ? null : String(updates.number).trim();
    if (updates.position !== undefined) payload.position = updates.position === '' ? null : String(updates.position).trim();
    if (updates.grade !== undefined) payload.grade = updates.grade === '' ? null : String(updates.grade).trim();
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('players')
      .update(payload)
      .eq('id', playerId)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

/**
 * Delete a player.
 * @param {string} playerId
 */
export async function deletePlayer(playerId) {
  try {
    const { error } = await supabase.from('players').delete().eq('id', playerId);
    return { error: error ?? null };
  } catch (e) {
    return { error: e };
  }
}

/**
 * Parse CSV text into rows of { name, number, position, grade }.
 * Supports headers: name, number, position, grade (case-insensitive).
 * Also supports: Name, Number, Position, Grade or no header (first row = name, number, position, grade).
 * @param {string} csvText
 * @returns {Array<{ name: string, number: string, position: string, grade: string }>}
 */
export function parseRosterCsv(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const rows = lines.map((line) => {
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if ((c === ',' && !inQuotes) || c === '\t') {
        parts.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    parts.push(current.trim());
    return parts;
  });

  const first = rows[0].map((c) => c.toLowerCase());
  const hasHeader =
    first.some((c) => c === 'name' || c === 'number' || c === 'position' || c === 'grade') ||
    (first.length >= 1 && first[0] === 'name');
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const nameIdx = hasHeader ? first.indexOf('name') : 0;
  const numIdx = hasHeader ? (first.indexOf('number') >= 0 ? first.indexOf('number') : 1) : 1;
  const posIdx = hasHeader ? (first.indexOf('position') >= 0 ? first.indexOf('position') : 2) : 2;
  const gradeIdx = hasHeader ? (first.indexOf('grade') >= 0 ? first.indexOf('grade') : 3) : 3;

  return dataRows.map((row) => ({
    name: (row[nameIdx] ?? '').trim() || '',
    number: (row[numIdx] ?? '').trim() || '',
    position: (row[posIdx] ?? '').trim() || '',
    grade: (row[gradeIdx] ?? '').trim() || '',
  })).filter((r) => r.name);
}

/**
 * Import players from CSV text into a team. Does not clear existing roster.
 * @param {string} teamId
 * @param {string} csvText
 * @returns {Promise<{ added: number, errors: string[], error: Error|null }>}
 */
export async function importRosterFromCsv(teamId, csvText) {
  const rows = parseRosterCsv(csvText);
  let added = 0;
  const errors = [];
  for (const row of rows) {
    const { data, error } = await addPlayer(teamId, row);
    if (error) errors.push(`${row.name}: ${error.message || 'Failed'}`);
    else added++;
  }
  return { added, errors, error: null };
}

/**
 * Simple Levenshtein distance (number of single-char edits).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
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

/**
 * Build name correction pairs for transcription: find words in text that are likely
 * misspellings of roster names (same length or ±1, edit distance 1–2).
 * @param {string} transcription - Raw transcription text
 * @param {string[]} correctNames - Roster player names (correct spelling)
 * @returns {Array<{ from: string, to: string }>}
 */
export function buildRosterNameCorrections(transcription, correctNames) {
  if (!transcription || !correctNames?.length) return [];
  const words = transcription.split(/\s+/).filter((w) => w.length >= 2);
  const seen = new Set();
  const corrections = [];
  for (const word of words) {
    const clean = word.replace(/[^a-zA-Z]/g, '');
    if (!clean || seen.has(clean.toLowerCase())) continue;
    for (const correct of correctNames) {
      const c = correct.trim();
      if (!c || clean.toLowerCase() === c.toLowerCase()) continue;
      const lenDiff = Math.abs(clean.length - c.length);
      if (lenDiff > 1) continue;
      const dist = levenshtein(clean.toLowerCase(), c.toLowerCase());
      if (dist >= 1 && dist <= 2) {
        seen.add(clean.toLowerCase());
        corrections.push({ from: clean, to: c });
        break;
      }
    }
  }
  return corrections;
}

/**
 * Get list of player names for a game session (for label/transcription context).
 * Uses game_session.team_id to load players.
 * @param {string} gameSessionId
 * @returns {Promise<{ names: string[], error: Error|null }>}
 */
export async function getPlayerNamesForGameSession(gameSessionId) {
  if (!gameSessionId) return { names: [], error: null };
  try {
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('team_id')
      .eq('id', gameSessionId)
      .single();

    if (sessionError || !session?.team_id) return { names: [], error: sessionError ?? null };

    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('name')
      .eq('team_id', session.team_id)
      .order('name');

    if (playersError) return { names: [], error: playersError };
    const names = (players ?? []).map((p) => (p.name || '').trim()).filter(Boolean);
    return { names, error: null };
  } catch (e) {
    return { names: [], error: e };
  }
}

/**
 * Get players with name and number for a game session (e.g. for Match Reflection).
 * @param {string} gameSessionId
 * @returns {Promise<{ players: Array<{ name: string, number: string|null }>, error: Error|null }>}
 */
export async function getPlayersForGameSession(gameSessionId) {
  if (!gameSessionId) return { players: [], error: null };
  try {
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('team_id')
      .eq('id', gameSessionId)
      .single();

    if (sessionError || !session?.team_id) return { players: [], error: sessionError ?? null };

    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('name, number')
      .eq('team_id', session.team_id)
      .order('name');

    if (playersError) return { players: [], error: playersError };
    const list = (players ?? []).map((p) => ({
      name: (p.name || '').trim(),
      number: p.number != null ? String(p.number).trim() : null,
    })).filter((p) => p.name);
    return { players: list, error: null };
  } catch (e) {
    return { players: [], error: e };
  }
}
