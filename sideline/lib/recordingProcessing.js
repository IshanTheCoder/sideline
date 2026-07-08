import { supabase } from './supabase';
import { createSignedRecordingUrl } from './recording';
import { transcribeAudio } from './transcription';
import { generateLabel } from './labelGeneration';
import { serializeAiLabels, applyVolleyballTranscriptionCorrections } from './volleyballVocabulary';
import { getPlayersForGameSession, buildRosterNameCorrections, buildRosterNumberCorrections } from './roster';
import { getCustomBucketsForPrompt } from './customBuckets';
import { getOpponentNameForGameSession } from './gameSessions';

function findMentionedPlayers(text, rosterPlayers) {
  if (!text || !rosterPlayers?.length) return [];
  const lower = text.toLowerCase();
  return rosterPlayers
    .filter((p) => p.name && lower.includes(p.name.toLowerCase()))
    .map((p) => p.name);
}

// catches DB errors about columns that don't exist yet — growing pains of schema changes
const isMissingColumnError = (error, column) => {
  if (!error || typeof error !== 'object') return false;
  const message = String(error.message ?? '').toLowerCase();
  const detail = String(error.details ?? '').toLowerCase();
  const hint = String(error.hint ?? '').toLowerCase();
  const haystack = `${message} ${detail} ${hint}`;
  const normalizedColumn = String(column).toLowerCase();

  return (
    haystack.includes(`'${normalizedColumn}'`) ||
    haystack.includes(`"${normalizedColumn}"`) ||
    haystack.includes(` ${normalizedColumn} `) ||
    haystack.includes(`.${normalizedColumn}`) ||
    haystack.includes(`${normalizedColumn} column`) ||
    haystack.includes(`column ${normalizedColumn}`)
  );
};

/**
 * the main quest: audio → transcription → AI label, all in one pipeline run
 * @param {string} recordingId - which recording to process
 * @param {string} userId - who owns this recording
 * @returns {Promise<{success: boolean, transcription: string|null, error: Error|null}>}
 */
