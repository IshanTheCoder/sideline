import OpenAI from 'openai';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Get OpenAI API key from environment
const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!openaiApiKey) {
  console.warn(
    'Missing OpenAI API key. Transcription will not work.\n' +
    'Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.'
  );
}

// Create OpenAI client
const openai = openaiApiKey ? new OpenAI({
  apiKey: openaiApiKey,
  // For React Native, we need to use dangerouslyAllowBrowser
  // since we're making API calls from the client
  dangerouslyAllowBrowser: true,
}) : null;

/**
 * Download audio file from URL and convert to format suitable for OpenAI
 * @param audioUrl - URL of the audio file (from Supabase Storage)
 * @returns File object (web) or Blob (native) ready for Whisper API
 */
async function downloadAudioFile(audioUrl) {
  if (Platform.OS === 'web') {
    // Web: fetch as blob and wrap in File
    console.log('Web: Fetching audio file from URL');
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio file: ${response.statusText}`);
    }
    const blob = await response.blob();
    
    // OpenAI requires a File object with a filename
    const file = new File([blob], 'recording.m4a', { type: 'audio/m4a' });
    return file;
  } else {
    // Native: download to local file system first
    console.log('Native: Downloading audio file to temporary location');
    const fileUri = `${FileSystem.cacheDirectory}temp_transcription.m4a`;
    
    const downloadResult = await FileSystem.downloadAsync(audioUrl, fileUri);
    
    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download audio file: ${downloadResult.status}`);
    }
    
    // Read file as base64 and convert to blob
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });
    
    // Convert base64 to blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/m4a' });
    
    // Clean up temporary file
    try {
      await FileSystem.deleteAsync(fileUri);
    } catch (err) {
      console.warn('Failed to delete temporary file:', err);
    }
    
    return blob;
  }
}

/**
 * Transcribe an audio recording using OpenAI Whisper API
 * @param audioUrl - URL of the audio file to transcribe
 * @returns Transcription text or error
 */
export async function transcribeAudio(audioUrl) {
  try {
    if (!openai) {
      return {
        transcription: null,
        error: new Error('OpenAI API key not configured'),
      };
    }

    console.log('Starting transcription for audio:', audioUrl);

    // Download the audio file
    const audioFile = await downloadAudioFile(audioUrl);
    console.log('Audio file downloaded, size:', audioFile.size, 'bytes');

    // Send to OpenAI Whisper API
    console.log('Sending to OpenAI Whisper API...');
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Optimize for English
      response_format: 'text', // Get plain text response
    });

    console.log('✅ Transcription completed successfully');
    
    // Response is already a string when response_format is 'text'
    const transcription = typeof response === 'string' ? response : response.text;
    
    return { transcription, error: null };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to transcribe audio';
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Invalid OpenAI API key';
      } else if (error.message.includes('quota')) {
        errorMessage = 'OpenAI API quota exceeded';
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
