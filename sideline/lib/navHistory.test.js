import { beforeEach, describe, expect, it } from 'vitest';

import {
  dropCurrentVisit,
  historySnapshot,
  previousPath,
  recordVisit,
  resetHistory,
} from './navHistory';

const HOME = '/app';
const GAMES = '/review';
const RIDGEFIELD = '/review/game/ridgefield-id';
const WEST_WINDSOR = '/review/game/west-windsor-id';

/** Walk a list of paths through the trail the way the root layout does. */
const visit = (...paths) => paths.forEach(recordVisit);

beforeEach(() => resetHistory());

describe('navHistory', () => {
  it('returns the page visited immediately before', () => {
    visit(HOME, RIDGEFIELD);
    expect(previousPath()).toBe(HOME);
  });

  it('has nowhere to go back to at the start of a session', () => {
    visit(HOME);
    expect(previousPath()).toBe(null);
  });

  it('ignores a repeated visit to the page already on top', () => {
    visit(HOME, RIDGEFIELD, RIDGEFIELD);
    expect(historySnapshot()).toEqual([HOME, RIDGEFIELD]);
  });

  // The reported bug: two sibling games sharing one route. Opening the second
  // game must not leave the first one sitting underneath it as a back target.
  it('does not surface a sibling game when backing out of another', () => {
    visit(HOME, WEST_WINDSOR);
    expect(previousPath()).toBe(HOME);

    visit(HOME); // back arrow -> Home
    visit(RIDGEFIELD); // Home -> the other game

    expect(previousPath()).toBe(HOME);
    expect(historySnapshot()).toEqual([HOME, RIDGEFIELD]);
  });

  it('works the same in the other order', () => {
    visit(HOME, RIDGEFIELD, HOME, WEST_WINDSOR);
    expect(previousPath()).toBe(HOME);
  });

  it('unwinds rather than stacking when a loop returns to an earlier page', () => {
    visit(HOME, '/settings', '/roster', '/settings');
    expect(historySnapshot()).toEqual([HOME, '/settings']);
    expect(previousPath()).toBe(HOME);
  });

  it('keeps the games list as the back target when a game opens from it', () => {
    visit(HOME, GAMES, RIDGEFIELD);
    expect(previousPath()).toBe(GAMES);
  });

  it('returns to the game page from its analysis screen', () => {
    visit(HOME, RIDGEFIELD, `${RIDGEFIELD}/summary`);
    expect(previousPath()).toBe(RIDGEFIELD);
  });

  // "unless it is the page right after they finish recording"
  it('skips the record screen after a game is finished', () => {
    visit(HOME, '/record');
    dropCurrentVisit();
    visit(RIDGEFIELD);

    expect(historySnapshot()).toEqual([HOME, RIDGEFIELD]);
    expect(previousPath()).toBe(HOME);
  });

  it('skips record even when the coach arrived from the games list', () => {
    visit(HOME, GAMES, '/record');
    dropCurrentVisit();
    visit(RIDGEFIELD);

    expect(previousPath()).toBe(GAMES);
  });

  it('drops the marker if the replacement never happens', () => {
    visit(HOME, '/record');
    dropCurrentVisit();
    visit(RIDGEFIELD);
    visit('/settings');

    expect(historySnapshot()).toEqual([HOME, RIDGEFIELD, '/settings']);
  });

  it('caps the trail so a long session cannot grow without bound', () => {
    for (let i = 0; i < 80; i += 1) recordVisit(`/page-${i}`);
    expect(historySnapshot()).toHaveLength(50);
    expect(previousPath()).toBe('/page-78');
  });

  it('ignores empty paths', () => {
    visit(HOME, undefined, null, '');
    expect(historySnapshot()).toEqual([HOME]);
  });

  it('starts clean after a reset', () => {
    visit(HOME, RIDGEFIELD);
    resetHistory();
    expect(historySnapshot()).toEqual([]);
    expect(previousPath()).toBe(null);
  });
});
