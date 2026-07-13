/* eslint-disable import/first */
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
  NativeModules: { BlobModule: {} },
}));

vi.mock('./supabase', () => ({ supabase: {} }));
vi.mock('./recording', () => ({ createSignedRecordingUrl: vi.fn() }));
vi.mock('./transcription', () => ({ transcribeAudio: vi.fn() }));

vi.mock('expo-file-system/legacy', () => ({
  default: {},
  readAsStringAsync: vi.fn(),
  cacheDirectory: 'cache://',
  downloadAsync: vi.fn(),
  deleteAsync: vi.fn(),
}));

vi.mock('base64-arraybuffer', () => ({
  decode: vi.fn((value) => new ArrayBuffer(value.length)),
}));

import { createRecordingProcessor } from './recordingProcessing';

const buildSupabase = ({ recording, updateErrors = [] }) => {
  const calls = [];
  let updateCount = 0;

  const query = {
    select: vi.fn(() => query),
    update: vi.fn((updates) => {
      calls.push({ type: 'update', updates });
      return query;
    }),
    eq: vi.fn(() => query),
    single: vi.fn(async () => ({ data: recording, error: null })),
  };

  query.eq.mockImplementation(() => query);
  query.update.mockImplementation((updates) => {
    calls.push({ type: 'update', updates });
    updateCount += 1;
    query._nextUpdateError = updateErrors[updateCount - 1] ?? null;
    return query;
  });
  query.eq.mockImplementation(() => ({
    eq: vi.fn(async () => ({ error: query._nextUpdateError ?? null })),
    single: query.single,
  }));

  // fetch path needs .eq().eq().single(); update path needs .eq().eq() awaitable-ish.
  const table = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({ single: query.single })),
        single: query.single,
      })),
    })),
    update: vi.fn((updates) => {
      calls.push({ type: 'update', updates });
      const error = updateErrors[calls.filter((c) => c.type === 'update').length - 1] ?? null;
      return {
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ error })),
        })),
      };
    }),
  };

  return {
    calls,
    client: { from: vi.fn(() => table) },
  };
};

describe('createRecordingProcessor', () => {
  it('runs the full audio-to-structured-note pipeline and persists the structured output', async () => {
    const recording = {
      id: 'rec-1',
      audio_url: 'https://storage.example/raw-audio.m4a',
      game_session_id: 'game-1',
    };
    const { client: supabase, calls } = buildSupabase({ recording });
    const callOrder = [];

    const processor = createRecordingProcessor({
      supabase,
      createSignedRecordingUrl: vi.fn(async (url, expiresIn) => {
        callOrder.push(['signed-url', url, expiresIn]);
        return { url: 'https://signed.example/audio.m4a', error: null };
      }),
      transcribeAudio: vi.fn(async (url, options) => {
        callOrder.push(['transcribe', url, options]);
        return { transcription: 'number four needs better server receive communication', error: null };
      }),
      generateLabel: vi.fn(async (text, options) => {
        callOrder.push(['label', text, options]);
        return {
          label: 'Sarah Serve Receive Communication',
          skillCategory: 'passing',
          position: 'outside_hitter',
          playPattern: 'serve receive',
          feedbackType: 'communication',
          ruleNote: null,
          error: null,
        };
      }),
      getPlayersForGameSession: vi.fn(async () => ({
        players: [{ name: 'Sarah Johnson', number: '4' }],
      })),
      buildRosterNumberCorrections: vi.fn(() => [{ from: 'number four', to: 'Sarah Johnson' }]),
      buildRosterNameCorrections: vi.fn(() => []),
      applyVolleyballTranscriptionCorrections: vi.fn((text, corrections) => {
        return corrections.reduce((acc, { from, to }) => acc.replace(from, to), text)
          .replace('server receive', 'serve receive');
      }),
      getCustomBucketsForPrompt: vi.fn(async () => ({ skill: ['hustle'] })),
      serializeAiLabels: vi.fn((label, meta) => JSON.stringify({ label, ...meta })),
    });

    const result = await processor.processRecording('rec-1', 'coach-1');

    expect(result.success).toBe(true);
    expect(result.transcription).toBe('Sarah Johnson needs better serve receive communication');
    expect(callOrder).toEqual([
      ['signed-url', 'https://storage.example/raw-audio.m4a', 3600],
      ['transcribe', 'https://signed.example/audio.m4a', {
        playerNames: ['Sarah Johnson'],
        players: [{ name: 'Sarah Johnson', number: '4' }],
      }],
      ['label', 'Sarah Johnson needs better serve receive communication', {
        players: [{ name: 'Sarah Johnson', number: '4' }],
        customBuckets: { skill: ['hustle'] },
        opponentName: '',
      }],
    ]);
    expect(calls.map((c) => c.updates)).toEqual([
      { status: 'processing' },
      {
        transcription: 'Sarah Johnson needs better serve receive communication',
        ai_labels: JSON.stringify({
          label: 'Sarah Serve Receive Communication',
          skillCategory: 'passing',
          position: 'outside_hitter',
          playPattern: 'serve receive',
          feedbackType: 'communication',
          ruleNote: undefined,
          taggedPlayers: ['Sarah Johnson'],
          isOpponentNote: false,
        }),
        status: 'processed',
      },
    ]);
  });

  it('marks the recording failed when transcription fails', async () => {
    const { client: supabase, calls } = buildSupabase({
      recording: { id: 'rec-2', audio_url: 'https://storage.example/audio.m4a' },
    });

    const processor = createRecordingProcessor({
      supabase,
      createSignedRecordingUrl: vi.fn(async () => ({ url: 'https://signed.example/audio.m4a', error: null })),
      transcribeAudio: vi.fn(async () => ({ transcription: null, error: new Error('Whisper failed') })),
      generateLabel: vi.fn(),
      getPlayersForGameSession: vi.fn(),
      buildRosterNumberCorrections: vi.fn(() => []),
      buildRosterNameCorrections: vi.fn(() => []),
      applyVolleyballTranscriptionCorrections: vi.fn((text) => text),
      getCustomBucketsForPrompt: vi.fn(async () => ({})),
      serializeAiLabels: vi.fn(),
    });

    const result = await processor.processRecording('rec-2', 'coach-1');

    expect(result.success).toBe(false);
    expect(result.error.message).toBe('Whisper failed');
    expect(calls.map((c) => c.updates)).toEqual([
      { status: 'processing' },
      { status: 'failed' },
    ]);
  });
});
