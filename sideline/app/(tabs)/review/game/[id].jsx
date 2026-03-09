import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteRecordingForUser,
  fetchRecordingsForGame,
  parseRecordingNotes,
  createSignedRecordingUrl,
  saveRecordingNotes,
  serializeRecordingNotes,
} from '@/lib/recording';
import { generateMissingLabels } from '@/lib/recordingProcessing';
import {
  parseAiLabels,
  SKILL_CATEGORY_LABELS,
  POSITION_LABELS,
  FEEDBACK_TYPE_LABELS,
} from '@/lib/volleyballVocabulary';

export default function GameRecordingsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Audio playback state
  const [playingRecordingId, setPlayingRecordingId] = useState(null);
  const [sound, setSound] = useState(null);
  const soundRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(null);
  const [positionMs, setPositionMs] = useState(0);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekingValue, setSeekingValue] = useState(null);
  const wasPlayingRef = useRef(false);
  const isSeekingRef = useRef(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const currentRecordingIdRef = useRef(null);
  const isLoadingAudioRef = useRef(false);
  const [editingNotes, setEditingNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [playerExpanded, setPlayerExpanded] = useState(true);
  const [transcriptionScrollIndicator, setTranscriptionScrollIndicator] = useState({
    show: false,
    height: 0,
    top: 0,
  });
  const transcriptionScrollRef = useRef(null);
  const transcriptionContentSize = useRef({ height: 0, width: 0 });
  const transcriptionLayoutHeight = useRef(0);
  const [isScrollingTranscription, setIsScrollingTranscription] = useState(false);
  const modalScrollRef = useRef(null);
  const [generatingLabels, setGeneratingLabels] = useState(false);
  const gameId = useMemo(() => {
    if (Array.isArray(id)) return id[0];
    return id;
  }, [id]);

  const loadRecordings = useCallback(async () => {
    if (!user?.id || !gameId) {
      setLoading(false);
      setRecordings([]);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await fetchRecordingsForGame(
      user.id,
      gameId
    );

    if (fetchError) {
      setError(fetchError.message);
    } else {
      // Sort recordings chronologically (oldest to newest)
      const sortedData = (data ?? []).sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateA - dateB;
      });
      setRecordings(sortedData);
    }

    setLoading(false);
  }, [user?.id, gameId]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  useFocusEffect(
    useCallback(() => {
      loadRecordings();
    }, [loadRecordings])
  );

  // Initialize editing notes when modal opens
  useEffect(() => {
    if (modalVisible && selectedRecording) {
      const { notes } = parseRecordingNotes(selectedRecording.manual_notes ?? null);
      setEditingNotes(notes);
      setOriginalNotes(notes); // Track original to detect changes
    }
  }, [modalVisible, selectedRecording]);

  // Set up audio mode on mount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (err) {
        console.error('Error setting audio mode:', err);
      }
    };
    
    setupAudio();
    
    return () => {
      // Cleanup on unmount
      isLoadingAudioRef.current = false;
      currentRecordingIdRef.current = null;
      
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => undefined);
        soundRef.current.unloadAsync().catch(() => undefined);
        soundRef.current = null;
      }
    };
  }, []);

  const stopAndUnloadAudio = async () => {
    // Clear the current recording ref immediately to prevent callbacks
    const wasLoaded = soundRef.current !== null;
    currentRecordingIdRef.current = null;
    
    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          // Stop first, then unload
          if (status.isPlaying) {
            await soundRef.current.stopAsync();
          }
          await soundRef.current.unloadAsync();
        }
      } catch (err) {
        console.error('Error stopping audio:', err);
        // Force unload even if there's an error
        try {
          await soundRef.current.unloadAsync();
        } catch (unloadErr) {
          console.error('Error force unloading:', unloadErr);
        }
      }
      soundRef.current = null;
    }
    
    // Reset all audio state
    setSound(null);
    setIsPlaying(false);
    setPositionMs(0);
    setDurationMs(null);
    
    // If we actually stopped something, add a small delay for cleanup
    if (wasLoaded) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  const loadAudio = async (recording) => {
    // Prevent multiple simultaneous loads
    if (isLoadingAudioRef.current) {
      console.log('Already loading audio, skipping');
      return;
    }

    try {
      isLoadingAudioRef.current = true;
      setLoadingAudio(true);
      
      // Stop and unload previous sound completely - wait for it to finish
      await stopAndUnloadAudio();
      
      // Small delay to ensure previous audio is fully stopped
      await new Promise(resolve => setTimeout(resolve, 100));

      // Set the active recording ID before loading
      const recordingId = recording.id;
      currentRecordingIdRef.current = recordingId;
      setPlayingRecordingId(recordingId);

      // Create signed URL for private storage access
      console.log('Creating signed URL for audio_url:', recording.audio_url);
      const { url: signedUrl, error: signedError } = await createSignedRecordingUrl(
        recording.audio_url
      );

      console.log('Signed URL result:', { signedUrl, signedError });

      if (signedError || !signedUrl) {
        console.error('Error creating signed URL:', signedError);
        console.error('Recording audio_url was:', recording.audio_url);
        Alert.alert('Error', 'Failed to access audio file. Please try again.');
        setLoadingAudio(false);
        isLoadingAudioRef.current = false;
        setPlayingRecordingId(null);
        currentRecordingIdRef.current = null;
        return;
      }

      // Check if user switched recordings during the delay
      if (currentRecordingIdRef.current !== recordingId) {
        setLoadingAudio(false);
        isLoadingAudioRef.current = false;
        return;
      }

      console.log('Loading audio from signed URL:', signedUrl);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: signedUrl },
        { shouldPlay: false }, // Load but don't auto-play
        (status) => {
          // Only update state if this is still the active recording
          if (currentRecordingIdRef.current !== recordingId) {
            return;
          }
          
          if (!status.isLoaded) {
            if (status.error) {
              console.error('Audio status error:', status.error);
              console.error('Failed to load audio from URL:', signedUrl);
            }
            return;
          }
          
          setIsPlaying(status.isPlaying);
          if (!isSeekingRef.current) {
            setPositionMs(status.positionMillis ?? 0);
          }
          setDurationMs(status.durationMillis ?? null);
          
          // Auto-stop when finished
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPositionMs(0);
            setPlayingRecordingId(null);
            currentRecordingIdRef.current = null;
          }
        }
      );
      console.log('Audio loaded successfully');

      // Check if user switched recordings while we were loading
      if (currentRecordingIdRef.current !== recordingId) {
        await newSound.unloadAsync();
        setLoadingAudio(false);
        isLoadingAudioRef.current = false;
        return;
      }

      soundRef.current = newSound;
      setSound(newSound);
      
      // Expand player when loading new audio
      setPlayerExpanded(true);
      
      // Now play the audio
      await newSound.playAsync();
      setIsPlaying(true);
    } catch (err) {
      console.error('Error loading audio:', err);
      Alert.alert('Error', 'Failed to load audio file');
      setPlayingRecordingId(null);
      currentRecordingIdRef.current = null;
      await stopAndUnloadAudio();
    } finally {
      setLoadingAudio(false);
      isLoadingAudioRef.current = false;
    }
  };

  const handleTogglePlay = async (recording) => {
    // Prevent multiple rapid clicks
    if (isLoadingAudioRef.current) {
      return;
    }

    try {
      // If clicking on a different recording, stop current and load new one
      if (playingRecordingId !== recording.id) {
        // First stop the current audio completely
        await stopAndUnloadAudio();
        setPlayingRecordingId(null);
        
        // Then load and play the new one
        await loadAudio(recording);
        return;
      }

      // Otherwise toggle play/pause for current recording
      if (!sound) {
        await loadAudio(recording);
        return;
      }
      
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        // If sound is not loaded properly, reload it
        await stopAndUnloadAudio();
        await loadAudio(recording);
        return;
      }
      
      if (status.isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
      setIsPlaying(false);
      // If there's an error, try to clean up
      await stopAndUnloadAudio();
    }
  };

  const handleSeekStart = async () => {
    if (!sound) return;
    wasPlayingRef.current = isPlaying;
    setIsSeeking(true);
    isSeekingRef.current = true;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await sound.pauseAsync();
      }
    } catch (err) {
      console.error('Error seeking:', err);
    }
  };

  const handleSeekComplete = async (value) => {
    if (!sound) return;
    try {
      await sound.setPositionAsync(Math.floor(value));
      setPositionMs(Math.floor(value));
      if (wasPlayingRef.current) {
        await sound.playAsync();
      }
    } catch (err) {
      console.error('Error seeking:', err);
    } finally {
      setIsSeeking(false);
      isSeekingRef.current = false;
      setSeekingValue(null);
    }
  };


  const executeDeleteRecording = async (recording) => {
    if (playingRecordingId === recording.id) {
      await stopAndUnloadAudio();
      setPlayingRecordingId(null);
    }

    const { error: deleteError } = await deleteRecordingForUser(
      user.id,
      recording.id,
      recording.audio_url
    );

    if (deleteError) {
      if (Platform.OS === 'web') window.alert('Delete failed: ' + deleteError.message);
      else Alert.alert('Delete failed', deleteError.message);
      return;
    }

    setRecordings((prev) => prev.filter((item) => item.id !== recording.id));
  };

  const handleDelete = (recording) => {
    if (!user?.id) return;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Delete recording? This will permanently remove the audio file and its notes.');
      if (confirmed) executeDeleteRecording(recording);
      return;
    }

    Alert.alert(
      'Delete recording?',
      'This will permanently remove the audio file and its notes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => executeDeleteRecording(recording),
        },
      ]
    );
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cleanLabel = (text) => {
    if (!text) return '';
    let cleaned = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
    cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
    cleaned = cleaned.replace(/\s+in\s+(volleyball|basketball|soccer|football|baseball|tennis|hockey)$/gi, '').trim();
    return cleaned;
  };

  /** Normalize bucket value: null/empty = "Any"; literal "other" = "Other"; else label from map or raw value */
  const bucketDisplay = (value, labelsMap) => {
    if (value == null || value === '' || String(value).toLowerCase() === 'null') return 'Any';
    if (String(value).toLowerCase() === 'other') return 'Other';
    return labelsMap[value] ?? value;
  };

  /** Parse ai_labels (plain or JSON) and return display label + volleyball metadata for UI */
  const getRecordingLabelInfo = (recording) => {
    const parsed = parseAiLabels(recording?.ai_labels ?? null);
    const displayLabel = cleanLabel(parsed.displayLabel) || 'Untitled Recording';
    const skillLabel = bucketDisplay(parsed.skillCategory, SKILL_CATEGORY_LABELS);
    const positionLabel = bucketDisplay(parsed.position, POSITION_LABELS);
    const feedbackLabel = bucketDisplay(parsed.feedbackType, FEEDBACK_TYPE_LABELS);
    return {
      displayLabel,
      skillLabel,
      positionLabel,
      feedbackLabel,
      playPattern: parsed.playPattern,
      ruleNote: parsed.ruleNote ?? null,
    };
  };

  const handleBackPress = async () => {
    // Stop and clean up any playing audio before navigating back
    if (playingRecordingId && soundRef.current) {
      await stopAndUnloadAudio();
      setPlayingRecordingId(null);
    }
    // Navigate to home screen instead of just going back
    router.push('/(tabs)');
  };

  const handleSaveNotes = async () => {
    if (!user?.id || !selectedRecording) return;

    // Only save if notes have actually changed
    if (editingNotes === originalNotes) {
      setSavingNotes(false);
      return;
    }

    try {
      setSavingNotes(true);
      const { setMarkers } = parseRecordingNotes(selectedRecording.manual_notes ?? null);
      const serializedNotes = serializeRecordingNotes(editingNotes, setMarkers);
      
      const { error } = await saveRecordingNotes(
        user.id,
        selectedRecording.id,
        serializedNotes
      );

      if (error) {
        Alert.alert('Error', 'Failed to save notes');
        return;
      }

      // Update the local recording data
      setRecordings((prev) =>
        prev.map((rec) =>
          rec.id === selectedRecording.id
            ? { ...rec, manual_notes: serializedNotes }
            : rec
        )
      );

      // Update selected recording and original notes after successful save
      setOriginalNotes(editingNotes);
      setSelectedRecording((prev) =>
        prev ? { ...prev, manual_notes: serializedNotes } : prev
      );
    } catch (err) {
      console.error('Error saving notes:', err);
      Alert.alert('Error', 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleTranscriptionScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const contentHeight = contentSize.height;
    const scrollViewHeight = layoutMeasurement.height;
    
    // Store for drag calculations
    transcriptionContentSize.current = contentSize;
    transcriptionLayoutHeight.current = scrollViewHeight;
    
    // Always show scrollbar
    if (contentHeight > scrollViewHeight) {
      // Content is scrollable - show proportional scrollbar
      const indicatorHeight = Math.max(
        (scrollViewHeight / contentHeight) * scrollViewHeight,
        40
      );
      const scrollPercentage = contentOffset.y / (contentHeight - scrollViewHeight);
      const maxIndicatorTop = scrollViewHeight - indicatorHeight;
      const indicatorTop = scrollPercentage * maxIndicatorTop;
      
      setTranscriptionScrollIndicator({
        show: true,
        height: indicatorHeight,
        top: indicatorTop,
      });
    } else {
      // Content is NOT scrollable - hide scrollbar or show minimal
      setTranscriptionScrollIndicator({
        show: false,
        height: 0,
        top: 0,
      });
    }
  };

  const handleScrollbarPress = (event) => {
    if (!transcriptionScrollRef.current) return;
    
    const { locationY } = event.nativeEvent;
    const contentHeight = transcriptionContentSize.current.height;
    const scrollViewHeight = transcriptionLayoutHeight.current;
    
    if (contentHeight <= scrollViewHeight) return; // No scrolling needed
    
    // Calculate scroll position based on tap location
    const scrollPercentage = locationY / scrollViewHeight;
    const maxScrollOffset = contentHeight - scrollViewHeight;
    const targetOffset = scrollPercentage * maxScrollOffset;
    
    // Scroll to the calculated position
    transcriptionScrollRef.current.scrollTo({
      y: Math.max(0, Math.min(targetOffset, maxScrollOffset)),
      animated: true,
    });
  };

  // PanResponder for scrollbar dragging
  const scrollbarPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        
        onPanResponderGrant: (evt) => {
          // User touched the scrollbar
          setIsScrollingTranscription(true);
          handleScrollbarPress(evt);
        },
        
        onPanResponderMove: (evt, gestureState) => {
          if (!transcriptionScrollRef.current) return;
          
          const contentHeight = transcriptionContentSize.current.height;
          const scrollViewHeight = transcriptionLayoutHeight.current;
          
          if (contentHeight <= scrollViewHeight) return;
          
          // Calculate scroll position based on current touch Y position
          const touchY = evt.nativeEvent.locationY;
          const scrollPercentage = Math.max(0, Math.min(1, touchY / scrollViewHeight));
          const maxScrollOffset = contentHeight - scrollViewHeight;
          const targetOffset = scrollPercentage * maxScrollOffset;
          
          // Scroll immediately (not animated for smooth dragging)
          transcriptionScrollRef.current.scrollTo({
            y: Math.max(0, Math.min(targetOffset, maxScrollOffset)),
            animated: false,
          });
        },
        
        onPanResponderRelease: () => {
          // User released the scrollbar
          setTimeout(() => setIsScrollingTranscription(false), 100);
        },
      }),
    []
  );

  const handleGenerateLabels = async () => {
    if (!user || !gameId) return;
    
    setGeneratingLabels(true);
    try {
      const result = await generateMissingLabels(user.id, gameId);
      
      if (result.error) {
        Alert.alert('Error', 'Failed to generate recording names. Please try again.');
      } else if (result.processedCount === 0 && result.failedCount === 0) {
        Alert.alert('No Recordings', 'No recordings with transcriptions found in this game.');
      } else {
        Alert.alert(
          'Names Generated',
          `Successfully generated ${result.processedCount} recording name${result.processedCount !== 1 ? 's' : ''} for this game.${result.failedCount > 0 ? ` ${result.failedCount} failed.` : ''}`
        );
        // Reload recordings to show new labels
        await loadRecordings();
      }
    } catch (error) {
      console.error('Error generating labels:', error);
      Alert.alert('Error', 'An unexpected error occurred while generating labels.');
    } finally {
        setGeneratingLabels(false);
      }
  };

  const renderRecordingItem = ({ item }) => {
    const { setMarkers } = parseRecordingNotes(item.manual_notes ?? null);
    const isCurrentlyPlaying = playingRecordingId === item.id;
    const showPlayer = isCurrentlyPlaying && playerExpanded;
    const sliderValue = isSeeking && isCurrentlyPlaying ? (seekingValue ?? positionMs) : positionMs;
    const sliderMax = durationMs ?? 1;
    
    return (
      <View
        style={[
          styles.recordingItem,
          {
            backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
            borderColor: isCurrentlyPlaying 
              ? Colors[colorScheme ?? 'light'].tint 
              : (colorScheme === 'dark' ? '#3A3A3A' : '#E5E5E5'),
            borderWidth: isCurrentlyPlaying ? 2 : 1,
          },
        ]}
      >
        {/* Main content area */}
        <TouchableOpacity
          style={styles.recordingMainContent}
          onPress={() => handleTogglePlay(item)}
          activeOpacity={0.7}
        >
          {/* Play button */}
          <View style={[
            styles.iconContainer,
            isCurrentlyPlaying && { backgroundColor: 'rgba(30, 144, 255, 0.2)' }
          ]}>
            {loadingAudio && isCurrentlyPlaying ? (
              <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].tint} />
            ) : (
              <IconSymbol
                name={isCurrentlyPlaying && isPlaying ? 'pause.fill' : 'play.fill'}
                size={24}
                color={Colors[colorScheme ?? 'light'].tint}
              />
            )}
          </View>
          
          {/* Recording info */}
          <View style={styles.recordingInfo}>
            {(() => {
              const labelInfo = getRecordingLabelInfo(item);
              return (
                <>
                  <ThemedText style={styles.recordingTitle} numberOfLines={2}>
                    {labelInfo.displayLabel}
                  </ThemedText>
                  {(labelInfo.skillLabel || labelInfo.positionLabel || labelInfo.feedbackLabel) ? (
                    <View style={styles.volleyballChipsRow}>
                      <View style={[styles.volleyballChip, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E8E8E8' }]}>
                        <ThemedText style={styles.volleyballChipText}>{labelInfo.skillLabel}</ThemedText>
                      </View>
                      <View style={[styles.volleyballChip, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E8E8E8' }]}>
                        <ThemedText style={styles.volleyballChipText}>{labelInfo.positionLabel}</ThemedText>
                      </View>
                      <View style={[styles.volleyballChip, { backgroundColor: colorScheme === 'dark' ? '#333' : '#E8E8E8' }]}>
                        <ThemedText style={styles.volleyballChipText}>{labelInfo.feedbackLabel}</ThemedText>
                      </View>
                    </View>
                  ) : null}
                </>
              );
            })()}
            {setMarkers.length > 0 && (
              <View style={styles.markerRow}>
                <ThemedText style={styles.markerText}>
                  {setMarkers
                    .map((marker) => marker.label)
                    .join(' • ')}
                </ThemedText>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        {/* Delete button - top right */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol
            name="trash"
            size={20}
            color={colorScheme === 'dark' ? '#FF6B6B' : '#D32F2F'}
          />
        </TouchableOpacity>
        
        {/* Edit button - right side, below delete button */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setSelectedRecording(item);
            setModalVisible(true);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Edit recording"
        >
          <IconSymbol
            name="pencil"
            size={20}
            color={Colors[colorScheme ?? 'light'].tint}
          />
        </TouchableOpacity>
        
        {/* Audio player controls (shown when playing and expanded) */}
        {isCurrentlyPlaying && (
          <View style={styles.playerControlsContainer}>
            {playerExpanded ? (
              <View style={styles.playerControls}>
                <View style={styles.playerHeader}>
                  <ThemedText style={styles.timeText}>
                    {formatTime(positionMs)} / {formatTime(durationMs ?? 0)}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => setPlayerExpanded(false)}
                    style={styles.collapseButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol
                      name="chevron.up"
                      size={20}
                      color={Colors[colorScheme ?? 'light'].tint}
                    />
                  </TouchableOpacity>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={sliderMax}
                  value={sliderValue}
                  onSlidingStart={handleSeekStart}
                  onValueChange={(value) => setSeekingValue(value)}
                  onSlidingComplete={handleSeekComplete}
                  minimumTrackTintColor={Colors[colorScheme ?? 'light'].tint}
                  maximumTrackTintColor={colorScheme === 'dark' ? '#444' : '#DDD'}
                  thumbTintColor={Colors[colorScheme ?? 'light'].tint}
                  disabled={!sound || !durationMs}
                />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setPlayerExpanded(true)}
                style={styles.collapsedPlayer}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.collapsedText}>
                  {formatTime(positionMs)} / {formatTime(durationMs ?? 0)}
                </ThemedText>
                <IconSymbol
                  name="chevron.down"
                  size={20}
                  color={Colors[colorScheme ?? 'light'].tint}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const headerTitle =
    recordings[0]?.game_sessions?.opponent_name
      ? `vs. ${recordings[0]?.game_sessions?.opponent_name}`
      : 'Game Recordings';

  const openMatchReflection = () => {
    router.push({ pathname: '/(tabs)/review/game/summary/[id]', params: { id: gameId } });
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <IconSymbol
            name="chevron.left"
            size={28}
            color={Colors[colorScheme ?? 'light'].text}
          />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title} numberOfLines={1}>
          {headerTitle}
        </ThemedText>
        <TouchableOpacity
          style={styles.headerRightButton}
          onPress={openMatchReflection}
          activeOpacity={0.7}
          accessibilityLabel="Post-Game Summary"
        >
          <IconSymbol
            name="doc.text"
            size={32}
            color={Colors[colorScheme ?? 'light'].tint}
          />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
          <ThemedText style={styles.loadingText}>Loading recordings...</ThemedText>
        </View>
      )}

      {!loading && error && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={loadRecordings}>
            <ThemedText style={[styles.retryButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>
              Retry
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && recordings.length === 0 && (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyTitle}>No recordings for this game</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Recordings will appear here after you finish a session.
          </ThemedText>
        </View>
      )}

      {!loading && !error && recordings.length > 0 && (
        <>
          {/* Button: generate labels */}
          <View style={styles.generateLabelsContainer}>
            <TouchableOpacity
              style={[
                styles.generateLabelsButton,
                { backgroundColor: Colors[colorScheme ?? 'light'].tint }
              ]}
              onPress={handleGenerateLabels}
              disabled={generatingLabels}
              activeOpacity={0.7}
            >
              {generatingLabels ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <IconSymbol name="sparkles" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.generateLabelsButtonText}>
                    Generate Recording Names
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>

          <FlatList
            data={recordings}
            renderItem={renderRecordingItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
      )}

      {/* Recording Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          handleSaveNotes();
          setModalVisible(false);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={async () => {
            await handleSaveNotes();
            setModalVisible(false);
          }}
        >
          <View 
            onStartShouldSetResponder={() => true}
            style={[
              styles.modalContent,
              { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF' }
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle} numberOfLines={1}>
                {selectedRecording ? getRecordingLabelInfo(selectedRecording).displayLabel : 'Recording Details'}
              </ThemedText>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  onPress={async () => {
                    await handleSaveNotes();
                    setModalVisible(false);
                    if (selectedRecording?.id) router.push(`/(tabs)/review/${selectedRecording.id}`);
                  }}
                  style={styles.editDetailButton}
                >
                  <ThemedText style={[styles.editDetailButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>Edit</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    await handleSaveNotes();
                    setModalVisible(false);
                  }}
                  style={styles.closeButton}
                >
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={28}
                    color={colorScheme === 'dark' ? '#999' : '#666'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardAvoidingView}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
              <ScrollView 
                ref={modalScrollRef}
                style={styles.modalScroll} 
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={!isScrollingTranscription}
                nestedScrollEnabled={true}
                directionalLockEnabled={true}
              >
                {/* Transcription Section */}
                {selectedRecording?.transcription && (
                  <View style={styles.modalSection}>
                    <ThemedText style={styles.modalSectionTitle}>Transcription</ThemedText>
                    <View 
                      style={[
                        styles.transcriptionBox,
                        { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5' }
                      ]}
                    >
                      <ScrollView 
                        ref={transcriptionScrollRef}
                        style={styles.transcriptionScrollView}
                        contentContainerStyle={styles.transcriptionContent}
                        nestedScrollEnabled={true}
                        scrollEnabled={true}
                        showsVerticalScrollIndicator={false}
                        bounces={true}
                        scrollEventThrottle={16}
                        directionalLockEnabled={true}
                        onScroll={handleTranscriptionScroll}
                        onScrollBeginDrag={() => {
                          setIsScrollingTranscription(true);
                        }}
                        onScrollEndDrag={() => {
                          setIsScrollingTranscription(false);
                        }}
                        onMomentumScrollBegin={() => {
                          setIsScrollingTranscription(true);
                        }}
                        onMomentumScrollEnd={() => {
                          setIsScrollingTranscription(false);
                        }}
                        onTouchStart={() => {
                          setIsScrollingTranscription(true);
                        }}
                        onTouchEnd={() => {
                          setTimeout(() => setIsScrollingTranscription(false), 100);
                        }}
                        onLayout={(event) => {
                          transcriptionLayoutHeight.current = event.nativeEvent.layout.height;
                        }}
                        onContentSizeChange={(width, height) => {
                          transcriptionContentSize.current = { height, width };
                          const scrollViewHeight = transcriptionLayoutHeight.current || Math.min(height, 800);
                          handleTranscriptionScroll({
                            nativeEvent: {
                              contentOffset: { y: 0 },
                              contentSize: { height, width },
                              layoutMeasurement: { height: scrollViewHeight, width }
                            }
                          });
                        }}
                      >
                        <ThemedText style={styles.transcriptionText}>
                          {selectedRecording.transcription}
                        </ThemedText>
                      </ScrollView>
                      
                      {/* Custom Always-Visible Scrollbar */}
                      {transcriptionScrollIndicator.show && (
                        <View
                          {...scrollbarPanResponder.panHandlers}
                          style={styles.transcriptionScrollbarTrack}
                          collapsable={false}
                        >
                          <View
                            style={[
                              styles.transcriptionScrollbar,
                              {
                                height: transcriptionScrollIndicator.height,
                                top: transcriptionScrollIndicator.top,
                              }
                            ]}
                            pointerEvents="none"
                          />
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Manual Notes Section */}
                <View style={styles.modalSection}>
                  <View style={styles.notesSectionHeader}>
                    <ThemedText style={styles.modalSectionTitle}>Manual Notes</ThemedText>
                    {savingNotes && (
                      <View style={styles.savingIndicator}>
                        <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].tint} />
                        <ThemedText style={styles.savingText}>Saving...</ThemedText>
                      </View>
                    )}
                  </View>
                  <TextInput
                    style={[
                      styles.notesInput,
                      {
                        color: Colors[colorScheme ?? 'light'].text,
                        backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                      },
                    ]}
                    placeholder="Type your notes here..."
                    placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
                    value={editingNotes}
                    onChangeText={setEditingNotes}
                    multiline
                    scrollEnabled={false}
                    textAlignVertical="top"
                    onFocus={() => {
                      // Scroll to bottom when user taps on notes input
                      setTimeout(() => {
                        modalScrollRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                  />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableOpacity>
      </Modal>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    fontSize: 24,
    marginHorizontal: 8,
    textAlign: 'center',
  },
  headerRightButton: {
    padding: 10,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  recordingItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  recordingMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordingInfo: {
    flex: 1,
    paddingRight: 80,
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  volleyballChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 2,
  },
  volleyballChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  volleyballChipText: {
    fontSize: 12,
    opacity: 0.9,
  },
  markerRow: {
    marginTop: 6,
  },
  markerText: {
    fontSize: 12,
    opacity: 0.6,
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  editButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    padding: 4,
  },
  playerControlsContainer: {
    marginTop: 16,
  },
  playerControls: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  collapseButton: {
    padding: 4,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 30,
  },
  collapsedPlayer: {
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collapsedText: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.8,
  },
  separator: {
    height: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.6,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    paddingRight: 16,
    lineHeight: 24,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editDetailButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  editDetailButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    marginTop: -4,
  },
  keyboardAvoidingView: {
    flex: 1,
    maxHeight: '100%',
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalScrollContent: {
    paddingBottom: 200,
    paddingTop: 10,
  },
  modalSection: {
    marginTop: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  transcriptionBox: {
    position: 'relative',
    minHeight: 200,
    maxHeight: 800,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    overflow: 'hidden',
  },
  transcriptionScrollView: {
    flex: 1,
  },
  transcriptionContent: {
    padding: 16,
  },
  transcriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  transcriptionScrollbarTrack: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
    justifyContent: 'flex-start',
    zIndex: 1000,
  },
  transcriptionScrollbar: {
    position: 'absolute',
    right: 7,
    width: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    opacity: 1.0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
    pointerEvents: 'none',
  },
  notesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savingText: {
    fontSize: 12,
    opacity: 0.7,
  },
  notesInput: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    minHeight: 150,
    maxHeight: 300,
    fontSize: 15,
    lineHeight: 22,
  },
  generateLabelsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  generateLabelsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    minHeight: 44,
  },
  generateLabelsButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  statsSummaryBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
  },
  statsSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    opacity: 0.9,
  },
  statsSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  statsSummaryCol: {
    minWidth: 120,
  },
  statsSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.8,
  },
  statsSummaryItem: {
    fontSize: 13,
    marginBottom: 2,
  },
});
