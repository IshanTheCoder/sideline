import { describe, expect, it } from 'vitest';
import { serializeAiLabels, parseAiLabels } from './volleyballVocabulary';

describe('ai_labels opponent-note round-trip', () => {
  it('serializes an opponent note (even with no other metadata) and parses it back', () => {
    const serialized = serializeAiLabels('Their outside only swings line', { isOpponentNote: true });
    expect(serialized.startsWith('{')).toBe(true);
    const parsed = parseAiLabels(serialized);
    expect(parsed.displayLabel).toBe('Their outside only swings line');
    expect(parsed.isOpponentNote).toBe(true);
  });

  it('treats a plain-string (legacy) label as a non-opponent note', () => {
    const parsed = parseAiLabels('Sarah improve serve toss');
    expect(parsed.displayLabel).toBe('Sarah improve serve toss');
    expect(parsed.isOpponentNote).toBe(false);
  });

  it('defaults isOpponentNote to false when the field is absent from JSON', () => {
    const serialized = serializeAiLabels('Setter tempo', { skillCategory: 'setting' });
    const parsed = parseAiLabels(serialized);
    expect(parsed.skillCategory).toBe('setting');
    expect(parsed.isOpponentNote).toBe(false);
  });
});
