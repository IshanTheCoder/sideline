import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

// Helper function to parse recording notes
export const parseRecordingNotes = (raw) => {
  if (!raw) {
    return { notes: '', setMarkers: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version === 1 && Array.isArray(parsed.setMarkers)) {
      return {
        notes: parsed.notes ?? '',
        setMarkers: parsed.setMarkers,
      };
    }
  } catch {
    // Fall back to plain text notes
  }

  return { notes: raw, setMarkers: [] };
};

// Helper function to serialize recording notes
export const serializeRecordingNotes = (notes, setMarkers) => {
  if (!setMarkers.length) {
    return notes;
  }

  const payload = {
    version: 1,
    notes,
    setMarkers,
  };

  return JSON.stringify(payload);
};

// Helper function to check if error is missing column error
const isMissingColumnError = (error, column) => {
  if (!error || typeof error !== 'object') return false;
  const message = error.message;
  return typeof message === 'string' && message.includes(`'${column}'`);
};

/**
 * Upload an audio recording to Supabase Storage
 * @param userId - The user's ID
 * @param recordingId - Unique recording ID (UUID)
 * @param audioUri - Local URI of the audio file
 * @returns The public URL of the uploaded file or error
 */
export const uploadRecording = async (userId, recordingId, audioUri) => {
  try {
    // On web, Expo records in webm; on native it's m4a (AAC).
    const isWeb = Platform.OS === 'web';
    const ext = isWeb ? 'webm' : 'm4a';
    const contentType = isWeb ? 'audio/webm' : 'audio/m4a';
    const fileName = `${userId}/${recordingId}.${ext}`;

    console.log('Preparing audio file for upload. URI:', audioUri, 'format:', ext);

    let fileToUpload;

    // For web: convert blob URL to ArrayBuffer
    if (isWeb && (audioUri.startsWith('blob:') || audioUri.startsWith('http://') || audioUri.startsWith('https://'))) {
      console.log('Web detected - fetching blob and converting to ArrayBuffer');
      const response = await fetch(audioUri);
      const blob = await response.blob();
      fileToUpload = await blob.arrayBuffer();
      console.log('ArrayBuffer created. Size:', fileToUpload.byteLength);
    } else {
      // For native (React Native): read file as base64, then decode to ArrayBuffer
      console.log('Native detected - reading audio file as base64');
      
      try {
        const base64 = await FileSystem.readAsStringAsync(audioUri, {
          encoding: 'base64',
        });
        
        if (!base64 || base64.length === 0) {
          return {
            url: null,
            error: new Error(
              'Audio file could not be read (empty file). Please try recording again.'
            ),
          };
        }
        
        console.log('Base64 read successfully. Length:', base64.length);
        
        // Decode base64 to ArrayBuffer
        fileToUpload = decode(base64);
        console.log('ArrayBuffer created from base64. Size:', fileToUpload.byteLength);
        
        if (fileToUpload.byteLength === 0) {
          return {
            url: null,
            error: new Error(
              'Audio file could not be decoded (empty ArrayBuffer). Please try recording again.'
            ),
          };
        }
      } catch (readError) {
        console.log('Error reading audio file:', readError);
        return {
          url: null,
          error: new Error(
            `Failed to read audio file: ${readError instanceof Error ? readError.message : 'Unknown error'}`
          ),
        };
      }
    }

    console.log('Uploading to Supabase Storage. FileName:', fileName, 'ContentType:', contentType);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('recordings')
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing recordings
        contentType: contentType,
      });

    if (error) {
      console.log('Error uploading recording:', error);
      return { url: null, error };
    }

    console.log('✅ Upload successful! Storage data:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('recordings')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;
    console.log('✅ Public URL generated:', publicUrl);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.log('Unexpected error uploading recording:', error);
    return { url: null, error: error };
  }
};

/**
 * Get or create a default team for the user
 * This ensures recordings can always be saved, even before Phase 6 team management
 */
