/**
 * App-owned navigation history — the trail of pages the coach actually visited.
 *
 * The header back arrow used to call `router.back()`, which pops whichever
 * navigator happens to be focused rather than "the page I was just on". With
 * game detail routes sharing one screen name, that could surface a *different*
 * game: open Ridgefield from Home, press back, land on West Windsor. This
 * module keeps a plain list of visited paths so back is decided by where the
 * user has been, not by navigator internals.
 *
 * The trail is module state on purpose: it must survive screens mounting and
 * unmounting, and there is only ever one of it per app session.
 */

const MAX_ENTRIES = 50;

let trail = [];
let dropCurrentOnNextVisit = false;

/**
 * Record that the user landed on `path`. Called once per navigation from the
 * root layout — screens never call this themselves.
 */
export function recordVisit(path) {
  if (!path) return;

  // A screen that replaced itself asked not to be a back target.
  if (dropCurrentOnNextVisit) {
    dropCurrentOnNextVisit = false;
    trail.pop();
  }

  // Re-rendering the same path is not a new visit.
  if (trail[trail.length - 1] === path) return;

  // Returning to a page already behind us — our own back arrow, the browser
  // back button, or a loop like Settings -> Roster -> Settings — unwinds the
  // trail to that page instead of stacking a duplicate. Without this the
  // trail would grow forever and back would retrace a loop instead of exiting.
  const seen = trail.lastIndexOf(path);
  if (seen !== -1) {
    trail.length = seen + 1;
    return;
  }

  trail.push(path);
  if (trail.length > MAX_ENTRIES) trail.shift();
}

/** The page the back arrow should return to, or null if there is no trail. */
export function previousPath() {
  return trail.length > 1 ? trail[trail.length - 2] : null;
}

/**
 * Drop the current page from the trail as the next navigation lands.
 *
 * Used when a screen sends the user onward via `replace` and should not be a
 * back target: finishing a game hands the coach the game page, and back from
 * there belongs to whatever came before Record — not Record itself.
 */
export function dropCurrentVisit() {
  dropCurrentOnNextVisit = true;
}

/** Clear the trail — sign-out, so the next session does not inherit it. */
export function resetHistory() {
  trail = [];
  dropCurrentOnNextVisit = false;
}

/** Read-only copy, for tests and debugging. */
export function historySnapshot() {
  return [...trail];
}
