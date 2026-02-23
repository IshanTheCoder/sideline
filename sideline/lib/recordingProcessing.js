import { supabase } from './supabase';
import { transcribeAudio } from './transcription';
import { generateLabel } from './labelGeneration';
import { serializeAiLabels, applyVolleyballTranscriptionCorrections } from './volleyballVocabulary';
import { getPlayerNamesForGameSession, buildRosterNameCorrections } from './roster';

// Helper function to check if error is missing column error
const isMissingColumnError = (error, column) => {
  if (!error || typeof error !== 'object') return false;
  const message = error.message;
  return typeof message === 'string' && message.includes(`'${column}'`);
};

/**
 * Process a recording by transcribing it (labels are generated later in batch)
 * @param {string} recordingId - The ID of the recording to process
 * @param {string} userId - The user ID who owns the recording
 * @returns {Promise<{success: boolean, transcription: string|null, error: Error|null}>}
 */
export async function processRecording(recordingId, userId) {
  try {
    console.log('🔄 Starting recording processing for ID:', recordingId);

    // Step 1: Fetch recording from database
    console.log('📥 Fetching recording from database...');
    const { data: recording, error: fetchError } = await fetchRecordingForProcessing(
      recordingId,
      userId
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

    // Step 2: Get audio file URL from recording
    const audioUrl = recording.audio_url;
    if (!audioUrl) {
      console.error('❌ Recording has no audio URL');
      return {
        success: false,
        transcription: null,
        label: null,
        error: new Error('Recording has no audio URL'),
      };
    }

    console.log('🎵 Audio URL retrieved:', audioUrl);

    // Step 2.5: Create a signed URL for downloading (bucket is not public)
    // Extract the file path from the public URL
    // Format: https://[project].supabase.co/storage/v1/object/public/recordings/[path]
    let downloadUrl = audioUrl;
    if (audioUrl.includes('/public/recordings/')) {
      const filePath = audioUrl.split('/public/recordings/')[1];
      console.log('🔐 Creating signed URL for file:', filePath);
      
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('recordings')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error('❌ Failed to create signed URL:', signedUrlError);
      } else {
        downloadUrl = signedUrlData.signedUrl;
        console.log('✅ Signed URL created successfully');
      }
    }

    // Step 3: Call transcribeAudio function
    console.log('🎤 Starting transcription...');
    const { transcription, error: transcriptionError } = await transcribeAudio(downloadUrl);

    if (transcriptionError || !transcription) {
      console.error('❌ Transcription failed:', transcriptionError);
      // Don't update status - keep as 'new'
      return {
        success: false,
        transcription: null,
        label: null,
        error: transcriptionError || new Error('Transcription failed'),
      };
    }

    console.log('✅ Transcription completed:', transcription.substring(0, 100) + '...');

    // Step 3.5: Apply volleyball corrections + roster name spelling (e.g. "Malikal" → "Maliekal")
    let nameCorrections = [];
    if (recording.game_session_id) {
      const { names: rosterNames } = await getPlayerNamesForGameSession(recording.game_session_id);
      nameCorrections = buildRosterNameCorrections(transcription, rosterNames);
    }
    const correctedTranscription = applyVolleyballTranscriptionCorrections(transcription, nameCorrections);
    if (correctedTranscription !== transcription || nameCorrections.length > 0) {
      console.log('🏐 Applied volleyball transcription corrections', nameCorrections.length ? `(${nameCorrections.length} name fixes)` : '');
    }

    // Step 4: Generate AI label with roster context for correct player name spelling
    const { names: playerNames } = recording.game_session_id
      ? await getPlayerNamesForGameSession(recording.game_session_id)
      : { names: [] };
    console.log('🏷️  Generating AI label (volleyball)...');
    const labelResult = await generateLabel(correctedTranscription, { playerNames });

    let aiLabel = null;
    if (labelResult.error || !labelResult.label) {
      console.error('⚠️ Label generation failed:', labelResult.error);
      // Continue anyway - we still have transcription
    } else {
      console.log('✅ Label generated:', labelResult.label);
      aiLabel = serializeAiLabels(labelResult.label, {
        skillCategory: labelResult.skillCategory ?? undefined,
        position: labelResult.position ?? undefined,
        playPattern: labelResult.playPattern ?? undefined,
        feedbackType: labelResult.feedbackType ?? undefined,
        ruleNote: labelResult.ruleNote ?? undefined,
      });
    }

    // Step 5: Update recording with corrected transcription and label
    console.log('💾 Updating recording with transcription and label...');
    const { error: updateError } = await updateRecordingData(recordingId, userId, {
      transcription: correctedTranscription,
      ai_labels: aiLabel,
    });

    if (updateError) {
      console.error('❌ Failed to update recording:', updateError);
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
    return {
      success: false,
      transcription: null,
      label: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Fetch a recording from the database for processing
 * @param {string} recordingId - The recording ID
 * @param {string} userId - The user ID
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
async function fetchRecordingForProcessing(recordingId, userId) {
  try {
    let { data, error } = await supabase
      .from('recordings')
      .select('id, audio_url, status, transcription, ai_labels')
      .eq('id', recordingId)
      .eq('user_id', userId)
      .single();

    // Backward-compat: if recordings.user_id doesn't exist, retry without it
    if (error && isMissingColumnError(error, 'user_id')) {
      const retry = await supabase
        .from('recordings')
        .select('id, audio_url, status, transcription, ai_labels')
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
 * Update recording with transcription and ai_labels
 * @param {string} recordingId - The recording ID
 * @param {string} userId - The user ID
 * @param {object} updates - The fields to update (transcription, ai_labels, status)
 * @returns {Promise<{error: Error|null}>}
 */
async function updateRecordingData(recordingId, userId, updates) {
  try {
    let { error } = await supabase
      .from('recordings')
      .update(updates)
      .eq('id', recordingId)
      .eq('user_id', userId);

    // Backward-compat: if recordings.user_id doesn't exist, retry without it
    if (error && isMissingColumnError(error, 'user_id')) {
      const retry = await supabase
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
 * Update recording status
 * @param {string} recordingId - The recording ID
 * @param {string} userId - The user ID
 * @param {string} status - The new status
 * @returns {Promise<{error: Error|null}>}
 */
async function updateRecordingStatus(recordingId, userId, status) {
  return updateRecordingData(recordingId, userId, { status });
}

/**
 * Generate labels for all recordings in a game session
 * @param {string} gameSessionId - The game session ID
 * @param {string} userId - The user ID who owns the recordings
 * @returns {Promise<{success: boolean, processedCount: number, failedCount: number, error: Error|null}>}
 */
export async function generateLabelsForGameSession(gameSessionId, userId) {
  try {
    console.log('🏷️  Starting batch label generation for game session:', gameSessionId);

    // Fetch all recordings for this game session that have transcriptions but no labels
    let { data: recordings, error: fetchError } = await supabase
      .from('recordings')
      .select('id, transcription, ai_labels')
      .eq('game_session_id', gameSessionId)
      .eq('user_id', userId)
      .not('transcription', 'is', null);

    // Backward-compat: if recordings.user_id doesn't exist, retry without it
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

    const { names: playerNames } = await getPlayerNamesForGameSession(gameSessionId);

    let processedCount = 0;
    let failedCount = 0;

    // Process each recording
    for (const recording of recordings) {
      // Skip if already has a label
      if (recording.ai_labels) {
        console.log(`⏭️  Skipping recording ${recording.id} - already has label`);
        continue;
      }

      console.log(`🏷️  Generating label for recording ${recording.id}...`);

      const labelResult = await generateLabel(recording.transcription, { playerNames });

      if (labelResult.error || !labelResult.label) {
        console.error(`❌ Label generation failed for ${recording.id}:`, labelResult.error);
        failedCount++;
        continue;
      }

      console.log(`✅ Label generated for ${recording.id}: "${labelResult.label}"`);

      const aiLabel = serializeAiLabels(labelResult.label, {
        skillCategory: labelResult.skillCategory ?? undefined,
        position: labelResult.position ?? undefined,
        playPattern: labelResult.playPattern ?? undefined,
        feedbackType: labelResult.feedbackType ?? undefined,
        ruleNote: labelResult.ruleNote ?? undefined,
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
 * Generate labels for ALL recordings in a specific game that have transcriptions
 * @param {string} userId - The user ID
 * @param {string} gameSessionId - The game session ID to filter recordings
 * @returns {Promise<{processedCount: number, failedCount: number, error: Error|null}>}
 */
export async function generateMissingLabels(userId, gameSessionId) {
  try {
    console.log('🏷️  Finding recordings with transcriptions for game session:', gameSessionId);

    // Fetch ALL recordings for this game session that have transcriptions
    let { data: recordings, error: fetchError } = await supabase
      .from('recordings')
      .select('id, transcription, ai_labels')
      .eq('user_id', userId)
      .eq('game_session_id', gameSessionId)
      .not('transcription', 'is', null);

    // Backward-compat: if recordings.user_id doesn't exist, retry without it
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
        processedCount: 0,
        failedCount: 0,
        error: fetchError,
      };
    }

    if (!recordings || recordings.length === 0) {
      console.log('ℹ️  No recordings with transcriptions found');
      return {
        processedCount: 0,
        failedCount: 0,
        error: null,
      };
    }

    console.log(`📋 Found ${recordings.length} recordings to generate labels for`);

    const { names: playerNames } = await getPlayerNamesForGameSession(gameSessionId);

    let processedCount = 0;
    let failedCount = 0;

    // Process each recording
    for (const recording of recordings) {
      console.log(`🏷️  Generating label for recording ${recording.id}...`);

      const labelResult = await generateLabel(recording.transcription, { playerNames });

      if (labelResult.error || !labelResult.label) {
        console.error(`❌ Label generation failed for ${recording.id}:`, labelResult.error);
        failedCount++;
        continue;
      }

      console.log(`✅ Label generated for ${recording.id}: "${labelResult.label}"`);

      const aiLabel = serializeAiLabels(labelResult.label, {
        skillCategory: labelResult.skillCategory ?? undefined,
        position: labelResult.position ?? undefined,
        playPattern: labelResult.playPattern ?? undefined,
        feedbackType: labelResult.feedbackType ?? undefined,
        ruleNote: labelResult.ruleNote ?? undefined,
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

    console.log(`✅ Label generation complete! Processed: ${processedCount}, Failed: ${failedCount}`);

    return {
      processedCount,
      failedCount,
      error: null,
    };
  } catch (error) {
    console.error('❌ Unexpected error generating missing labels:', error);
    return {
      processedCount: 0,
      failedCount: 0,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Test the recording processing function with a recording ID
 * @param {string} recordingId - The recording ID to test with
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>} True if test passed, false otherwise
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
