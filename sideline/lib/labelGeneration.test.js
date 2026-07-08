import { describe, expect, it, vi } from 'vitest';
import { createLabelGenerator } from './labelGeneration';

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
});
