import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated, ScrollView, StyleSheet, View, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { showAlert } from '@/lib/alert';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RecordButton } from '@/components/RecordButton';
import { ActiveSessionIndicator } from '@/components/ActiveSessionIndicator';
import { useAudioPermissions } from '@/hooks/use-audio-permissions';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSession } from '@/contexts/ActiveSessionContext';
import { useTutorial } from '@/contexts/TutorialContext';
import {
  uploadRecording,
  createRecordingRecord,
  deleteGameForUser,
  serializeRecordingNotes,
} from '@/lib/recording';
import { processRecording } from '@/lib/recordingProcessing';

export default function RecordScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeSession, clearActiveSession } = useActiveSession();
  const { isTutorialActive, registerTarget } = useTutorial();
  const { status, requestPermission, isLoading: isPermissionLoading } = useAudioPermissions();
  const iconColor = useThemeColor({}, 'icon');
  const recordButtonRef = useRef(null);
  
  // all the state we need to track while recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentRecording, setCurrentRecording] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);
  const [selectedSetOffsetSeconds, setSelectedSetOffsetSeconds] = useState(null);
  const [processingCount, setProcessingCount] = useState(0);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message: string } — the little popup banner
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);
  const isProcessing = processingCount > 0;

  // ref to the actual audio recorder object — survives re-renders
  const recordingRef = useRef(null);

  // configure the mic settings as soon as this screen loads
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

    // when we leave this screen, kill any recording still running
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(console.error);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isTutorialActive) return;
      const timer = setTimeout(() => {
        recordButtonRef.current?.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) registerTarget('record:recordButton', { x, y, width, height });
        });
      }, 700);
      return () => clearTimeout(timer);
    }, [isTutorialActive, registerTarget])
  );

  // ticks up every second while recording — like a stopwatch
  useEffect(() => {
    let interval = null;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      // reset the clock when we stop
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
      clearError(); // wipe old errors before starting fresh
      setSelectedSetOffsetSeconds(null);
      
      // ask for mic access if we don't have it yet
      if (status !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setIsLoading(false);
          const errorMsg = 'Microphone permission is required to record. Please enable it in Settings.';
          setError(errorMsg);
          showAlert(
            'Permission Required',
            errorMsg,
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // tell the OS we want to use the mic
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
        showAlert(
          'Audio Configuration Error',
          errorMsg,
          [{ text: 'OK' }]
        );
        return;
      }

      // spin up a new recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          // callback fires while recording is live
          if (status.isRecording) {
            // yep, we're rolling
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
      clearError(); // all good, clear any old error messages
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsLoading(false);
      const errorMsg = getErrorMessage(error, 'Failed to start recording. Please try again.');
      setError(errorMsg);
      showAlert(
        'Recording Error',
        errorMsg,
        [{ text: 'OK', onPress: clearError }]
      );
    }
  };

  const stopRecording = async () => {
    try {
      setIsLoading(true);
      clearError();

      if (!recordingRef.current) {
        setIsLoading(false);
        setError('No active recording found.');
        return;
      }

      if (!user?.id) {
        setIsLoading(false);
        setError('You must be logged in to save recordings.');
        return;
      }

      let uri = null;
      try {
        await recordingRef.current.stopAndUnloadAsync();
        uri = recordingRef.current.getURI();
      } catch (stopError) {
        console.error('Failed to stop recording:', stopError);
        showToast('error', 'Could not read recording file. Please try again.');
        recordingRef.current = null;
        setIsRecording(false);
        setIsLoading(false);
        return;
      }

      if (!uri) {
        showToast('error', 'Recording file not found. Please try again.');
        recordingRef.current = null;
        setIsRecording(false);
        setIsLoading(false);
        return;
      }

      let recordingId;
      try {
        recordingId = Crypto.randomUUID();
      } catch {
        recordingId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      }

      const capturedDuration = recordingDuration;
      const capturedSetMarkers = getSelectedSetMarker();
      const capturedSessionId = activeSession?.id ?? null;
      const capturedSession = activeSession
        ? { opponent_name: activeSession.opponentName, date: activeSession.date.toISOString() }
        : { opponent_name: 'Current Game', date: new Date().toISOString() };
      const timestamp = new Date().toISOString();

      recordingRef.current = null;
      setIsRecording(false);
      setSelectedSetOffsetSeconds(null);
      setIsLoading(false);
      clearError();

      showToast('success', 'Recording saved — uploading…');

      (async () => {
        try {
          const { url: audioUrl, error: uploadError } = await uploadRecording(
            user.id,
            recordingId,
            uri
          );

          if (uploadError || !audioUrl) {
            console.error('Upload error:', uploadError);
            showToast('error', 'Upload failed — recording will sync when connection returns.', 6000);
            return;
          }

          const { data: recordingRecord, error: dbError } = await createRecordingRecord({
            id: recordingId,
            user_id: user.id,
            game_session_id: capturedSessionId,
            audio_url: audioUrl,
            duration: capturedDuration,
            timestamp,
            manual_notes: capturedSetMarkers.length > 0
              ? serializeRecordingNotes('', capturedSetMarkers)
              : undefined,
          });

          if (dbError || !recordingRecord) {
            console.error('Database error:', dbError);
            showToast('error', 'Upload succeeded but database save failed. Recording is safe.', 6000);
            return;
          }

          showToast('success', 'Recording uploaded');

          setProcessingCount((count) => count + 1);
          processRecording(recordingId, user.id)
            .then((result) => {
              if (result.success) {
                showToast('success', 'Transcription complete');
              } else {
                console.error('Transcription failed:', result.error?.message);
              }
            })
            .catch((err) => {
              console.error('Transcription error:', err?.message);
            })
            .finally(() => {
              setProcessingCount((count) => Math.max(0, count - 1));
            });
        } catch (err) {
          console.error('Background upload error:', err);
          showToast('error', 'Upload failed — recording will sync when connection returns.', 6000);
        }
      })();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      showToast('error', 'Failed to save recording. Please try again.', 8000);
      recordingRef.current = null;
      setIsRecording(false);
      setSelectedSetOffsetSeconds(null);
      setIsLoading(false);
    }
  };

  const handleRecordPress = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      if (!activeSession) {
        showAlert(
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
        return;
      }
      if (!selectedSet) {
        showAlert('Select a set', 'Please select a set above before recording.');
        return;
      }
      await startRecording();
    }
  };

  const endGameAndNavigate = async () => {
    if (isRecording) {
      await stopRecording();
    }

    showToast('success', 'Processing recordings in background...');
    resetSessionDetails();
    router.push('/(tabs)/review');
  };

  const discardCurrentGameAndGoToDetails = async () => {
    try {
      setIsLoading(true);
      clearError();

      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
        recordingRef.current = null;
      }

      setIsRecording(false);
      setSelectedSet(null);
      setSelectedSetOffsetSeconds(null);
      setCurrentRecording(null);

      if (activeSession?.id && user?.id) {
        const { error: deleteError } = await deleteGameForUser(user.id, activeSession.id);
        if (deleteError) {
          console.error('Failed to delete discarded game session:', deleteError);
          showToast('error', 'Could not fully delete game session. It may still appear in Games.', 7000);
        }
      }

      clearActiveSession();
      router.replace('/(tabs)/record-details');
    } catch (error) {
      console.error('Failed to discard current game:', error);
      clearActiveSession();
      router.replace('/(tabs)/record-details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    if (isLoading) return;

    if (isRecording || activeSession?.id) {
      showAlert(
        'Discard this game?',
        'This will stop recording and delete this game session and any recordings from it.',
        [
          { text: 'Keep Game', style: 'cancel' },
          {
            text: 'Discard Game',
            style: 'destructive',
            onPress: discardCurrentGameAndGoToDetails,
          },
        ]
      );
      return;
    }

    router.replace('/(tabs)/record-details');
  };

  const handleDonePress = () => {
    if (isLoading) return;
    showAlert(
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

  // translates raw errors into human-friendly messages
  const getErrorMessage = (error, defaultMessage) => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // mic permission issues
      if (message.includes('permission') || message.includes('denied')) {
        return 'Microphone permission is required. Please enable it in Settings.';
      }
      
      // wifi went on vacation
      if (message.includes('network') || message.includes('fetch') || message.includes('upload')) {
        return 'Network error. Please check your connection and try again.';
      }
      
      // cloud storage hiccup
      if (message.includes('storage') || message.includes('bucket')) {
        return 'Storage error. Please try again or contact support.';
      }
      
      // database said no
      if (message.includes('database') || message.includes('insert') || message.includes('constraint')) {
        return 'Database error. Your recording may have been saved but not registered.';
      }
      
      // who are you again?
      if (message.includes('auth') || message.includes('login') || message.includes('session')) {
        return 'Authentication error. Please log in again.';
      }
      
      // can't read the recording file
      if (message.includes('read') || message.includes('file') || message.includes('empty')) {
        return 'Could not read recording file. Please try recording again.';
      }
      
      return error.message || defaultMessage;
    }
    
    return defaultMessage;
  };

  // reset errors so the user gets a clean slate
  const clearError = () => {
    setError(null);
  };

  const showToast = (type, message, durationMs = 5000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
    }, durationMs);
  };

  const getStatusText = () => {
    switch (status) {
      case 'granted':
        return null; // no need to show anything if we have permission
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
      {/* top nav bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleBackPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <IconSymbol name="chevron.left" size={32} color={iconColor} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDonePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ThemedText style={styles.doneButtonText}>Done</ThemedText>
        </TouchableOpacity>
      </View>

      {/* little toast popup for background task updates */}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === 'success' ? styles.toastSuccess : styles.toastError,
            { opacity: toastOpacity },
          ]}
        >
          <ThemedText style={styles.toastText}>
            {toast.type === 'success' ? '✅ ' : '⚠️ '}{toast.message}
          </ThemedText>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* transcription-in-progress banner */}
        {isProcessing && (
          <View style={styles.processingBanner}>
            <ActivityIndicator size="small" color="#5BA3F5" />
            <ThemedText style={styles.processingText}>Transcribing recording...</ThemedText>
          </View>
        )}

        {/* active game session info */}
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

        {/* the big record button — front and center */}
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
          
          {/* error banner with dismiss button */}
          {error && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>
                {error}
              </ThemedText>
              <TouchableOpacity
                onPress={clearError}
                style={styles.errorDismissButton}
              >
                <IconSymbol name="xmark" size={20} color={iconColor} />
              </TouchableOpacity>
            </View>
          )}

          <View ref={recordButtonRef} collapsable={false}>
            <RecordButton
              isRecording={isRecording}
              recordingDuration={recordingDuration}
              onPress={handleRecordPress}
              disabled={status !== 'granted' || isLoading}
            />
          </View>
          
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
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    minHeight: 320,
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
  toast: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  toastSuccess: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  toastError: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(91, 163, 245, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(91, 163, 245, 0.25)',
    marginBottom: 12,
  },
  processingText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
  },
});