const getOrCreateDefaultTeam = async (userId) => {
  try {
    // Try to get an existing team for the user
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('coach_id', userId)
      .limit(1)
      .single();

    if (existingTeam) {
      return { id: existingTeam.id, error: null };
    }

    // No team exists, create a default one
    console.log('No team found, creating default team for user:', userId);
    const { data: newTeam, error: teamError } = await supabase
      .from('teams')
      .insert({
        coach_id: userId,
        name: 'My Team',
        sport: 'volleyball', // Default sport
      })
      .select()
      .single();

    if (teamError || !newTeam) {
      console.error('Failed to create default team:', teamError);
      return {
        id: '',
        error: new Error('Failed to create team. Please try again.'),
      };
    }

    console.log('Created default team:', newTeam.id);
    return { id: newTeam.id, error: null };
  } catch (error) {
    console.error('Error in getOrCreateDefaultTeam:', error);
    return {
      id: '',
      error: error,
    };
  }
};

/**
 * Get or create a default game session for the user
 * This is a temporary solution until Phase 6 game session management is implemented
 */
const getOrCreateDefaultGameSession = async (userId) => {
  try {
    // First, get or create a default team
    const { id: teamId, error: teamError } = await getOrCreateDefaultTeam(userId);
    
    if (teamError || !teamId) {
      return {
        id: '',
        error: teamError || new Error('Failed to get team'),
      };
    }

    // Try to get an existing default game session for today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingSession } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('team_id', teamId)
      .eq('date', today)
      .limit(1)
      .single();

    if (existingSession) {
      return { id: existingSession.id, error: null };
    }

    // Create a new default game session for today
    console.log('Creating default game session for team:', teamId);
    const { data: newSession, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        team_id: teamId,
        opponent_name: 'Default Session',
        date: today,
        location: null,
      })
      .select()
      .single();

    if (sessionError || !newSession) {
      console.error('Failed to create game session:', sessionError);
      return {
        id: '',
        error: new Error('Failed to create game session. Please try again.'),
      };
    }

    console.log('Created default game session:', newSession.id);
    return { id: newSession.id, error: null };
  } catch (error) {
    console.error('Error in getOrCreateDefaultGameSession:', error);
    return {
      id: '',
      error: error,
    };
  }
};

/**
 * Create a recording record in the database
 * @param recordingData - Recording data to save
 * @returns The created recording record or error
 */
