import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteRecordingForUser,
  fetchRecordingById,
  saveRecordingNotes,
  parseRecordingNotes,
  serializeRecordingNotes,
} from '@/lib/recording';

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notes, setNotes] = useState('');
  const [setMarkers, setSetMarkers] = useState([]);
  const [error, setError] = useState(null);
  const lastSavedNotesRef = useRef('');
  const saveTimeoutRef = useRef | null>(null);

  const recordingId = useMemo(() => {
    if (Array.isArray(id)) return id[0];
    return id;
  }, [id]);

  useEffect(() => {
    const loadRecording = async () => {
      if (!user?.id || !recordingId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await fetchRecordingById(
        user.id,
        recordingId
      );

      if (fetchError) {
        setError(fetchError.message);
      } else if (!data) {
        setError('Recording not found.');
      } else {
        setRecording(data);
        const parsedNotes = parseRecordingNotes(data.manual_notes ?? null);
        setNotes(parsedNotes.notes);
        setSetMarkers(parsedNotes.setMarkers);
        lastSavedNotesRef.current = parsedNotes.notes;
      }

      setLoading(false);
    };

    loadRecording();
  }, [user?.id, recordingId]);

  useEffect(() => {
    if (!user?.id || !recordingId) return;
    if (notes === lastSavedNotesRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      const { error: saveError } = await saveRecordingNotes(
        user.id,
        recordingId,
        serializeRecordingNotes(notes, setMarkers)
      );
      setSaving(false);

      if (saveError) {
        Alert.alert('Save failed', saveError.message);
        return;
      }

      lastSavedNotesRef.current = notes;
      setRecording((prev) =>
        prev ? { ...prev, manual_notes: serializeRecordingNotes(notes, setMarkers) } : prev
      );
    }, 700);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes, setMarkers, user?.id, recordingId]);

  const handleDelete = () => {
    if (!user?.id || !recordingId || !recording) return;

    Alert.alert(
      'Delete recording?',
      'This will permanently remove the audio file and its notes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error: deleteError } = await deleteRecordingForUser(
              user.id,
              recordingId,
              recording.audio_url
            );
            setDeleting(false);

            if (deleteError) {
              Alert.alert('Delete failed', deleteError.message);
              return;
            }

            router.replace('/(tabs)/review');
          },
        },
      ]
    );
  };

  const removeEmojis = (text) => {
    if (!text) return '';
    // Remove emojis and other pictographs
    let cleaned = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
    // Remove quotation marks
    cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
    // Remove sport-related suffixes (e.g., "in Volleyball", "in volleyball")
    cleaned = cleaned.replace(/\s+in\s+(volleyball|basketball|soccer|football|baseball|tennis|hockey)$/gi, '').trim();
    return cleaned;
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <IconSymbol
            name="chevron.left"
            size={28}
            color={Colors[colorScheme ?? 'light'].text}
          />
          <ThemedText style={styles.backText}>Back</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={handleDelete}
          disabled={deleting || loading || !recording}
        >
          <IconSymbol
            name="trash"
            size={20}
            color={colorScheme === 'dark' ? '#FF6B6B' : '#D32F2F'}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
          <ThemedText style={styles.loadingText}>Loading recording...</ThemedText>
        </View>
      )}

      {!loading && error && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace(`/(tabs)/review/${recordingId}`)}
          >
            <ThemedText style={[styles.retryButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>
              Retry
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && recording && (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title - AI Label without emojis */}
          <ThemedText type="title" style={styles.title}>
            {recording.ai_labels ? removeEmojis(recording.ai_labels) : 'Recording'}
          </ThemedText>

          {/* Processing indicator */}
          {recording.status === 'new' && !recording.transcription && (
            <View style={[styles.processingCard, { backgroundColor: colorScheme === 'dark' ? '#1A2A1F' : '#F0FFF4' }]}>
              <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].tint} />
              <ThemedText style={styles.processingText}>
                Processing recording... Transcription and labeling in progress.
              </ThemedText>
            </View>
          )}

          {/* Transcription */}
          {recording.transcription && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Transcription</ThemedText>
              <View style={[styles.transcriptionCard, { backgroundColor: colorScheme === 'dark' ? '#1F1F1F' : '#FFFFFF' }]}>
                <ThemedText style={styles.transcriptionText}>{recording.transcription}</ThemedText>
              </View>
            </View>
          )}

          {/* Processing Status */}
          {recording.status && recording.status !== 'processed' && recording.status !== 'new' && (
            <View style={styles.section}>
              <View style={[styles.statusCard, { backgroundColor: colorScheme === 'dark' ? '#2A1F1F' : '#FFF5F5' }]}>
                <ThemedText style={[styles.statusText, { color: colorScheme === 'dark' ? '#FF9999' : '#D32F2F' }]}>
                  {recording.status === 'transcription_failed' && 'Transcription failed'}
                  {recording.status === 'label_failed' && 'Label generation failed (transcription available)'}
                  {!['transcription_failed', 'label_failed'].includes(recording.status) && `Status: ${recording.status}`}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Manual notes */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Manual notes</ThemedText>
            <TextInput
              style={[
                styles.notesInput,
                {
                  color: Colors[colorScheme ?? 'light'].text,
                  backgroundColor: colorScheme === 'dark' ? '#1F1F1F' : '#FFFFFF',
                },
              ]}
              placeholder="Add notes about this recording..."
              placeholderTextColor={colorScheme === 'dark' ? '#999' : '#999'}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            {saving && (
              <View style={styles.savingRow}>
                <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].tint} />
                <ThemedText style={styles.savingText}>Saving...</ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  deleteAction: {
    padding: 6,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 20,
  },
  title: {
    fontSize: 32,
    marginBottom: 4,
    paddingTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  notesInput: {
    minHeight: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    padding: 12,
    textAlignVertical: 'top',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingText: {
    fontSize: 13,
    opacity: 0.7,
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
  processingCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  transcriptionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  transcriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  statusCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
