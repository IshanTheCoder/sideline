import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Get Groq API key from environment
const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

if (!groqApiKey) {
  console.warn(
    'Missing Groq API key. Transcription will not work.\n' +
    'Please add EXPO_PUBLIC_GROQ_API_KEY to your .env file.'
  );
}

/**
 * Download audio file from URL and convert to format suitable for OpenAI
 * @param audioUrl - URL of the audio file (from Supabase Storage)
 * @returns File object (web) or Blob (native) ready for Whisper API
 */
const MIME_TO_EXT = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/flac': 'flac',
};

function extFromMime(mime) {
  if (!mime) return 'm4a';
  const base = mime.split(';')[0].trim().toLowerCase();
  return MIME_TO_EXT[base] ?? 'm4a';
}

/**
 * Detect actual audio format from the first bytes of the file.
 * Supabase may serve an incorrect content-type if the upload used the wrong one
 * (e.g. web recordings stored as .m4a but actually containing webm data).
 */
function detectFormatFromBytes(arrayBuffer) {
  const header = new Uint8Array(arrayBuffer.slice(0, 12));
  // WebM / Matroska EBML header: 1A 45 DF A3
  if (header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3) {
    return { mime: 'audio/webm', ext: 'webm' };
  }
  // OGG: "OggS"
  if (header[0] === 0x4F && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53) {
    return { mime: 'audio/ogg', ext: 'ogg' };
  }
  // FLAC: "fLaC"
  if (header[0] === 0x66 && header[1] === 0x4C && header[2] === 0x61 && header[3] === 0x43) {
    return { mime: 'audio/flac', ext: 'flac' };
  }
  // WAV: "RIFF"
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
    return { mime: 'audio/wav', ext: 'wav' };
  }
  // MP3: ID3 tag or sync word
  if ((header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) ||
      (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0)) {
    return { mime: 'audio/mpeg', ext: 'mp3' };
  }
  // ftyp box → MP4/M4A
  if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) {
    return { mime: 'audio/mp4', ext: 'm4a' };
  }
  return null;
}

async function downloadAudioFile(audioUrl) {
  if (Platform.OS === 'web') {
    console.log('Web: Fetching audio file from URL');
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio file: ${response.statusText}`);
    }
    const blob = await response.blob();

    // Sniff actual format from file bytes (content-type may be wrong for older recordings)
    const buf = await blob.arrayBuffer();
    const detected = detectFormatFromBytes(buf);
    const headerMime = (blob.type || response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();

    let mime, ext;
    if (detected) {
      mime = detected.mime;
      ext = detected.ext;
      if (headerMime && headerMime !== detected.mime) {
        console.log(`Web audio: content-type "${headerMime}" but actual bytes are ${detected.mime} — using detected format`);
      }
    } else {
      mime = headerMime || 'audio/webm';
      ext = extFromMime(mime);
    }
    console.log('Web audio format:', mime, '→', ext);

    const file = new File([buf], `recording.${ext}`, { type: mime });
    return file;
  } else {
    // Native: download to local file system first
    console.log('Native: Downloading audio file to temporary location');
    const fileUri = `${FileSystem.cacheDirectory}temp_transcription.m4a`;
    
    const downloadResult = await FileSystem.downloadAsync(audioUrl, fileUri);
    
    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download audio file: ${downloadResult.status}`);
    }
    
    // For React Native, return the file URI
    // We'll handle the upload manually in transcribeAudio
    return { uri: fileUri, name: 'recording.m4a', type: 'audio/m4a' };
  }
}

/**
 * Transcribe an audio recording using Groq Whisper API
 * @param audioUrl - URL of the audio file to transcribe
 * @returns Transcription text or error
 */
export async function transcribeAudio(audioUrl) {
  try {
    if (!groqApiKey) {
      return {
        transcription: null,
        error: new Error('Groq API key not configured'),
      };
    }

    console.log('Starting transcription for audio:', audioUrl);

    // Download the audio file
    const audioFile = await downloadAudioFile(audioUrl);
    console.log('Audio file downloaded');

    // For React Native, we need to manually create FormData and use fetch
    if (Platform.OS !== 'web' && audioFile.uri) {
      console.log('Sending to Groq Whisper API (React Native)...');

      const formData = new FormData();
      formData.append('file', {
        uri: audioFile.uri,
        name: audioFile.name,
        type: audioFile.type,
      });
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'en');
      formData.append('prompt', 'volleyball coaching note: serve receive, spike, block, setter, libero, rotation, dig, kill, free ball, down ball, outside hitter, middle blocker, opposite hitter, pancake, pipe, floater');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      const transcription = result.text || result;

      // Clean up temporary file
      try {
        await FileSystem.deleteAsync(audioFile.uri);
        console.log('🗑️ Temporary file cleaned up');
      } catch (err) {
        console.warn('Failed to delete temporary file:', err);
      }

      console.log('✅ Transcription completed successfully');
      return { transcription, error: null };
    } else {
      // Web platform - use Groq API with fetch
      console.log('Sending to Groq Whisper API (Web)...');

      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'en');
      formData.append('prompt', 'volleyball coaching note: serve receive, spike, block, setter, libero, rotation, dig, kill, outside hitter, middle blocker');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      const transcription = result.text || result;

      console.log('✅ Transcription completed successfully');
      return { transcription, error: null };
    }
  } catch (error) {
    console.error('Error transcribing audio:', error);

    // Provide more helpful error messages
    let errorMessage = 'Failed to transcribe audio';
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Invalid Groq API key';
      } else if (error.message.includes('quota')) {
        errorMessage = 'Groq API quota exceeded';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error - please check your connection';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      transcription: null,
      error: new Error(errorMessage),
    };
  }
}

/**
 * Test the transcription service with a sample audio URL
 * This is useful for verifying the API key and setup
 */
export async function testTranscription(audioUrl) {
  console.log('🧪 Testing transcription service...');
  const { transcription, error } = await transcribeAudio(audioUrl);
  
  if (error) {
    console.error('❌ Transcription test failed:', error.message);
    return false;
  }
  
  console.log('✅ Transcription test passed!');
  console.log('Sample transcription:', transcription?.substring(0, 100));
  return true;
}
