import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RecordButton } from '@/components/RecordButton';
import { ActiveSessionIndicator } from '@/components/ActiveSessionIndicator';
import { useAudioPermissions } from '@/hooks/use-audio-permissions';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSession } from '@/contexts/ActiveSessionContext';
import { uploadRecording, createRecordingRecord, serializeRecordingNotes } from '@/lib/recording';
import { processRecording, generateLabelsForGameSession } from '@/lib/recordingProcessing';

export default function RecordScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeSession, clearActiveSession } = useActiveSession();
  const { status, requestPermission, isLoading: isPermissionLoading } = useAudioPermissions();
  const iconColor = useThemeColor({}, 'icon');
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentRecording, setCurrentRecording] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);
  const [selectedSetOffsetSeconds, setSelectedSetOffsetSeconds] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Audio recording reference
  const recordingRef = useRef(null);

  // Set up audio mode on mount
  useEffect(() => {
    const setupAudioMode = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
      } catch (error) {
        console.error('Failed to set up audio mode:', error);
      }
    };

    setupAudioMode();

    // Cleanup: stop any active recording when component unmounts
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(console.error);
      }
    };
  }, []);

  // Timer effect - increments every second while recording
  useEffect(() => {
    let interval = null;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      // Reset timer when recording stops
      setRecordingDuration(0);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setIsLoading(true);
      clearError(); // Clear any previous errors
      setSelectedSetOffsetSeconds(null);
      
      // Request permissions if not already granted
      if (status !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setIsLoading(false);
          const errorMsg = 'Microphone permission is required to record. Please enable it in Settings.';
          setError(errorMsg);
          Alert.alert(
            'Permission Required',
            errorMsg,
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Set audio mode for recording
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
      } catch (audioModeError) {
        console.error('Failed to set audio mode:', audioModeError);
        const errorMsg = 'Failed to configure audio settings. Please try again.';
        setError(errorMsg);
        setIsLoading(false);
        Alert.alert(
          'Audio Configuration Error',
          errorMsg,
          [{ text: 'OK' }]
        );
        return;
      }

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          // Optional: Handle recording status updates
          if (status.isRecording) {
            // Recording is active
          }
        }
      );

      if (activeSession?.startedAt) {
        const offsetSeconds = Math.max(
          0,
          Math.floor((Date.now() - activeSession.startedAt.getTime()) / 1000)
        );
        setSelectedSetOffsetSeconds(offsetSeconds);
      }

      recordingRef.current = recording;
      setIsRecording(true);
      setCurrentRecording(null);
      setIsLoading(false);
      clearError(); // Clear errors on success
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsLoading(false);
      const errorMsg = getErrorMessage(error, 'Failed to start recording. Please try again.');
      setError(errorMsg);
      Alert.alert(
        'Recording Error',
        errorMsg,
        [{ text: 'OK', onPress: clearError }]
      );
    }
  };

  const stopRecording = async () => {
    try {
      setIsLoading(true);
      clearError(); // Clear any previous errors

      if (!recordingRef.current) {
        setIsLoading(false);
        const errorMsg = 'No active recording found.';
        setError(errorMsg);
        return;
      }

      if (!user?.id) {
        setIsLoading(false);
        const errorMsg = 'You must be logged in to save recordings. Please log in and try again.';
        setError(errorMsg);
        Alert.alert(
          'Authentication Error',
          errorMsg,
          [{ text: 'OK', onPress: clearError }]
        );
        return;
      }

      // Stop and unload recording
      let uri = null;
      try {
        await recordingRef.current.stopAndUnloadAsync();
        uri = recordingRef.current.getURI();
      } catch (stopError) {
        console.error('Failed to stop recording:', stopError);
        const errorMsg = getErrorMessage(stopError, 'Failed to stop recording. The audio may be lost.');
        setError(errorMsg);
        setIsLoading(false);
        Alert.alert(
          'Recording Stop Error',
          errorMsg,
          [{ text: 'OK', onPress: clearError }]
        );
        recordingRef.current = null;
        setIsRecording(false);
        return;
      }
      
      if (!uri) {
        const errorMsg = 'Recording file not found. Please try recording again.';
        setError(errorMsg);
        setIsLoading(false);
        Alert.alert(
          'Recording Error',
          errorMsg,
          [{ text: 'OK', onPress: clearError }]
        );
        recordingRef.current = null;
        setIsRecording(false);
        return;
      }

      // Generate unique recording ID (UUID)
      let recordingId;
      try {
        recordingId = Crypto.randomUUID();
      } catch (uuidError) {
        console.error('Failed to generate UUID:', uuidError);
        const errorMsg = 'Failed to generate recording ID. Please try again.';
        setError(errorMsg);
        setIsLoading(false);
        Alert.alert(
          'Error',
          errorMsg,
          [{ text: 'OK', onPress: clearError }]
        );
        recordingRef.current = null;
        setIsRecording(false);
        return;
      }

      const timestamp = new Date().toISOString();

      // Upload recording to Supabase Storage
      console.log('Uploading recording to Supabase Storage...');
      const { url: audioUrl, error: uploadError } = await uploadRecording(
        user.id,
        recordingId,
        uri
      );

      if (uploadError || !audioUrl) {
        console.error('Upload error:', uploadError);
        const errorMsg = getErrorMessage(
          uploadError,
          'Failed to upload recording. Please check your connection and try again.'
        );
        setError(errorMsg);
        setIsLoading(false);
        Alert.alert(
          'Upload Error',
          errorMsg,
          [
            { text: 'Cancel', style: 'cancel', onPress: clearError },
            { text: 'Retry', onPress: () => stopRecording() }
          ]
        );
        // Don't reset recording state on upload error - allow retry
        return;
      }

      console.log('Recording uploaded successfully. URL:', audioUrl);

      // Create recording record in database
      console.log('Creating recording record in database...');
      const { data: recordingRecord, error: dbError } = await createRecordingRecord({
        id: recordingId,
        user_id: user.id,
        game_session_id: activeSession?.id ?? null,
        audio_url: audioUrl,
        duration: recordingDuration,
        timestamp: timestamp,
        manual_notes: selectedSet
          ? serializeRecordingNotes('', getSelectedSetMarker())
          : undefined,
      });

      if (dbError || !recordingRecord) {
        console.error('Database error:', dbError);
        const dbErrorMsg = getErrorMessage(
          dbError,
          'Your recording was uploaded, but there was an issue saving it to the database. The audio file is safe.'
        );
        // Don't set error state for database errors - file is uploaded
        Alert.alert(
          'Recording Saved',
          dbErrorMsg,
          [{ text: 'OK' }]
        );
      } else {
        console.log('Recording record created successfully:', recordingRecord);
        
        // Start transcribing the recording in the background
        // Labels will be generated when the game ends
        setIsProcessing(true);
        processRecording(recordingId, user.id)
          .then((result) => {
            setIsProcessing(false);
            if (result.success) {
              console.log('✅ Recording transcribed successfully!');
              console.log('Transcription:', result.transcription?.substring(0, 100));
              
              // Silent success - labels will be generated when game ends
              // No alert needed to avoid interrupting the user
            } else {
              console.error('⚠️ Recording transcription failed:', result.error);
              // Don't show error alert - processing is a background task
              // The recording is still saved and usable
            }
          })
          .catch((error) => {
            setIsProcessing(false);
            console.error('❌ Unexpected error during transcription:', error);
            // Don't show error alert - processing is a background task
          });
      }

      // Create recording object for local state
      const newRecording = {
        id: recordingId,
        created_at: timestamp,
        duration: recordingDuration,
        audio_url: audioUrl,
        game_session_id: activeSession?.id ?? null,
        game_session: activeSession
          ? {
              opponent_name: activeSession.opponentName,
              date: activeSession.date.toISOString(),
            }
          : {
              opponent_name: 'Current Game',
              date: timestamp,
            },
      };

      // Reset recording reference
      recordingRef.current = null;
      setIsRecording(false);
      setSelectedSetOffsetSeconds(null);
      setCurrentRecording(newRecording);
      setIsLoading(false);
      clearError(); // Clear errors on success

    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsLoading(false);
      const errorMsg = getErrorMessage(error, 'Failed to save recording. Please try again.');
      setError(errorMsg);
      Alert.alert(
        'Recording Error',
        errorMsg,
        [{ text: 'OK', onPress: clearError }]
      );
      
      // Reset state even on error
      recordingRef.current = null;
      setIsRecording(false);
      setSelectedSetOffsetSeconds(null);
    }
  };

  const handleRecordPress = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      if (!activeSession) {
        if (Platform.OS === 'web') {
          const confirmed = window.confirm('Please add opponent, date, and match type before recording. Go to Set Details?');
          if (confirmed) router.push('/(tabs)/record-details');
        } else {
          Alert.alert(
            'Add game details',
            'Please add opponent, date, and match type before recording.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Set Details',
                onPress: () => router.push('/(tabs)/record-details'),
              },
            ]
          );
        }
        return;
      }
      await startRecording();
    }
  };

  const endGameAndNavigate = async () => {
    if (isRecording) {
      await stopRecording();
    }
    
    if (activeSession?.id && user?.id) {
      setTimeout(() => {
        generateLabelsForGameSession(activeSession.id, user.id)
          .then((result) => {
            if (result.success && result.processedCount > 0) {
              if (Platform.OS !== 'web') {
                Alert.alert(
                  'Labels Generated',
                  `Successfully generated labels for ${result.processedCount} recording${result.processedCount !== 1 ? 's' : ''}!`,
                  [{ text: 'OK' }]
                );
              }
            }
          })
          .catch(() => {});
      }, 10000);
    }
    
    resetSessionDetails();
    router.push('/(tabs)/review');
  };

  const handleDonePress = () => {
    if (isLoading) return;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('End game recordings? You will not be able to record anymore for this game.');
      if (confirmed) {
        endGameAndNavigate();
      }
      return;
    }

    Alert.alert(
      'End game recordings?',
      'You will not be able to record anymore for this game.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Game',
          style: 'destructive',
          onPress: endGameAndNavigate,
        },
      ]
    );
  };

  // Helper function to format error messages
  const getErrorMessage = (error, defaultMessage) => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Permission errors
      if (message.includes('permission') || message.includes('denied')) {
        return 'Microphone permission is required. Please enable it in Settings.';
      }
      
      // Network/upload errors
      if (message.includes('network') || message.includes('fetch') || message.includes('upload')) {
        return 'Network error. Please check your connection and try again.';
      }
      
      // Storage errors
      if (message.includes('storage') || message.includes('bucket')) {
        return 'Storage error. Please try again or contact support.';
      }
      
      // Database errors
      if (message.includes('database') || message.includes('insert') || message.includes('constraint')) {
        return 'Database error. Your recording may have been saved but not registered.';
      }
      
      // Authentication errors
      if (message.includes('auth') || message.includes('login') || message.includes('session')) {
        return 'Authentication error. Please log in again.';
      }
      
      // File read errors
      if (message.includes('read') || message.includes('file') || message.includes('empty')) {
        return 'Could not read recording file. Please try recording again.';
      }
      
      return error.message || defaultMessage;
    }
    
    return defaultMessage;
  };

  // Clear error when user starts a new action
  const clearError = () => {
    setError(null);
  };

  const getStatusText = () => {
    switch (status) {
      case 'granted':
        return null; // Don't show status when granted
      case 'denied':
        return '❌ Microphone permission denied';
      case 'undetermined':
        return '⏳ Microphone permission not requested';
      default:
        return null;
    }
  };

  const resetSessionDetails = () => {
    clearActiveSession();
  };

  const getSelectedSetMarker = () => {
    if (!selectedSet) return [];
    const offsetSeconds = selectedSetOffsetSeconds ?? 0;
    return [
      {
        label: selectedSet,
        offsetSeconds: offsetSeconds,
        createdAt: new Date().toISOString(),
      },
    ];
  };

  return (
    <ThemedView style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="chevron-left" size={32} color={iconColor} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDonePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ThemedText style={styles.doneButtonText}>Done</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Current Game Session Display */}
      <View style={styles.gameSessionSection}>
        <ThemedText style={styles.sectionLabel}>Current Game Session</ThemedText>
        <ActiveSessionIndicator session={activeSession} />
      </View>

      <View style={styles.markerSection}>
        <ThemedText style={styles.markerLabel}>Select set</ThemedText>
        <View style={styles.markerButtons}>
          {['Set 1', 'Set 2', 'Set 3', 'Set 4', 'Set 5'].map((label) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.markerButton,
                selectedSet === label && styles.markerButtonActive,
              ]}
              onPress={() => setSelectedSet(label)}
            >
              <ThemedText
                style={[
                  styles.markerButtonText,
                  selectedSet === label && styles.markerButtonTextActive,
                ]}
              >
                {label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        <ThemedText style={styles.markerHint}>
          {selectedSet ? `Selected: ${selectedSet}` : 'Pick a set before recording'}
        </ThemedText>
      </View>

      {/* Record Button Section - Centered and Large */}
      <View style={styles.recordSection}>
        {status !== 'granted' && (
          <View style={styles.permissionSection}>
            <ThemedText style={styles.permissionStatus}>
              {getStatusText()}
            </ThemedText>
            
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={() => {
                clearError();
                requestPermission();
              }}
              disabled={isPermissionLoading}
            >
              {isPermissionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.permissionButtonText}>
                  Request Microphone Permission
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {/* Error Message Display */}
        {error && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>
              {error}
            </ThemedText>
            <TouchableOpacity
              onPress={clearError}
              style={styles.errorDismissButton}
            >
              <MaterialIcons name="close" size={20} color={iconColor} />
            </TouchableOpacity>
          </View>
        )}

        <RecordButton
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          onPress={handleRecordPress}
          disabled={status !== 'granted' || isLoading}
        />
        
        {isLoading && (
          <ActivityIndicator
            size="small"
            style={styles.loadingIndicator}
          />
        )}
        
        {isRecording && (
          <ThemedText style={styles.recordingHint}>
            Tap to stop recording
          </ThemedText>
        )}
        {!isRecording && status === 'granted' && !error && (
          <ThemedText style={styles.recordingHint}>
            Tap to start recording
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  gameSessionSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
    marginBottom: 12,
  },
  recordSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  permissionSection: {
    marginBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  permissionStatus: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingHint: {
    marginTop: 24,
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  loadingIndicator: {
    marginTop: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    maxWidth: '90%',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
    marginRight: 8,
  },
  errorDismissButton: {
    padding: 4,
  },
  markerSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    gap: 10,
  },
  markerLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  markerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  markerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
  },
  markerButtonActive: {
    backgroundColor: '#2F80ED',
    borderColor: '#2F80ED',
  },
  markerButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  markerButtonTextActive: {
    color: '#fff',
  },
});
