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
  const headerKey = (value) => {
    const h = String(value ?? '').toLowerCase().trim();
    if (h === 'name' || h === 'player' || h === 'player name') return 'name';
    if (h === '#' || h === 'number' || h === 'no' || h === 'jersey' || h === 'jersey number') return 'number';
    if (h === 'position' || h === 'positions' || h === 'pos') return 'position';
    if (h === 'grade' || h === 'class' || h === 'year') return 'grade';
    return null;
  };
  const normalizedHeaders = first.map(headerKey);
  const hasHeader =
    normalizedHeaders.some(Boolean) ||
    (first.length >= 1 && first[0] === 'name');
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const indexOfHeader = (key, fallback) => {
    const idx = normalizedHeaders.indexOf(key);
    return idx >= 0 ? idx : fallback;
  };
  const nameIdx = hasHeader ? indexOfHeader('name', 0) : 0;
  const numIdx = hasHeader ? indexOfHeader('number', 1) : 1;
  const posIdx = hasHeader ? indexOfHeader('position', 2) : 2;
  const gradeIdx = hasHeader ? indexOfHeader('grade', 3) : 3;

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
  const headerKey = (value) => {
    const h = String(value ?? '').toLowerCase().trim();
    if (h === 'name' || h === 'player' || h === 'player name') return 'name';
    if (h === '#' || h === 'number' || h === 'no' || h === 'jersey' || h === 'jersey number') return 'number';
    if (h === 'position' || h === 'positions' || h === 'pos') return 'position';
    if (h === 'grade' || h === 'class' || h === 'year') return 'grade';
    return null;
  };
  const normalizedHeaders = first.map(headerKey);
  const hasHeader =
    normalizedHeaders.some(Boolean) ||
    (first.length >= 1 && first[0] === 'name');
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const indexOfHeader = (key, fallback) => {
    const idx = normalizedHeaders.indexOf(key);
    return idx >= 0 ? idx : fallback;
  };
  const nameIdx = hasHeader ? indexOfHeader('name', 0) : 0;
  const numIdx = hasHeader ? indexOfHeader('number', 1) : 1;
  const posIdx = hasHeader ? indexOfHeader('position', 2) : 2;
  const gradeIdx = hasHeader ? indexOfHeader('grade', 3) : 3;
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
 * Bulk-imports already-parsed player rows (name/number/position/grade).
 * This is used by screenshot imports after OCR + AI structuring.
 * @param {string} teamId - destination team
 * @param {Array<{ name: string, number?: string, position?: string, grade?: string }>} players
 * @returns {Promise<{ added: number, errors: string[], error: Error|null }>}
 */
