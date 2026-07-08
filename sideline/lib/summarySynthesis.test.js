/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./groqClient', () => ({
  groqChat: vi.fn(),
  getGroqApiKey: vi.fn(() => 'test-key'),
}));

import { groqChat, getGroqApiKey } from './groqClient';
import { normalizeTakeaway, synthesizeNoticedMost } from './summarySynthesis';

describe('normalizeTakeaway', () => {
  it('normalizes a full structured takeaway', () => {
    expect(
      normalizeTakeaway({
        text: 'Tighten serve-receive platform angle',
        skill: 'Passing',
        players: ['Maya', 'Sarah'],
        priority: 1,
      })
    ).toEqual({
      text: 'Tighten serve-receive platform angle',
      skill: 'passing',
      players: ['Maya', 'Sarah'],
      priority: 1,
    });
  });

  it('wraps legacy plain strings with defaults', () => {
    expect(normalizeTakeaway('Push faster tempo on outside sets')).toEqual({
      text: 'Push faster tempo on outside sets',
      skill: null,
      players: [],
      priority: 2,
    });
  });

  it('nulls out unknown skill categories instead of passing junk to the UI', () => {
    const result = normalizeTakeaway({ text: 'Some note', skill: 'vibes', priority: 2 });
    expect(result.skill).toBeNull();
  });

  it('clamps bad priorities to 2 and rejects empty text', () => {
    expect(normalizeTakeaway({ text: 'Note', priority: 99 }).priority).toBe(2);
    expect(normalizeTakeaway({ text: '  ' })).toBeNull();
    expect(normalizeTakeaway(null)).toBeNull();
    expect(normalizeTakeaway(42)).toBeNull();
  });

  it('filters non-string players and caps the list', () => {
    const result = normalizeTakeaway({
      text: 'Note',
      players: ['Maya', 7, null, 'Sarah', 'A', 'B', 'C', 'D', 'E'],
    });
    expect(result.players).toEqual(['Maya', 'Sarah', 'A', 'B', 'C', 'D']);
  });
});

describe('synthesizeNoticedMost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGroqApiKey.mockReturnValue('test-key');
  });

  it('parses structured takeaways and sorts by priority', async () => {
    groqChat.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify([
            { text: 'Minor rotation reminder', skill: 'positioning', players: [], priority: 3 },
            { text: 'Serve receive cost us set two', skill: 'passing', players: ['Maya'], priority: 1 },
          ]),
        },
      }],
    });

    const { takeaways, themes, error } = await synthesizeNoticedMost([
      { displayLabel: 'Maya serve receive angle', transcription: 'Maya open up your angle' },
    ]);

    expect(error).toBeNull();
    expect(takeaways.map((t) => t.priority)).toEqual([1, 3]);
    expect(takeaways[0].players).toEqual(['Maya']);
    expect(themes).toEqual(['Serve receive cost us set two', 'Minor rotation reminder']);
  });

  it('degrades gracefully when the model returns legacy plain strings', async () => {
    groqChat.mockResolvedValue({
      choices: [{ message: { content: '["Work on calling the ball louder"]' } }],
    });

    const { takeaways, error } = await synthesizeNoticedMost([{ displayLabel: 'communication' }]);

    expect(error).toBeNull();
    expect(takeaways).toEqual([
      { text: 'Work on calling the ball louder', skill: null, players: [], priority: 2 },
    ]);
  });

  it('returns empty results without calling Groq when there is no input', async () => {
    const result = await synthesizeNoticedMost([]);
    expect(result).toEqual({ takeaways: [], themes: [], error: null });
    expect(groqChat).not.toHaveBeenCalled();
  });

  it('surfaces a missing API key as an error', async () => {
    getGroqApiKey.mockReturnValue('');
    const result = await synthesizeNoticedMost([{ displayLabel: 'x' }]);
    expect(result.takeaways).toEqual([]);
    expect(result.error.message).toBe('Missing Groq API key');
  });
});
