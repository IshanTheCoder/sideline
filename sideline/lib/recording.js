import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';
import { getOrCreateDefaultTeam } from './gameSessions';

// unwraps the raw notes like a mystery loot box — might be JSON, might be plain text
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
    // JSON.parse struck out — it's probably just raw text, no biggie
  }

  return { notes: raw, setMarkers: [] };
};

// zips notes + set markers into a single JSON string, like packing a suitcase
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

// sniffs out DB errors about columns that literally aren't in the schema
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
 * launches an audio file into Supabase Storage like a volleyball serve to the cloud
 * @param userId - who's uploading
 * @param recordingId - this recording's unique ID (basically its SSN)
 * @param audioUri - where the audio file lives on the device right now
 * @returns a public URL on success, or an error if the upload bricked
 */
export const uploadRecording = async (userId, recordingId, audioUri) => {
  try {
    // web = webm, native = m4a — gotta match the audio format to the platform
    const isWeb = Platform.OS === 'web';
    const ext = isWeb ? 'webm' : 'm4a';
    const contentType = isWeb ? 'audio/webm' : 'audio/m4a';
    const fileName = `${userId}/${recordingId}.${ext}`;

    console.log('Preparing audio file for upload. URI:', audioUri, 'format:', ext);

    let fileToUpload;

    // web path: turn that blob URL into raw bytes (like melting a popsicle back to juice)
    if (isWeb && (audioUri.startsWith('blob:') || audioUri.startsWith('http://') || audioUri.startsWith('https://'))) {
      console.log('Web detected - fetching blob and converting to ArrayBuffer');
      const response = await fetch(audioUri);
      const blob = await response.blob();
      fileToUpload = await blob.arrayBuffer();
      console.log('ArrayBuffer created. Size:', fileToUpload.byteLength);
    } else {
      // native path: file → base64 string → raw bytes (the scenic route)
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
        
        // decode the base64 cipher back into raw bytes the server can understand
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

    // fire the audio up to Supabase cloud storage — fingers crossed
    const { data, error } = await supabase.storage
      .from('recordings')
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false, // no overwriting allowed — each recording is a one-of-a-kind artifact
        contentType: contentType,
      });

    if (error) {
      console.log('Error uploading recording:', error);
      return { url: null, error };
    }

    console.log('✅ Upload successful! Storage data:', data);

    // grab the public URL so anyone with the link can play this audio
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
 * finds today's game session or creates a fresh one on the fly
 * placeholder logic until the real game session system drops in Phase 6
 */
const getOrCreateDefaultGameSession = async (userId) => {
  try {
    // step 1: secure a team — you can't play a game without one lol
    const { id: teamId, error: teamError } = await getOrCreateDefaultTeam(userId);
    
    if (teamError || !teamId) {
      return {
        id: '',
        error: teamError || new Error('Failed to get team'),
      };
    }

    // check if today already has a game session saved
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

    // today's empty — spin up a brand new game session
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
 * saves a new recording to the database — basically its birth certificate
 * @param recordingData - the full payload of recording info to persist
 * @returns the created DB row, or an error if the insert face-planted
 */
export const createRecordingRecord = async (recordingData) => {
  try {
    console.log('Creating recording record in database:', recordingData);

    // missing a game session? we'll fetch or create a default — improvise, adapt, overcome
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
      status: 'new', // fresh out of the oven, not processed yet
      manual_notes: recordingData.manual_notes ?? null,
    };

    let { data, error } = await supabase
      .from('recordings')
      .insert(insertPayload)
      .select()
      .single();

    // backward compat — older schemas might be missing user_id, so retry without it
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
      // dump the full error object so future-us has something to debug with
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

// converts raw seconds into a nice "3:07" display string (think Spotify track length)
export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// fetches every recording this user has ever made, sorted newest-first
export async function fetchRecordingsForUser(userId) {
  try {
    const selectWithMatchType = `
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
        date,
        match_type
      )
    `;
    const selectWithoutMatchType = `
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
    `;
    const fallbackSelectWithMatchType = `
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
        match_type,
        teams!inner (
          coach_id
        )
      )
    `;
    const fallbackSelectWithoutMatchType = `
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
    `;

    let { data, error } = await supabase
      .from('recordings')
      .select(selectWithMatchType)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error && isMissingColumnError(error, 'match_type')) {
      const retryNoMatchType = await supabase
        .from('recordings')
        .select(selectWithoutMatchType)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      data = retryNoMatchType.data;
      error = retryNoMatchType.error;
    }

    if (error && isMissingColumnError(error, 'user_id')) {
      // fallback: find recordings via the team → coach ownership chain
      const retry = await supabase
        .from('recordings')
        .select(fallbackSelectWithMatchType)
        .eq('game_sessions.teams.coach_id', userId)
        .order('created_at', { ascending: false });

      data = retry.data;
      error = retry.error;

      if (error && isMissingColumnError(error, 'match_type')) {
        const retryNoMatchType = await supabase
          .from('recordings')
          .select(fallbackSelectWithoutMatchType)
          .eq('game_sessions.teams.coach_id', userId)
          .order('created_at', { ascending: false });
        data = retryNoMatchType.data;
        error = retryNoMatchType.error;
      }
    }

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

// pull every recording tied to one specific game session
export async function fetchRecordingsForGame(userId, gameSessionId) {
  try {
    const isUnassigned = gameSessionId === 'unassigned';
    const selectWithMatchType = `
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
        date,
        match_type
      )
    `;
    const selectWithoutMatchType = `
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
    `;
    const fallbackSelectWithMatchType = `
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
        match_type,
        teams!inner (
          coach_id
        )
      )
    `;
    const fallbackSelectWithoutMatchType = `
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
    `;

    let query = supabase
      .from('recordings')
      .select(selectWithMatchType)
      .eq('user_id', userId);

    query = isUnassigned
      ? query.is('game_session_id', null)
      : query.eq('game_session_id', gameSessionId);

    let { data, error } = await query.order('created_at', { ascending: false });

    if (error && isMissingColumnError(error, 'match_type')) {
      let retryQueryNoMatchType = supabase
        .from('recordings')
        .select(selectWithoutMatchType)
        .eq('user_id', userId);
      retryQueryNoMatchType = isUnassigned
        ? retryQueryNoMatchType.is('game_session_id', null)
        : retryQueryNoMatchType.eq('game_session_id', gameSessionId);

      const retryNoMatchType = await retryQueryNoMatchType.order('created_at', { ascending: false });
      data = retryNoMatchType.data;
      error = retryNoMatchType.error;
    }

    if (error && isMissingColumnError(error, 'user_id')) {
      let retryQuery = supabase
        .from('recordings')
        .select(fallbackSelectWithMatchType)
        .eq('game_sessions.teams.coach_id', userId);

      retryQuery = isUnassigned
        ? retryQuery.is('game_session_id', null)
        : retryQuery.eq('game_session_id', gameSessionId);

      const retry = await retryQuery.order('created_at', { ascending: false });

      data = retry.data;
      error = retry.error;

      if (error && isMissingColumnError(error, 'match_type')) {
        let retryQueryNoMatchType = supabase
          .from('recordings')
          .select(fallbackSelectWithoutMatchType)
          .eq('game_sessions.teams.coach_id', userId);
        retryQueryNoMatchType = isUnassigned
          ? retryQueryNoMatchType.is('game_session_id', null)
          : retryQueryNoMatchType.eq('game_session_id', gameSessionId);

        const retryNoMatchType = await retryQueryNoMatchType.order('created_at', { ascending: false });
        data = retryNoMatchType.data;
        error = retryNoMatchType.error;
      }
    }

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

// grab exactly one recording by ID — surgical precision, no extras
export async function fetchRecordingById(userId, recordingId) {
  try {
    const selectWithMatchType = `
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
        date,
        match_type
      )
    `;
    const selectWithoutMatchType = `
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
    `;
    const fallbackSelectWithMatchType = `
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
        match_type,
        teams!inner (
          coach_id
        )
      )
    `;
    const fallbackSelectWithoutMatchType = `
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
    `;

    let { data, error } = await supabase
      .from('recordings')
      .select(selectWithMatchType)
      .eq('id', recordingId)
      .eq('user_id', userId)
      .single();

    if (error && isMissingColumnError(error, 'match_type')) {
      const retryNoMatchType = await supabase
        .from('recordings')
        .select(selectWithoutMatchType)
        .eq('id', recordingId)
        .eq('user_id', userId)
        .single();
      data = retryNoMatchType.data;
      error = retryNoMatchType.error;
    }

    if (error && isMissingColumnError(error, 'user_id')) {
      const retry = await supabase
        .from('recordings')
        .select(fallbackSelectWithMatchType)
        .eq('id', recordingId)
        .eq('game_sessions.teams.coach_id', userId)
        .single();

      data = retry.data;
      error = retry.error;

      if (error && isMissingColumnError(error, 'match_type')) {
        const retryNoMatchType = await supabase
          .from('recordings')
          .select(fallbackSelectWithoutMatchType)
          .eq('id', recordingId)
          .eq('game_sessions.teams.coach_id', userId)
          .single();
        data = retryNoMatchType.data;
        error = retryNoMatchType.error;
      }
    }

    if (error) return { data: null, error };
    return { data: data, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

// persist the user's handwritten notes to a specific recording in the DB
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
 * patches specific fields on a recording — like editing your Instagram bio but for data
 * @param {string} userId - the recording's owner
 * @param {string} recordingId - which recording to update
 * @param {{ transcription?: string, ai_labels?: string, status?: string }} updates - only the fields you wanna change
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

// extracts the storage path from a Supabase public URL (URL archaeology)
function getStoragePathFromPublicUrl(publicUrl) {
  // URL shape: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  // we chop the URL after "public/" to extract the bucket + file path
  try {
    const url = new URL(publicUrl);
    const parts = url.pathname.split('/');
    const publicIdx = parts.findIndex((p) => p === 'public');
    if (publicIdx === -1) return null;
    const bucket = parts[publicIdx + 1];
    if (!bucket) return null;
    const objectPath = parts.slice(publicIdx + 2).join('/');
    if (!objectPath) return null;
    // hands back "bucket/path" so the caller knows exactly where the file lives
    return `${bucket}/${objectPath}`;
  } catch {
    return null;
  }
}

// mints a temporary signed URL — like a backstage pass that expires after a while
export async function createSignedRecordingUrl(audioUrl, expiresInSeconds = 3600) {
  try {
    // first, see if this is a full public URL we can break apart
    const parsed = getStoragePathFromPublicUrl(audioUrl);
    
    let bucket = 'recordings'; // default bucket until we figure out the real one
    let path = audioUrl; // assume it's a raw path unless the URL tells us otherwise
    
    if (parsed) {
      // URL parsed — now split out the bucket name and file path
      const [parsedBucket, ...rest] = parsed.split('/');
      if (parsedBucket && rest.length > 0) {
        bucket = parsedBucket;
        path = rest.join('/');
      }
    } else if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
      // unrecognized URL format — return as-is and pray it's playable
      return { url: audioUrl, error: null };
    }
    // else: already a clean storage path, good to go
    
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

// wipes a recording from the DB and cloud storage — delete means delete
export async function deleteRecordingForUser(userId, recordingId, audioUrl = null) {
  try {
    // kill the storage file first — worst case the DB row is orphaned, not the file
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

    // remove the DB row even if storage cleanup flopped — user's word is law
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

// scorched earth: nukes ALL recordings in a game session, one by one
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

    if (gameSessionId !== 'unassigned') {
      const { error: deleteSessionError } = await supabase
        .from('game_sessions')
        .delete()
        .eq('id', gameSessionId);

      if (deleteSessionError) {
        return { error: deleteSessionError };
      }
    }

    return { error: null };
  } catch (e) {
    return { error: e };
  }
}
