import { supabase } from './supabase';
import { transcribeAudio } from './transcription';
import { generateLabel } from './labelGeneration';

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

    // Step 4: Update recording with transcription only
    // Labels will be generated in batch when the game ends
    // Keep status as 'new' since we haven't generated labels yet
    console.log('💾 Updating recording with transcription...');
    const { error: updateError } = await updateRecordingData(recordingId, userId, {
      transcription,
      // Status stays 'new' - will become 'processed' after label generation
    });

    if (updateError) {
      console.error('❌ Failed to update recording:', updateError);
      return {
        success: false,
        transcription,
        error: updateError,
      };
    }

    console.log('✅ Transcription completed successfully! Labels will be generated when game ends.');
    return {
      success: true,
      transcription,
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

      // Generate label from transcription
      const { label, error: labelError } = await generateLabel(recording.transcription);

      if (labelError || !label) {
        console.error(`❌ Label generation failed for ${recording.id}:`, labelError);
        failedCount++;
        // Don't update status - keep as 'new'
        continue;
      }

      console.log(`✅ Label generated for ${recording.id}: "${label}"`);

      // Update recording with label (keep status as 'new')
      const { error: updateError } = await updateRecordingData(recording.id, userId, {
        ai_labels: label,
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