export async function importRosterPlayers(teamId, players) {
  if (!teamId) return { added: 0, errors: [], error: new Error('Team is required') };
  if (!Array.isArray(players) || players.length === 0) return { added: 0, errors: [], error: null };

  let added = 0;
  const errors = [];

  for (const player of players) {
    const name = String(player?.name ?? '').trim();
    if (!name) continue;
    const row = {
      name,
      number: player?.number != null ? String(player.number).trim() : undefined,
      position: player?.position != null ? String(player.position).trim() : undefined,
      grade: player?.grade != null ? String(player.grade).trim() : undefined,
    };
    const { error } = await addPlayer(teamId, row);
    if (error) errors.push(`${name}: ${error.message || 'Failed'}`);
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
 * Converts a spoken or written number (word or digit) to a normalized digit string.
 * Handles single words ("four" → "4"), plain digits ("4" → "4"), and two-word
 * compounds ("twenty two" → "22", "twenty-two" → "22").
 * Returns null if the input can't be parsed as a 0–99 number.
 * @param {string} str
 * @returns {string|null}
 */
function wordsToDigit(str) {
  const NUMBER_WORDS = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
    'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
  };
  const lower = str.toLowerCase().trim();
  if (/^\d{1,2}$/.test(lower)) return lower;
  if (NUMBER_WORDS[lower] !== undefined) return String(NUMBER_WORDS[lower]);
  const parts = lower.split(/[\s-]+/);
  if (parts.length === 2) {
    const tens = NUMBER_WORDS[parts[0]];
    const ones = NUMBER_WORDS[parts[1]];
    if (tens !== undefined && ones !== undefined && tens >= 20 && ones >= 1 && ones <= 9) {
      return String(tens + ones);
    }
  }
  return null;
}

/**
 * Detects jersey-number references in the transcription and maps them to the
 * matching player's name. Handles spoken forms like "number four", "number 4",
 * "player twelve", "player 22", and two-word compounds like "number twenty two".
 *
 * Returns find-and-replace pairs that are compatible with
 * applyVolleyballTranscriptionCorrections — so "number four" gets swapped for
 * the actual player name before the transcription ever reaches the AI.
 *
 * @param {string} transcription - raw transcription text
 * @param {Array<{ name: string, number: string|null }>} players - roster with jersey numbers
 * @returns {Array<{ from: string, to: string }>}
 */
export function buildRosterNumberCorrections(transcription, players) {
  if (!transcription || !players?.length) return [];

  // only bother with players who actually have a jersey number
  const numberMap = {};
  for (const p of players) {
    if (p.number && p.name) numberMap[p.number.trim()] = p.name.trim();
  }
  if (!Object.keys(numberMap).length) return [];

  const corrections = [];
  const seen = new Set();

  // matches "number X" or "player X" where X is:
  //   a 1–2 digit number:         "number 4", "player 12"
  //   a single number word:       "number four", "player twelve"
  //   a two-word compound:        "number twenty two", "player twenty-two"
  const pattern = /\b(number|player)\s+(\d{1,2}|\w+(?:[\s-]\w+)?)/gi;
  let match;
  while ((match = pattern.exec(transcription)) !== null) {
    const full = match[0];
    const numStr = match[2];
    const digit = wordsToDigit(numStr);
    if (!digit || !numberMap[digit]) continue;
    const key = full.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    corrections.push({ from: full, to: numberMap[digit] });
  }

  return corrections;
}

/**
 * Fuzzy-matches words in the transcription against the roster to catch likely
 * name typos (similar length, edit distance 1–2). Returns find-and-replace pairs.
 *
 * Splits multi-word roster names into individual tokens so that each first/last
 * name part is matched independently (e.g. "Sarha" → "Sarah", "Nelsn" → "Nelson").
 *
 * @param {string} transcription - the raw transcription where names might be mangled
 * @param {string[]} correctNames - the correctly-spelled roster names to match against
 * @returns {Array<{ from: string, to: string }>}
 */
export function buildRosterNameCorrections(transcription, correctNames) {
  if (!transcription || !correctNames?.length) return [];

  // Build a deduplicated set of individual name tokens from the roster
  // e.g. ["Sarah Nelson", "John Rivera"] → ["Sarah", "Nelson", "John", "Rivera"]
  const rosterTokens = [];
  for (const fullName of correctNames) {
    const trimmed = (fullName || '').trim();
    if (!trimmed) continue;
    for (const part of trimmed.split(/\s+/)) {
      const clean = part.replace(/[^a-zA-Z'-]/g, '').trim();
      if (clean.length >= 2) rosterTokens.push(clean);
    }
  }
  if (!rosterTokens.length) return [];

  const words = transcription.split(/\s+/).filter((w) => w.length >= 2);
  const seen = new Set();
  const corrections = [];
  for (const word of words) {
    const clean = word.replace(/[^a-zA-Z'-]/g, '');
    if (!clean || clean.length < 2 || seen.has(clean.toLowerCase())) continue;
    for (const token of rosterTokens) {
      if (clean.toLowerCase() === token.toLowerCase()) break; // already correct
      const lenDiff = Math.abs(clean.length - token.length);
      if (lenDiff > 1) continue;
      if (clean[0].toLowerCase() !== token[0].toLowerCase()) continue; // must share first letter
      const dist = levenshtein(clean.toLowerCase(), token.toLowerCase());
      if (dist >= 1 && dist <= 2) {
        seen.add(clean.toLowerCase());
        corrections.push({ from: clean, to: token });
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
