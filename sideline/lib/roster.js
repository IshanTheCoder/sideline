/**
 * Everything roster — adding, editing, deleting, and importing players.
 * Also has the fuzzy-matching smarts to fix misspelled names in transcriptions.
 * Each player carries a name, number, position, and grade.
 */

import { supabase } from './supabase';
import { getOrCreateDefaultTeam } from './gameSessions';

/**
 * Figures out which team this user belongs to — creates a default one if they're teamless.
 * @param {string} userId - the user who needs a team
 * @returns {Promise<{ teamId: string|null, error: Error|null }>}
 */
export async function getTeamIdForUser(userId) {
  const { id, error } = await getOrCreateDefaultTeam(userId);
  return { teamId: id || null, error };
}

/**
 * Pulls the full roster for a team — everyone sorted by name, like a class attendance sheet.
 * @param {string} teamId - which team's players to grab
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
 * Convenience wrapper — grabs the roster for whatever team this user is on.
 * @param {string} userId - the user whose team roster we want
 * @returns {Promise<{ data: Array, error: Error|null }>}
 */
export async function fetchRosterForUser(userId) {
  const { teamId, error: teamError } = await getTeamIdForUser(userId);
  if (teamError || !teamId) return { data: [], error: teamError };
  return fetchPlayersForTeam(teamId);
}

/**
 * Adds a new player to the roster — like adding a friend on social media, but for volleyball.
 * @param {string} teamId - which team gets the new recruit
 * @param {{ name: string, number?: string, position?: string, grade?: string }} player - the new player's info
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
 * Edits a player's info — name, number, position, whatever needs changing.
 * @param {string} playerId - who we're updating
 * @param {{ name?: string, number?: string, position?: string, grade?: string }} updates - only the fields you want to change
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
 * Removes a player from the roster — no takebacks, they're gone.
 * @param {string} playerId - the player getting cut
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
 * Turns raw CSV text into nice player objects. Handles headers in any capitalization,
 * or no headers at all (just assumes columns go: name, number, position, grade).
 * Basically the CSV whisperer.
 * @param {string} csvText - the raw CSV string to parse
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
 * Same vibe as parseRosterCsv but for 2D arrays (like what Google Sheets hands you).
 * Sniffs for a header row; if it doesn't find one, assumes column order.
 * @param {string[][]} rows - array of rows where each row is an array of cell values
 * @returns {Array<{ name: string, number: string, position: string, grade: string }>}
 */
export function parseRosterSheetRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const first = rows[0].map((c) => String(c ?? '').toLowerCase().trim());
  const hasHeader =
    first.some((c) => c === 'name' || c === 'number' || c === 'position' || c === 'grade') ||
    (first.length >= 1 && first[0] === 'name');
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const nameIdx = hasHeader ? (first.indexOf('name') >= 0 ? first.indexOf('name') : 0) : 0;
  const numIdx = hasHeader ? (first.indexOf('number') >= 0 ? first.indexOf('number') : 1) : 1;
  const posIdx = hasHeader ? (first.indexOf('position') >= 0 ? first.indexOf('position') : 2) : 2;
  const gradeIdx = hasHeader ? (first.indexOf('grade') >= 0 ? first.indexOf('grade') : 3) : 3;
  return dataRows.map((row) => ({
    name: String(row[nameIdx] ?? '').trim() || '',
    number: String(row[numIdx] ?? '').trim() || '',
    position: String(row[posIdx] ?? '').trim() || '',
    grade: String(row[gradeIdx] ?? '').trim() || '',
  })).filter((r) => r.name);
}

/**
 * Bulk-imports players from CSV text — additive only, won't nuke the existing roster.
 * @param {string} teamId - the team getting new players
 * @param {string} csvText - raw CSV content
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
 * Bulk-imports from a 2D array (Google Sheets style) — additive, keeps the current roster intact.
 * @param {string} teamId - destination team
 * @param {string[][]} rows - the sheet data as rows of cell arrays
 * @returns {Promise<{ added: number, errors: string[], error: Error|null }>}
 */
export async function importRosterFromSheetRows(teamId, rows) {
  const parsed = parseRosterSheetRows(rows);
  let added = 0;
  const errors = [];
  for (const row of parsed) {
    const { data, error } = await addPlayer(teamId, row);
    if (error) errors.push(`${row.name}: ${error.message || 'Failed'}`);
    else added++;
  }
  return { added, errors, error: null };
}

/**
 * Classic Levenshtein distance — counts the minimum single-char edits to morph one string into another.
 * @param {string} a - first string
 * @param {string} b - second string
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
 * Fuzzy-matches words in the transcription against the roster to catch likely
 * name typos (similar length, edit distance 1–2). Returns find-and-replace pairs.
 * @param {string} transcription - the raw transcription where names might be mangled
 * @param {string[]} correctNames - the correctly-spelled roster names to match against
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
 * Grabs just the player names for a game session — used to give the AI roster context
 * when generating labels and fixing transcription typos.
 * @param {string} gameSessionId - the session to look up the team for
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
 * Like getPlayerNamesForGameSession but also brings jersey numbers — handy for Match Reflection.
 * @param {string} gameSessionId - the game session to pull the roster for
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
