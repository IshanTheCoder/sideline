import { describe, expect, it, vi } from 'vitest';
import { createLabelGenerator, detectOpponentNote } from './labelGeneration';

describe('createLabelGenerator', () => {
  it('calls Groq chat completions and parses structured coaching-note JSON', async () => {
    const groqChatImpl = vi.fn(async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              label: 'Sarah Johnson serve receive platform angle',
              skillCategory: 'passing',
              position: 'outside_hitter',
              playPattern: 'serve receive',
              feedbackType: 'technique',
              ruleNote: null,
            }),
          },
        },
      ],
    }));

    const { generateLabel } = createLabelGenerator({
      groqChatImpl,
      getGroqApiKeyImpl: () => 'groq-test-key',
    });

    const result = await generateLabel('Sarah Johnson needs to fix her serve receive platform angle.', {
      players: [{ name: 'Sarah Johnson', number: '4' }],
    });

    expect(result).toEqual({
      label: 'Sarah J. Serve Receive Platform Angle',
      skillCategory: 'passing',
      position: 'outside_hitter',
      playPattern: 'serve receive',
      feedbackType: 'technique',
      ruleNote: null,
      isOpponentNote: false,
      error: null,
    });
    expect(groqChatImpl).toHaveBeenCalledWith(expect.objectContaining({
      max_tokens: 200,
      temperature: 0.3,
      messages: [
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('#4 = Sarah Johnson'),
        }),
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Sarah Johnson needs to fix her serve receive platform angle.'),
        }),
      ],
    }));
  });

  it('rejects empty transcript text before calling Groq', async () => {
    const groqChatImpl = vi.fn();
    const { generateLabel } = createLabelGenerator({
      groqChatImpl,
      getGroqApiKeyImpl: () => 'groq-test-key',
    });

    const result = await generateLabel('   ');

    expect(result.label).toBeNull();
    expect(result.error.message).toBe('Transcription text is required');
    expect(groqChatImpl).not.toHaveBeenCalled();
  });

  it('promotes an obvious opponent note the model left as own-team (backstop)', async () => {
    // model wrongly returned isOpponentNote:false, but the label says "Opponent ..."
    const groqChatImpl = vi.fn(async () => ({
      choices: [{
        message: {
          content: JSON.stringify({
            label: 'Opponent outside hitter swings cross court',
            skillCategory: 'defense',
            position: 'outside_hitter',
            playPattern: null,
            feedbackType: 'positioning',
            ruleNote: null,
            isOpponentNote: false,
          }),
        },
      }],
    }));

    const { generateLabel } = createLabelGenerator({
      groqChatImpl,
      getGroqApiKeyImpl: () => 'groq-test-key',
    });

    const result = await generateLabel('Their outside hitter keeps swinging cross court', {
      opponentName: 'Ridge HS',
    });

    expect(result.isOpponentNote).toBe(true);
  });
});

describe('detectOpponentNote', () => {
  it('trusts an LLM true without needing markers', () => {
    expect(detectOpponentNote(true, { label: 'Their setter runs slides', transcription: '' })).toBe(true);
  });

  it('promotes false to true on unambiguous markers in the label', () => {
    expect(detectOpponentNote(false, { label: 'Opponent middle blocker slow to close', transcription: '' })).toBe(true);
    expect(detectOpponentNote(false, { label: "Opponent's libero cheats line", transcription: '' })).toBe(true);
    expect(detectOpponentNote(false, { label: 'Opposing setter dumps on two', transcription: '' })).toBe(true);
    expect(detectOpponentNote(false, { label: 'Note', transcription: 'watch the other team on serve receive' })).toBe(true);
  });

  it('does NOT promote own-team notes with no opponent markers', () => {
    expect(detectOpponentNote(false, { label: 'Maya close your angle on serve receive', transcription: 'Maya open up' })).toBe(false);
    // "they/their" alone is too weak — own teams get described that way constantly
    expect(detectOpponentNote(false, { label: 'They need to talk on defense', transcription: 'they are quiet' })).toBe(false);
  });

  it('never demotes an LLM true even without markers', () => {
    expect(detectOpponentNote(true, { label: 'Maya close your angle', transcription: 'Maya' })).toBe(true);
  });
});
