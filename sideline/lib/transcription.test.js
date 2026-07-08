/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-file-system/legacy', () => ({
  default: {},
  cacheDirectory: 'cache://',
  downloadAsync: vi.fn(),
  deleteAsync: vi.fn(),
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

import { createTranscriptionClient, buildWhisperPrompt } from './transcription';

describe('createTranscriptionClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('downloads audio, builds the Whisper prompt, and calls Groq audio transcription', async () => {
    const formEntries = [];
    class TestFormData {
      append(key, value) {
        formEntries.push([key, value]);
      }
    }
    class TestAbortController {
      constructor() {
        this.signal = { aborted: false };
      }
      abort() {
        this.signal.aborted = true;
      }
    }

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ text: 'Sarah needs to open her angle on serve receive' }),
    }));
    const downloadAudioFile = vi.fn(async () => new File(['audio-bytes'], 'recording.webm', { type: 'audio/webm' }));

    const client = createTranscriptionClient({
      apiKey: 'groq-test-key',
      platformOS: 'web',
      downloadAudioFile,
      fetchImpl,
      FormDataCtor: TestFormData,
      AbortControllerCtor: TestAbortController,
      setTimeoutFn: vi.fn(() => 123),
      clearTimeoutFn: vi.fn(),
    });

    const result = await client.transcribeAudio('https://signed.example/audio.webm', {
      playerNames: ['Sarah Johnson', 'Ishan Patel', 'Sarah Johnson'],
    });

    expect(result).toEqual({
      transcription: 'Sarah needs to open her angle on serve receive',
      error: null,
    });
    expect(downloadAudioFile).toHaveBeenCalledWith('https://signed.example/audio.webm');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer groq-test-key' },
      })
    );
    expect(formEntries).toEqual([
      ['file', expect.any(File)],
      ['model', 'whisper-large-v3'],
      ['language', 'en'],
      ['temperature', '0'],
      ['prompt', expect.stringContaining('Players: Sarah Johnson, Ishan Patel')],
    ]);
  });

  it('returns a clear error when the Groq key is missing', async () => {
    const client = createTranscriptionClient({ apiKey: '' });

    const result = await client.transcribeAudio('https://signed.example/audio.webm');

    expect(result.transcription).toBeNull();
    expect(result.error.message).toBe('Groq API key not configured');
  });
});

describe('buildWhisperPrompt', () => {
  it('returns base volleyball vocabulary with no roster', () => {
    const prompt = buildWhisperPrompt();
    expect(prompt).toContain('serve receive');
    expect(prompt).toContain('libero');
    expect(prompt).not.toContain('Players:');
  });

  it('prefers full roster objects and includes jersey numbers', () => {
    const prompt = buildWhisperPrompt(
      ['Sarah'],
      [
        { name: 'Sarah Johnson', number: 4 },
        { name: 'Ishan Patel', number: '12' },
        { name: 'Maya Chen' }, // no number — name only
      ]
    );
    expect(prompt).toContain('Players: Sarah Johnson number 4, Ishan Patel number 12, Maya Chen');
  });

  it('falls back to bare names when no roster objects are given', () => {
    const prompt = buildWhisperPrompt(['Sarah Johnson', 'Ishan Patel']);
    expect(prompt).toContain('Players: Sarah Johnson, Ishan Patel');
  });

  it('dedupes entries and skips blank names', () => {
    const prompt = buildWhisperPrompt([], [
      { name: 'Sarah Johnson', number: 4 },
      { name: 'Sarah Johnson', number: 4 },
      { name: '  ' },
      { name: null },
    ]);
    const matches = prompt.match(/Sarah Johnson/g);
    expect(matches).toHaveLength(1);
  });
});