export const createRecordingRecord = async (recordingData) => {
  try {
    console.log('Creating recording record in database:', recordingData);

    // Get or create a default game session if none provided
    let gameSessionId = recordingData.game_session_id;

    if (!gameSessionId) {
      const { id, error: sessionError } = await getOrCreateDefaultGameSession(recordingData.user_id);
      if (sessionError || !id) {
        console.error('Failed to get/create game session:', sessionError);
        return {
          data: null,
          error: sessionError || new Error('Failed to get game session'),
        };
      }
      gameSessionId = id;
      console.log('Using game session:', gameSessionId);
    }

    const insertPayload = {
      id: recordingData.id,
      user_id: recordingData.user_id,
      game_session_id: gameSessionId,
      audio_url: recordingData.audio_url,
      duration: recordingData.duration,
      timestamp: recordingData.timestamp || new Date().toISOString(),
      status: 'new', // Default status
      manual_notes: recordingData.manual_notes ?? null,
    };

    let { data, error } = await supabase
      .from('recordings')
      .insert(insertPayload)
      .select()
      .single();

    // Backward-compat: if recordings.user_id doesn't exist, retry without it
    if (error && isMissingColumnError(error, 'user_id')) {
      const { user_id, ...fallbackPayload } = insertPayload;
      const retry = await supabase
        .from('recordings')
        .insert(fallbackPayload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.log('Error creating recording record:', error);
      // Log the full error for debugging
      console.log('Full error details:', JSON.stringify(error, null, 2));
      return { data: null, error };
    }

    console.log('✅ Recording record created successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.log('Unexpected error creating recording record:', error);
    return { data: null, error: error };
  }
};

// Format duration in minutes:seconds
export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Fetch all recordings for a user
export async function fetchRecordingsForUser(userId) {
  try {
    let { data, error } = await supabase
      .from('recordings')
      .select(
        `
        id,
        created_at,
        duration,
        audio_url,
        user_id,
        game_session_id,
        manual_notes,
        transcription,
        ai_labels,
        status,
        game_sessions (
          opponent_name,
          date
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error && isMissingColumnError(error, 'user_id')) {
      // Fallback to team ownership via game_sessions -> teams -> coach_id
      const retry = await supabase
        .from('recordings')
        .select(
          `
          id,
          created_at,
          duration,
          audio_url,
          game_session_id,
          manual_notes,
          transcription,
          ai_labels,
          status,
          game_sessions!inner (
            opponent_name,
            date,
            teams!inner (
              coach_id
            )
          )
        `
        )
        .eq('game_sessions.teams.coach_id', userId)
        .order('created_at', { ascending: false });

      data = retry.data;
      error = retry.error;
    }

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

// Fetch recordings for a specific game session
export async function fetchRecordingsForGame(userId, gameSessionId) {
  try {
    const isUnassigned = gameSessionId === 'unassigned';
    let query = supabase
      .from('recordings')
      .select(
        `
        id,
        created_at,
        duration,
        audio_url,
        user_id,
        game_session_id,
        manual_notes,
        transcription,
        ai_labels,
        status,
        game_sessions (
          opponent_name,
          date
        )
      `
      )
      .eq('user_id', userId);

    query = isUnassigned
      ? query.is('game_session_id', null)
      : query.eq('game_session_id', gameSessionId);

    let { data, error } = await query.order('created_at', { ascending: false });

    if (error && isMissingColumnError(error, 'user_id')) {
      let retryQuery = supabase
        .from('recordings')
        .select(
          `
          id,
          created_at,
          duration,
          audio_url,
          game_session_id,
          manual_notes,
          transcription,
          ai_labels,
          status,
          game_sessions!inner (
            opponent_name,
            date,
            teams!inner (
              coach_id
            )
          )
        `
        )
        .eq('game_sessions.teams.coach_id', userId);

      retryQuery = isUnassigned
        ? retryQuery.is('game_session_id', null)
        : retryQuery.eq('game_session_id', gameSessionId);

      const retry = await retryQuery.order('created_at', { ascending: false });

      data = retry.data;
      error = retry.error;
    }

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

// Fetch a single recording by ID
export async function fetchRecordingById(userId, recordingId) {
  try {
    let { data, error } = await supabase
      .from('recordings')
      .select(
        `
        id,
        created_at,
        duration,
        audio_url,
        user_id,
        game_session_id,
        manual_notes,
        transcription,
        ai_labels,
        status,
        game_sessions (
          opponent_name,
          date
        )
      `
      )
      .eq('id', recordingId)
      .eq('user_id', userId)
      .single();

    if (error && isMissingColumnError(error, 'user_id')) {
      const retry = await supabase
        .from('recordings')
        .select(
          `
          id,
          created_at,
          duration,
          audio_url,
          game_session_id,
          manual_notes,
          transcription,
          ai_labels,
          status,
          game_sessions!inner (
            opponent_name,
            date,
            teams!inner (
              coach_id
            )
          )
        `
        )
        .eq('id', recordingId)
        .eq('game_sessions.teams.coach_id', userId)
        .single();

      data = retry.data;
      error = retry.error;
    }

    if (error) return { data: null, error };
    return { data: data, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

// Save notes for a recording
export async function saveRecordingNotes(userId, recordingId, manualNotes) {
  try {
    let { error } = await supabase
      .from('recordings')
      .update({ manual_notes: manualNotes })
      .eq('id', recordingId)
      .eq('user_id', userId);

    if (error && isMissingColumnError(error, 'user_id')) {
      const retry = await supabase
        .from('recordings')
        .update({ manual_notes: manualNotes })
        .eq('id', recordingId);
      error = retry.error;
    }

    return { error: error ?? null };
  } catch (e) {
    return { error: e };
  }
}

/**
 * Update recording fields (transcription, ai_labels, status).
 * @param {string} userId
 * @param {string} recordingId
 * @param {{ transcription?: string, ai_labels?: string, status?: string }} updates
 */
export async function updateRecording(userId, recordingId, updates) {
  try {
    const payload = {};
    if (updates.transcription !== undefined) payload.transcription = updates.transcription;
    if (updates.ai_labels !== undefined) payload.ai_labels = updates.ai_labels;
    if (updates.status !== undefined) payload.status = updates.status;
    if (Object.keys(payload).length === 0) return { error: null };

    let { error } = await supabase
      .from('recordings')
      .update(payload)
      .eq('id', recordingId)
      .eq('user_id', userId);

    if (error && isMissingColumnError(error, 'user_id')) {
      const retry = await supabase
        .from('recordings')
        .update(payload)
        .eq('id', recordingId);
      error = retry.error;
    }

    return { error: error ?? null };
  } catch (e) {
    return { error: e };
  }
}

// Helper to extract storage path from public URL
function getStoragePathFromPublicUrl(publicUrl) {
  // Expected format:
  // https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  try {
    const url = new URL(publicUrl);
    const parts = url.pathname.split('/');
    const publicIdx = parts.findIndex((p) => p === 'public');
    if (publicIdx === -1) return null;
    const bucket = parts[publicIdx + 1];
    if (!bucket) return null;
    const objectPath = parts.slice(publicIdx + 2).join('/');
    if (!objectPath) return null;
    // We return "<bucket>/<objectPath>" so callers can validate bucket if needed.
    return `${bucket}/${objectPath}`;
  } catch {
    return null;
  }
}

// Create a signed URL for private audio playback
export async function createSignedRecordingUrl(audioUrl, expiresInSeconds = 3600) {
  try {
    // Try to parse as a public URL first
    const parsed = getStoragePathFromPublicUrl(audioUrl);
    
    let bucket = 'recordings'; // Default bucket
    let path = audioUrl; // Assume it's already a path
    
    if (parsed) {
      // If we successfully parsed a public URL, extract bucket and path
      const [parsedBucket, ...rest] = parsed.split('/');
      if (parsedBucket && rest.length > 0) {
        bucket = parsedBucket;
        path = rest.join('/');
      }
    } else if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
      // It's a URL but couldn't be parsed - return as-is
      return { url: audioUrl, error: null };
    }
    // else: it's already a storage path, use it directly with default bucket
    
    console.log('Creating signed URL - bucket:', bucket, 'path:', path);
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      console.error('Supabase createSignedUrl error:', error);
      return { url: null, error };
    }
    
    if (!data || !data.signedUrl) {
      console.error('No signed URL returned from Supabase');
      return { url: null, error: new Error('No signed URL returned') };
    }
    
    console.log('Signed URL created successfully');
    return { url: data.signedUrl, error: null };
  } catch (e) {
    console.error('Exception in createSignedRecordingUrl:', e);
    return { url: null, error: e };
  }
}

// Delete a recording (both database and storage)
export async function deleteRecordingForUser(userId, recordingId, audioUrl = null) {
  try {
    // Best-effort storage delete first (so an orphaned DB row doesn't block cleanup)
    const defaultPath = `${userId}/${recordingId}.m4a`;

    let storageBucket = 'recordings';
    let storagePath = defaultPath;

    if (audioUrl) {
      const parsed = getStoragePathFromPublicUrl(audioUrl);
      if (parsed) {
        const [bucket, ...rest] = parsed.split('/');
        if (bucket && rest.length) {
          storageBucket = bucket;
          storagePath = rest.join('/');
        }
      }
    }

    const { error: storageError } = await supabase.storage
      .from(storageBucket)
      .remove([storagePath]);

    // Proceed with DB delete even if storage delete fails (user asked to delete)
    let { error: dbError } = await supabase
      .from('recordings')
      .delete()
      .eq('id', recordingId)
      .eq('user_id', userId);

    if (dbError && isMissingColumnError(dbError, 'user_id')) {
      const retry = await supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId);
      dbError = retry.error;
    }

    if (dbError) return { error: dbError };
    if (storageError) return { error: storageError };
    return { error: null };
  } catch (e) {
    return { error: e };
  }
}

// Delete all recordings for a game session
export async function deleteGameForUser(userId, gameSessionId) {
  try {
    const { data, error } = await fetchRecordingsForGame(userId, gameSessionId);
    if (error) return { error };
    const recordings = data ?? [];

    for (const recording of recordings) {
      const { error: deleteError } = await deleteRecordingForUser(
        userId,
        recording.id,
        recording.audio_url
      );
      if (deleteError) {
        return { error: deleteError };
      }
    }

    return { error: null };
  } catch (e) {
    return { error: e };
  }
}