async function processRecordingWithDeps(recordingId, userId, deps = {}) {
  const {
    supabase: supabaseClient = supabase,
    createSignedRecordingUrl: createSignedRecordingUrlImpl = createSignedRecordingUrl,
    transcribeAudio: transcribeAudioImpl = transcribeAudio,
    generateLabel: generateLabelImpl = generateLabel,
    serializeAiLabels: serializeAiLabelsImpl = serializeAiLabels,
    applyVolleyballTranscriptionCorrections: applyCorrectionsImpl = applyVolleyballTranscriptionCorrections,
    getPlayersForGameSession: getPlayersForGameSessionImpl = getPlayersForGameSession,
    buildRosterNameCorrections: buildRosterNameCorrectionsImpl = buildRosterNameCorrections,
    buildRosterNumberCorrections: buildRosterNumberCorrectionsImpl = buildRosterNumberCorrections,
    getCustomBucketsForPrompt: getCustomBucketsForPromptImpl = getCustomBucketsForPrompt,
    getOpponentNameForGameSession: getOpponentNameForGameSessionImpl = getOpponentNameForGameSession,
  } = deps;

  try {
    console.log('🔄 Starting recording processing for ID:', recordingId);

    // step 1: pull the recording metadata from the database
    console.log('📥 Fetching recording from database...');
    const { data: recording, error: fetchError } = await fetchRecordingForProcessing(
      recordingId,
      userId,
      supabaseClient
    );

    if (fetchError || !recording) {
      console.error('❌ Failed to fetch recording:', fetchError);
      return {
        success: false,
        transcription: null,
        label: null,
        error: fetchError || new Error('Recording not found'),
      };
    }

    // mark as in-progress immediately so UI can show correct state
    await updateRecordingData(recordingId, userId, { status: 'processing' }, supabaseClient);

    // step 2: extract the audio URL — can't transcribe silence
    const audioUrl = recording.audio_url;
    if (!audioUrl) {
      console.error('❌ Recording has no audio URL');
      await updateRecordingData(recordingId, userId, { status: 'failed' }, supabaseClient);
      return {
        success: false,
        transcription: null,
        label: null,
        error: new Error('Recording has no audio URL'),
      };
    }

    console.log('🎵 Audio URL retrieved:', audioUrl);

    // step 2.5: fetch the roster early — we need names for BOTH Whisper and post-processing
    let rosterPlayers = [];
    let opponentName = '';
    if (recording.game_session_id) {
      const { players } = await getPlayersForGameSessionImpl(recording.game_session_id);
      rosterPlayers = players;
      if (rosterPlayers.length > 0) {
        console.log(`📋 Loaded roster: ${rosterPlayers.length} players`);
      }
      // opponent name gives the AI context to tell "our team" notes from "scout the opponent" notes
      const { opponentName: oppName } = await getOpponentNameForGameSessionImpl(recording.game_session_id);
      opponentName = oppName || '';
    }

    // step 2.6: storage is private so we need a signed URL (like a concert wristband)
    // use shared URL parser so this still works if URL shape changes (public URL, raw path, etc)
    let downloadUrl = audioUrl;
    const { url: signedUrl, error: signedUrlError } = await createSignedRecordingUrlImpl(audioUrl, 3600);

    if (signedUrlError || !signedUrl) {
      console.error('❌ Failed to create signed URL:', signedUrlError);
      // keep the original URL as fallback; this helps older setups where recordings bucket is public
    } else {
      downloadUrl = signedUrl;
      console.log('✅ Signed URL created successfully');
    }

    const playerNames = rosterPlayers.map((p) => p.name).filter(Boolean);
    console.log('🎤 Starting transcription...');
    const { transcription, error: transcriptionError } = await transcribeAudioImpl(downloadUrl, { playerNames });

    if (transcriptionError || !transcription) {
      console.error('❌ Transcription failed:', transcriptionError);
      await updateRecordingData(recordingId, userId, { status: 'failed' }, supabaseClient);
      return {
        success: false,
        transcription: null,
        label: null,
        error: transcriptionError || new Error('Transcription failed'),
      };
    }

    console.log('✅ Transcription completed:', transcription.substring(0, 100) + '...');

    const numberCorrections = buildRosterNumberCorrectionsImpl(transcription, rosterPlayers);
    const nameCorrections = buildRosterNameCorrectionsImpl(transcription, rosterPlayers.map((p) => p.name));
    // apply number substitutions first so "number four" → "Sarah" before name fuzzy-match runs
    const correctedTranscription = applyCorrectionsImpl(
      transcription,
      [...numberCorrections, ...nameCorrections]
    );
    if (correctedTranscription !== transcription || numberCorrections.length > 0 || nameCorrections.length > 0) {
      console.log('🏐 Applied volleyball transcription corrections',
        [numberCorrections.length && `${numberCorrections.length} number→name`, nameCorrections.length && `${nameCorrections.length} name fixes`].filter(Boolean).join(', ') || ''
      );
    }

    // step 4: generate an AI label — pass full roster so the AI can resolve any remaining
    // "number X" references it sees in the (already-corrected) transcription
    const customBuckets = await getCustomBucketsForPromptImpl(userId);
    console.log('🏷️  Generating AI label (volleyball)...');
    const labelResult = await generateLabelImpl(correctedTranscription, { players: rosterPlayers, customBuckets, opponentName });

    let aiLabel = null;
    if (labelResult.error || !labelResult.label) {
      console.error('⚠️ Label generation failed:', labelResult.error);
      // no label? not the end of the world — transcription is the MVP here
    } else {
      console.log('✅ Label generated:', labelResult.label);
      const isOpponentNote = labelResult.isOpponentNote === true;
      // opponent notes reference the other team — don't attach our own roster players to them
      const mentioned = isOpponentNote ? [] : findMentionedPlayers(correctedTranscription, rosterPlayers);
      const resolvedPosition = mentioned.length > 1 ? 'multiple_players' : (labelResult.position ?? undefined);
      aiLabel = serializeAiLabelsImpl(labelResult.label, {
        skillCategory: labelResult.skillCategory ?? undefined,
        position: resolvedPosition,
        playPattern: labelResult.playPattern ?? undefined,
        feedbackType: labelResult.feedbackType ?? undefined,
        ruleNote: labelResult.ruleNote ?? undefined,
        taggedPlayers: mentioned.length ? mentioned : undefined,
        isOpponentNote,
      });
    }

    // step 5: save transcription + label to the DB — checkpoint reached
    console.log('💾 Updating recording with transcription and label...');
    const { error: updateError } = await updateRecordingData(recordingId, userId, {
      transcription: correctedTranscription,
      ai_labels: aiLabel,
      status: 'processed',
    }, supabaseClient);

    if (updateError) {
      console.error('❌ Failed to update recording:', updateError);
      // best-effort: try to at least mark it failed so UI doesn't show it as stuck
      await updateRecordingData(recordingId, userId, { status: 'failed' }, supabaseClient).catch(() => {});
      return {
        success: false,
        transcription: correctedTranscription,
        label: aiLabel,
        error: updateError,
      };
    }

    console.log('✅ Recording processed successfully with transcription and label!');
    return {
      success: true,
      transcription: correctedTranscription,
      label: aiLabel,
      error: null,
    };
  } catch (error) {
    console.error('❌ Unexpected error processing recording:', error);
    // best-effort status update so the recording doesn't stay stuck in 'new' or 'processing'
    await updateRecordingData(recordingId, userId, { status: 'failed' }, supabaseClient).catch(() => {});
    return {
      success: false,
      transcription: null,
      label: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function createRecordingProcessor(deps = {}) {
  return {
    processRecording: (recordingId, userId) => processRecordingWithDeps(recordingId, userId, deps),
  };
}

export async function processRecording(recordingId, userId) {
  return processRecordingWithDeps(recordingId, userId);
}

/**
 * grabs one recording from the DB — just the fields needed for the pipeline
 * @param {string} recordingId - which recording to fetch
 * @param {string} userId - the owner's ID (access control)
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
async function fetchRecordingForProcessing(recordingId, userId, supabaseClient = supabase) {
  try {
    let { data, error } = await supabaseClient
      .from('recordings')
      .select('id, audio_url, status, transcription, ai_labels, game_session_id')
      .eq('id', recordingId)
      .eq('user_id', userId)
      .single();

    // backward compat — user_id column might not exist in older DBs, try without
    if (error && isMissingColumnError(error, 'user_id')) {
      const retry = await supabaseClient
        .from('recordings')
        .select('id, audio_url, status, transcription, ai_labels, game_session_id')
        .eq('id', recordingId)
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) return { data: null, error };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

/**
 * writes transcription + ai_labels back to the recording row — the save button
 * @param {string} recordingId - the recording to update
 * @param {string} userId - owner's ID for access control
 * @param {object} updates - the fields to overwrite (transcription, ai_labels, status)
 * @returns {Promise<{error: Error|null}>}
 */
async function updateRecordingData(recordingId, userId, updates, supabaseClient = supabase) {
  try {
    let { error } = await supabaseClient
      .from('recordings')
      .update(updates)
      .eq('id', recordingId)
      .eq('user_id', userId);

    // backward compat — if user_id column doesn't exist, retry without it
    if (error && isMissingColumnError(error, 'user_id')) {
      const retry = await supabaseClient
        .from('recordings')
        .update(updates)
        .eq('id', recordingId);
      error = retry.error;
    }

    return { error: error ?? null };
  } catch (e) {
    return { error: e };
  }
}

/**
 * batch-generates AI labels for a game session — assembly line style, label printer go brr
 * @param {string} gameSessionId - which game session to label up
 * @param {string} userId - the recordings' owner
 * @returns {Promise<{success: boolean, processedCount: number, failedCount: number, error: Error|null}>}
 */
export async function generateLabelsForGameSession(gameSessionId, userId) {
  try {
    console.log('🏷️  Starting batch label generation for game session:', gameSessionId);

    // query for recordings that have text but are still label-less
    let { data: recordings, error: fetchError } = await supabase
      .from('recordings')
      .select('id, transcription, ai_labels')
      .eq('game_session_id', gameSessionId)
      .eq('user_id', userId)
      .not('transcription', 'is', null);

    // backward compat — no user_id column? no problem, retry without it
    if (fetchError && isMissingColumnError(fetchError, 'user_id')) {
      const retry = await supabase
        .from('recordings')
        .select('id, transcription, ai_labels')
        .eq('game_session_id', gameSessionId)
        .not('transcription', 'is', null);
      recordings = retry.data;
      fetchError = retry.error;
    }

    if (fetchError) {
      console.error('❌ Failed to fetch recordings:', fetchError);
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        error: fetchError,
      };
    }

    if (!recordings || recordings.length === 0) {
      console.log('ℹ️  No recordings with transcriptions found for this game session');
      return {
        success: true,
        processedCount: 0,
        failedCount: 0,
        error: null,
      };
    }

    console.log(`📋 Found ${recordings.length} recordings to process`);

    const { players: rosterPlayers } = await getPlayersForGameSession(gameSessionId);
    const customBuckets = await getCustomBucketsForPrompt(userId);
    const { opponentName } = await getOpponentNameForGameSession(gameSessionId);

    let processedCount = 0;
    let failedCount = 0;

    // loop through each recording and stamp it with an AI label
    for (const recording of recordings) {
      // already labeled? skip it — no need to redo homework that's already done
      if (recording.ai_labels) {
        console.log(`⏭️  Skipping recording ${recording.id} - already has label`);
        continue;
      }

      console.log(`🏷️  Generating label for recording ${recording.id}...`);

      const labelResult = await generateLabel(recording.transcription, { players: rosterPlayers, customBuckets, opponentName });

      if (labelResult.error || !labelResult.label) {
        console.error(`❌ Label generation failed for ${recording.id}:`, labelResult.error);
        failedCount++;
        continue;
      }

      console.log(`✅ Label generated for ${recording.id}: "${labelResult.label}"`);

      const isOpponentNote = labelResult.isOpponentNote === true;
      const mentioned = isOpponentNote ? [] : findMentionedPlayers(recording.transcription, rosterPlayers);
      const resolvedPosition = mentioned.length > 1 ? 'multiple_players' : (labelResult.position ?? undefined);
      const aiLabel = serializeAiLabels(labelResult.label, {
        skillCategory: labelResult.skillCategory ?? undefined,
        position: resolvedPosition,
        playPattern: labelResult.playPattern ?? undefined,
        feedbackType: labelResult.feedbackType ?? undefined,
        ruleNote: labelResult.ruleNote ?? undefined,
        taggedPlayers: mentioned.length ? mentioned : undefined,
        isOpponentNote,
      });

      const { error: updateError } = await updateRecordingData(recording.id, userId, {
        ai_labels: aiLabel,
      });

      if (updateError) {
        console.error(`❌ Failed to update recording ${recording.id}:`, updateError);
        failedCount++;
      } else {
        processedCount++;
      }
    }

    console.log(`✅ Batch label generation complete! Processed: ${processedCount}, Failed: ${failedCount}`);

    return {
      success: true,
      processedCount,
      failedCount,
      error: null,
    };
  } catch (error) {
    console.error('❌ Unexpected error during batch label generation:', error);
    return {
      success: false,
      processedCount: 0,
      failedCount: 0,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * regenerates AI labels for every transcribed recording in a game — even if one exists already
 * @param {string} userId - who owns these recordings
 * @param {string} gameSessionId - the target game session
 * @returns {Promise<{processedCount: number, failedCount: number, error: Error|null}>}
 */
export async function generateMissingLabels(userId, gameSessionId) {
  const errors = [];
  try {
    console.log('🏷️  Generating labels for recordings in game session:', gameSessionId);

    let { data: recordings, error: fetchError } = await supabase
      .from('recordings')
      .select('id, audio_url, transcription, ai_labels')
      .eq('user_id', userId)
      .eq('game_session_id', gameSessionId);

    if (fetchError && isMissingColumnError(fetchError, 'user_id')) {
      const retry = await supabase
        .from('recordings')
        .select('id, audio_url, transcription, ai_labels')
        .eq('game_session_id', gameSessionId);
      recordings = retry.data;
      fetchError = retry.error;
    }

    if (fetchError) {
      console.error('❌ Failed to fetch recordings:', fetchError);
      return { processedCount: 0, failedCount: 0, errors: [`Fetch: ${fetchError.message}`], error: fetchError };
    }

    if (!recordings || recordings.length === 0) {
      console.log('ℹ️  No recordings found');
      return { processedCount: 0, failedCount: 0, errors: [], error: null };
    }

    console.log(`📋 Found ${recordings.length} recordings to process`);

    let rosterPlayers = [];
    try {
      const { players } = await getPlayersForGameSession(gameSessionId);
      rosterPlayers = players || [];
    } catch (rosterErr) {
      console.warn('⚠️ Could not load roster:', rosterErr?.message);
    }

    let customBuckets = {};
    try {
      customBuckets = await getCustomBucketsForPrompt(userId) || {};
    } catch (bucketErr) {
      console.warn('⚠️ Could not load custom buckets:', bucketErr?.message);
    }

    let opponentName = '';
    try {
      const { opponentName: oppName } = await getOpponentNameForGameSession(gameSessionId);
      opponentName = oppName || '';
    } catch (oppErr) {
      console.warn('⚠️ Could not load opponent name:', oppErr?.message);
    }

    let processedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < recordings.length; i++) {
      const recording = recordings[i];
      try {
        const transcriptionText = recording.transcription;

        if (!transcriptionText) {
          console.log(`⏭️  Skipping ${recording.id} — no transcription available`);
          skippedCount++;
          errors.push(`#${i + 1}: no transcription`);
          continue;
        }

        console.log(`🏷️  Generating label for recording ${recording.id} (${transcriptionText.substring(0, 50)}...)...`);
        const labelResult = await generateLabel(transcriptionText, { players: rosterPlayers, customBuckets, opponentName });

        if (labelResult.error || !labelResult.label) {
          const reason = labelResult.error?.message || 'no label returned';
          console.error(`❌ Label generation failed for ${recording.id}:`, reason);
          errors.push(`#${i + 1}: ${reason}`);
          failedCount++;
          continue;
        }

        console.log(`✅ Label generated for ${recording.id}: "${labelResult.label}"`);

        const isOpponentNote = labelResult.isOpponentNote === true;
        const mentioned = isOpponentNote ? [] : findMentionedPlayers(transcriptionText, rosterPlayers);
        const resolvedPosition = mentioned.length > 1 ? 'multiple_players' : (labelResult.position ?? undefined);
        const aiLabel = serializeAiLabels(labelResult.label, {
          skillCategory: labelResult.skillCategory ?? undefined,
          position: resolvedPosition,
          playPattern: labelResult.playPattern ?? undefined,
          feedbackType: labelResult.feedbackType ?? undefined,
          ruleNote: labelResult.ruleNote ?? undefined,
          taggedPlayers: mentioned.length ? mentioned : undefined,
          isOpponentNote,
        });

        const { error: updateError } = await updateRecordingData(recording.id, userId, {
          ai_labels: aiLabel,
        });

        if (updateError) {
          console.error(`❌ Failed to update recording ${recording.id}:`, updateError);
          errors.push(`#${i + 1}: DB update failed - ${updateError.message || updateError}`);
          failedCount++;
        } else {
          processedCount++;
        }

        if (i < recordings.length - 1) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      } catch (recError) {
        const msg = recError?.message || String(recError);
        console.error(`❌ Error processing recording ${recording.id}:`, msg);
        errors.push(`#${i + 1}: ${msg}`);
        failedCount++;
      }
    }

    console.log(`✅ Processing complete! Processed: ${processedCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`);
    if (errors.length > 0) console.log('Error details:', errors.join(' | '));
    return { processedCount, failedCount, skippedCount, errors, error: null };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Unexpected error generating missing labels:', msg);
    errors.push(`Fatal: ${msg}`);
    return {
      processedCount: 0,
      failedCount: 0,
      errors,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * smoke test: runs one recording through the full pipeline to make sure nothing's broken
 * @param {string} recordingId - a legit recording ID to test with
 * @param {string} userId - the recording's owner
 * @returns {Promise<boolean>} true if the pipeline vibed, false if it crashed
 */
export async function testProcessRecording(recordingId, userId) {
  console.log('🧪 Testing recording processing service...');
  console.log('Recording ID:', recordingId);
  console.log('User ID:', userId);

  const result = await processRecording(recordingId, userId);

  if (result.error && !result.success) {
    console.error('❌ Processing test failed:', result.error.message);
    return false;
  }

  if (result.success) {
    console.log('✅ Processing test passed!');
    console.log('Transcription:', result.transcription?.substring(0, 100) + '...');
    return true;
  }

  console.log('⚠️  Processing completed with warnings');
  return true;
}
