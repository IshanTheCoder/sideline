/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./groqClient', () => ({
  groqChat: vi.fn(),
  getGroqApiKey: vi.fn(() => 'test-key'),
}));

import { groqChat, getGroqApiKey } from './groqClient';
import { normalizeTakeaway, synthesizeNoticedMost, synthesizePostGameSummary, extractSummaryText } from './summarySynthesis';

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

describe('extractSummaryText', () => {
  it('reads a bare JSON string', () => {
    expect(extractSummaryText('"The coach noted strong serve receive"')).toBe('The coach noted strong serve receive');
  });

  it('pulls the paragraph out of a JSON object with a summary field', () => {
    expect(extractSummaryText('{"summary":"Emma dug well and Sarah pushed tempo"}')).toBe('Emma dug well and Sarah pushed tempo');
  });

  it('falls back to the first string value of an object without a known key', () => {
    expect(extractSummaryText('{"paragraph":"Ishan blocked the line cleanly"}')).toBe('Ishan blocked the line cleanly');
  });

  it('strips a stray trailing brace from a malformed fragment (the reported artifact)', () => {
    // exact shape from the QA screenshot: leading quote + trailing "}
    expect(extractSummaryText('"The coach emphasized the need to call free balls louder"}'))
      .toBe('The coach emphasized the need to call free balls louder');
  });

  it('strips a malformed object-key wrapper', () => {
    expect(extractSummaryText('{"summary": "Sarah led the tempo well"}').endsWith('}')).toBe(false);
    expect(extractSummaryText('{"summary":"Sarah led the tempo well')).toBe('Sarah led the tempo well');
  });

  it('unwraps a double-wrapped payload: a JSON string whose content is a stringified object', () => {
    // the actual runtime bug — model returned "{\"paragraph\": \"...\"}" as a JSON string
    const doubleWrapped = JSON.stringify('{"paragraph": "The coach noted Maya struggled with serve receive"}');
    expect(extractSummaryText(doubleWrapped)).toBe('The coach noted Maya struggled with serve receive');
  });

  it('unwraps a double-wrapped bare string', () => {
    const doubleWrapped = JSON.stringify('"Sarah pushed the tempo all match"');
    expect(extractSummaryText(doubleWrapped)).toBe('Sarah pushed the tempo all match');
  });

  it('unwraps an object key of any style when JSON.parse fails', () => {
    // unescaped inner content / stray formatting makes these invalid JSON, so the
    // strict path throws and the lenient unwrap has to handle every key style
    expect(extractSummaryText('{paragraph: "Ishan blocked the line well"}')).toBe('Ishan blocked the line well');
    expect(extractSummaryText("{'summary': 'Sarah pushed the tempo'}")).toBe('Sarah pushed the tempo');
    // key-strip stops at the key's colon, leaving a colon inside the value intact
    expect(extractSummaryText('{"note": "tempo: too fast on outside"}')).toBe('tempo: too fast on outside');
  });

  it('unwraps code-fenced JSON', () => {
    expect(extractSummaryText('```json\n"Clean block work in set two"\n```')).toBe('Clean block work in set two');
  });

  it('strips typographic smart quotes wrapping the paragraph', () => {
    // models that emit smart apostrophes wrap the whole string in “ ” — invalid JSON
    expect(extractSummaryText('“The coach noted Maya’s angle was effective”'))
      .toBe('The coach noted Maya’s angle was effective');
  });

  it('strips smart quotes even with a stray trailing brace', () => {
    expect(extractSummaryText('“Call free balls louder”}')).toBe('Call free balls louder');
  });

  it('leaves clean prose untouched', () => {
    expect(extractSummaryText('The team communicated well all match')).toBe('The team communicated well all match');
  });

  it('handles empty and non-string input', () => {
    expect(extractSummaryText('')).toBe('');
    expect(extractSummaryText(null)).toBe('');
  });
});

describe('synthesizePostGameSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGroqApiKey.mockReturnValue('test-key');
  });

  it('recovers the paragraph when the model wraps it in an object', async () => {
    groqChat.mockResolvedValue({
      choices: [{ message: { content: '{"summary":"Maya improved her serve receive angle over three sets"}' } }],
    });
    const { summary, error } = await synthesizePostGameSummary(['Maya serve receive angle']);
    expect(error).toBeNull();
    expect(summary).toBe('Maya improved her serve receive angle over three sets');
  });

  it('recovers cleanly from the malformed trailing-brace artifact', async () => {
    groqChat.mockResolvedValue({
      choices: [{ message: { content: '"The coach emphasized calling free balls louder"}' } }],
    });
    const { summary } = await synthesizePostGameSummary(['Call free balls louder']);
    expect(summary).toBe('The coach emphasized calling free balls louder');
  });
});
