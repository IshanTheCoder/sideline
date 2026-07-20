/**
 * Schedule display helpers — turns game_sessions rows (date 'YYYY-MM-DD',
 * freeform time, 'Home'/'Away' venue) into the chips and labels the redesign
 * shows: month abbreviations, day-of-week, "Today · 6:00 PM · Home gym", and
 * the dynamic month-pill list derived from whatever months have games.
 */

export const MON_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const MON_NAME = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// parse 'YYYY-MM-DD' as a local date (new Date('YYYY-MM-DD') would be UTC and
// can shift the day near midnight)
export function parseGameDate(dateStr) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function isToday(dateStr) {
  const d = parseGameDate(dateStr);
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// { mon: 'JUL', day: 18, dow: 'FRI', label: 'Jul 18' } for date chips
export function gameDateParts(dateStr) {
  const d = parseGameDate(dateStr);
  if (!d) return { mon: 'TBD', day: '', dow: '', label: 'TBD' };
  return {
    mon: MON_ABBR[d.getMonth()],
    day: d.getDate(),
    dow: DOW[d.getDay()],
    label: `${MON_ABBR[d.getMonth()].charAt(0)}${MON_ABBR[d.getMonth()].slice(1).toLowerCase()} ${d.getDate()}`,
  };
}

export function venueLabel(venue) {
  return venue === 'Home' ? 'Home gym' : venue === 'Away' ? 'Away' : '';
}

// "Today · 6:00 PM · Home gym" (parts drop out when missing)
export function gameWhenLabel(game, { includeVenue = true } = {}) {
  const parts = [];
  parts.push(isToday(game.date) ? 'Today' : gameDateParts(game.date).label);
  if (game.time) parts.push(game.time);
  if (includeVenue && venueLabel(game.venue)) parts.push(venueLabel(game.venue));
  return parts.join(' · ');
}

// Year-aware month keys for the schedule's month toggle. A key is
// year * 12 + monthIdx, so stepping ±1 walks the calendar across year
// boundaries (Dec 2026 + 1 → Jan 2027).
export function monthKeyFor(dateStr) {
  const d = parseGameDate(dateStr);
  return d ? d.getFullYear() * 12 + d.getMonth() : null;
}

export function currentMonthKey() {
  const now = new Date();
  return now.getFullYear() * 12 + now.getMonth();
}

// { year: 2026, monthIdx: 6, name: 'July', abbr: 'JUL' } from a month key
export function monthKeyParts(key) {
  const year = Math.floor(key / 12);
  const monthIdx = key % 12;
  return { year, monthIdx, name: MON_NAME[monthIdx], abbr: MON_ABBR[monthIdx] };
}

export function gamesInMonthKey(games, key) {
  return (games ?? [])
    .filter((g) => monthKeyFor(g.date) === key)
    .sort((a, b) => (parseGameDate(a.date)?.getDate() ?? 0) - (parseGameDate(b.date)?.getDate() ?? 0));
}

// Where the toggle starts: the month of the next upcoming game, else the most
// recent month that has games, else the current month.
export function defaultMonthKey(games) {
  const nowKey = currentMonthKey();
  const keys = [...new Set((games ?? []).map((g) => monthKeyFor(g.date)).filter((k) => k !== null))].sort(
    (a, b) => a - b
  );
  if (!keys.length) return nowKey;
  return keys.find((k) => k >= nowKey) ?? keys[keys.length - 1];
}

/**
 * Parses freeform date text from the Add Game form ("Jul 20", "July 20",
 * "7/20", "07/20/2026", "2026-07-20") into 'YYYY-MM-DD', or null if
 * unreadable. Years default to the current year.
 */
export function parseFlexibleDate(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const year = new Date().getFullYear();
  const pad = (n) => String(n).padStart(2, '0');

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`;

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    const y = slash[3] ? (slash[3].length === 2 ? 2000 + Number(slash[3]) : Number(slash[3])) : year;
    const mo = Number(slash[1]);
    const day = Number(slash[2]);
    if (mo >= 1 && mo <= 12 && day >= 1 && day <= 31) return `${y}-${pad(mo)}-${pad(day)}`;
    return null;
  }

  const monthText = raw.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?$/);
  if (monthText) {
    const idx = MON_NAME.findIndex((m) => m.toLowerCase().startsWith(monthText[1].toLowerCase()));
    if (idx >= 0) {
      const y = monthText[3] ? Number(monthText[3]) : year;
      const day = Number(monthText[2]);
      if (day >= 1 && day <= 31) return `${y}-${pad(idx + 1)}-${pad(day)}`;
    }
  }
  return null;
}

// "18:30" (from an HTML time input) → "6:30 PM" for display/storage
export function format12hTime(hhmm) {
  const m = String(hhmm ?? '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return String(hhmm ?? '').trim() || null;
  let h = Number(m[1]);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${suffix}`;
}

// "Sunday, July 19" for the Home header eyebrow
export function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// initials tile for a game/team name: "East Windsor" → "EW"
export function initialsFor(name) {
  return String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
