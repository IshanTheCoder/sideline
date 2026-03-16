import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// pull the Groq API key from env — no key = no transcription, game over
const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

if (!groqApiKey) {
  console.warn(
    'Missing Groq API key. Transcription will not work.\n' +
    'Please add EXPO_PUBLIC_GROQ_API_KEY to your .env file.'
  );
}

/**
 * fetches audio from a URL and preps it for Whisper (download → format → ready to roll)
 * @param audioUrl - where the audio lives (usually a Supabase Storage URL)
 * @returns a File on web or {uri, name, type} on native — both ready for the API
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
 * reads the file's first few bytes to detect the real audio format
 * content-type headers are known liars (web recordings saved as .m4a but actually webm)
 * so we check the magic bytes — basically file forensics
 */
function detectFormatFromBytes(arrayBuffer) {
  const header = new Uint8Array(arrayBuffer.slice(0, 12));
  // WebM / Matroska magic bytes: 1A 45 DF A3 — the file's fingerprint
  if (header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3) {
    return { mime: 'audio/webm', ext: 'webm' };
  }
  // OGG writes "OggS" at byte 0 — zero subtlety, love it
  if (header[0] === 0x4F && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53) {
    return { mime: 'audio/ogg', ext: 'ogg' };
  }
  // FLAC opens with "fLaC" — the audiophile's calling card
  if (header[0] === 0x66 && header[1] === 0x4C && header[2] === 0x61 && header[3] === 0x43) {
    return { mime: 'audio/flac', ext: 'flac' };
  }
  // WAV starts with "RIFF" — been doing this since before you were born
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
    return { mime: 'audio/wav', ext: 'wav' };
  }
  // MP3: either an ID3 tag or a 0xFF sync word — two ways to say "I'm an MP3"
  if ((header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) ||
      (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0)) {
    return { mime: 'audio/mpeg', ext: 'mp3' };
  }
  // ftyp box at byte 4 = MP4/M4A container — Apple invented this vibe
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

    // trust the raw bytes over the content-type header (older recordings be lying)
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
    // native: download to temp storage first — can't stream like on web
    console.log('Native: Downloading audio file to temporary location');
    const fileUri = `${FileSystem.cacheDirectory}temp_transcription.m4a`;
    
    const downloadResult = await FileSystem.downloadAsync(audioUrl, fileUri);
    
    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download audio file: ${downloadResult.status}`);
    }
    
    // pass back the file info — transcribeAudio picks it up from here
    // (RN FormData wants {uri, name, type}, not a browser File object)
    return { uri: fileUri, name: 'recording.m4a', type: 'audio/m4a' };
  }
}

/**
 * Builds a Whisper prompt that includes volleyball terminology and, when available,
 * the actual roster names so Whisper can recognise them more accurately.
 * @param {string[]} [playerNames] - optional list of player names from the roster
 * @returns {string}
 */
function buildWhisperPrompt(playerNames = []) {
  const base =
    'volleyball coaching note: serve receive, spike, block, setter, libero, rotation, dig, kill, ' +
    'free ball, down ball, outside hitter, middle blocker, opposite hitter, pancake, pipe, floater';
  if (!playerNames.length) return base;
  // Deduplicate and add roster names so Whisper biases toward them
  const uniqueNames = [...new Set(playerNames.map((n) => n.trim()).filter(Boolean))];
  return `${base}. Player names: ${uniqueNames.join(', ')}`;
}

/**
 * pipes audio through Groq's Whisper API — turns sound waves into text like magic
 * @param audioUrl - URL of the audio file to transcribe
 * @param {{ playerNames?: string[] }} [options] - optional roster names for better accuracy
 * @returns the transcription text, or an error if Whisper struck out
 */
export async function transcribeAudio(audioUrl, options = {}) {
  try {
    if (!groqApiKey) {
      return {
        transcription: null,
        error: new Error('Groq API key not configured'),
      };
    }

    console.log('Starting transcription for audio:', audioUrl);

    // fetch the audio file from its URL
    const audioFile = await downloadAudioFile(audioUrl);
    console.log('Audio file downloaded');

    const whisperPrompt = buildWhisperPrompt(options.playerNames);

    // RN can't just drop a File in FormData — gotta assemble the payload by hand
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
      formData.append('prompt', whisperPrompt);

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

      // clean up the temp file — we're not digital hoarders
      try {
        await FileSystem.deleteAsync(audioFile.uri);
        console.log('🗑️ Temporary file cleaned up');
      } catch (err) {
        console.warn('Failed to delete temporary file:', err);
      }

      console.log('✅ Transcription completed successfully');
      return { transcription, error: null };
    } else {
      // web path — straightforward fetch, no RN weirdness to worry about
      console.log('Sending to Groq Whisper API (Web)...');

      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'en');
      formData.append('prompt', whisperPrompt);

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

    // translate cryptic API errors into something a normal human can read
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
 * smoke test: can we actually transcribe audio? checks the API key and full pipeline
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
