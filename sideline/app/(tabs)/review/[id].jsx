import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
  updateRecording,
} from '@/lib/recording';
import { parseAiLabels, serializeAiLabels, SKILL_CATEGORY_LABELS, POSITION_LABELS, FEEDBACK_TYPE_LABELS } from '@/lib/volleyballVocabulary';
import { fetchRosterForUser, getPlayerNamesForGameSession } from '@/lib/roster';
import { generateLabel } from '@/lib/labelGeneration';
import { getCustomBucketsForPrompt, getCustomBuckets, addCustomBucket, describeBucketWithAI } from '@/lib/customBuckets';
import { showAlert } from '@/lib/alert';

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editSkill, setEditSkill] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editFeedback, setEditFeedback] = useState('');
  const [taggedPlayerNames, setTaggedPlayerNames] = useState([]);
  const [roster, setRoster] = useState([]);
  const [savingField, setSavingField] = useState(null);
  const [fillingMetadata, setFillingMetadata] = useState(false);
  const [customBuckets, setCustomBuckets] = useState({ skill: [], position: [], feedback: [] });
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('skill');
  const [addingCategory, setAddingCategory] = useState(false);

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
        const parsed = parseAiLabels(data.ai_labels ?? null);
        setEditLabel(parsed.displayLabel ?? '');
        setEditSkill(parsed.skillCategory ?? '');
        setEditPosition(parsed.position ?? '');
        setEditFeedback(parsed.feedbackType ?? '');
        setTaggedPlayerNames(parsed.taggedPlayers ?? []);
      }

      setLoading(false);
    };

    loadRecording();
  }, [user?.id, recordingId]);

  useEffect(() => {
    if (!user?.id) return;
    fetchRosterForUser(user.id).then(({ data }) => setRoster(data ?? []));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    getCustomBuckets(user.id).then((buckets) => {
      const skill = buckets.filter((b) => b.type === 'skill').map((b) => b.name);
      const position = buckets.filter((b) => b.type === 'position').map((b) => b.name);
      const feedback = buckets.filter((b) => b.type === 'feedback').map((b) => b.name);
      setCustomBuckets({ skill, position, feedback });
    });
  }, [user?.id]);

  // When user opens Edit: if there's transcription but no/empty labels, run AI to pre-fill metadata
  useEffect(() => {
    if (!recording?.transcription?.trim() || !user?.id || !recordingId) return;
    const parsed = parseAiLabels(recording.ai_labels ?? null);
    if (parsed.displayLabel?.trim()) return; // already have labels

    let cancelled = false;
    setFillingMetadata(true);
    (async () => {
      const { names: playerNames } = recording.game_session_id
        ? await getPlayerNamesForGameSession(recording.game_session_id)
        : { names: [] };
      if (cancelled) return;
      const customBuckets = user?.id ? await getCustomBucketsForPrompt(user.id) : {};
      const result = await generateLabel(recording.transcription, { playerNames, customBuckets });
      if (cancelled || result.error || !result.label) {
        setFillingMetadata(false);
        return;
      }
      setEditLabel(result.label);
      if (result.skillCategory) setEditSkill(result.skillCategory);
      if (result.position) setEditPosition(result.position);
      if (result.feedbackType) setEditFeedback(result.feedbackType);
      const aiLabels = serializeAiLabels(result.label, {
        skillCategory: result.skillCategory ?? undefined,
        position: result.position ?? undefined,
        feedbackType: result.feedbackType ?? undefined,
      });
      await updateRecording(user.id, recordingId, { ai_labels: aiLabels });
      if (!cancelled) setRecording((p) => (p ? { ...p, ai_labels: aiLabels } : p));
      setFillingMetadata(false);
    })();
    return () => { cancelled = true; };
  }, [recording?.id, recording?.transcription, recording?.ai_labels, recording?.game_session_id, user?.id, recordingId]);

  const executeDelete = async () => {
    setDeleting(true);
    const { error: deleteError } = await deleteRecordingForUser(
      user.id,
      recordingId,
      recording.audio_url
    );
    setDeleting(false);

    if (deleteError) {
      if (Platform.OS === 'web') window.alert('Delete failed: ' + deleteError.message);
      else showAlert('Delete failed', deleteError.message);
      return;
    }

    router.replace('/(tabs)/review');
  };

  const handleDelete = () => {
    if (!user?.id || !recordingId || !recording) return;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Delete recording? This will permanently remove this recording.');
      if (confirmed) executeDelete();
      return;
    }

    showAlert(
      'Delete recording?',
      'This will permanently remove this recording.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: executeDelete,
        },
      ]
    );
  };

  const removeEmojis = (text) => {
    if (!text) return '';
    let cleaned = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
    cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
    cleaned = cleaned.replace(/\s+in\s+(volleyball|basketball|soccer|football|baseball|tennis|hockey)$/gi, '').trim();
    return cleaned;
  };

  const handleSaveLabels = async () => {
    if (!user?.id || !recordingId || !recording) return;
    setSavingField('labels');
    const parsed = parseAiLabels(recording.ai_labels ?? null);
    const aiLabels = serializeAiLabels(editLabel || parsed.displayLabel || 'Untitled', {
      skillCategory: editSkill === '' ? undefined : (editSkill || undefined),
      position: editPosition === '' ? undefined : (editPosition || undefined),
      playPattern: parsed.playPattern || undefined,
      feedbackType: editFeedback === '' ? undefined : (editFeedback || undefined),
      ruleNote: parsed.ruleNote || undefined,
      taggedPlayers: taggedPlayerNames.length ? taggedPlayerNames : (parsed.taggedPlayers?.length ? parsed.taggedPlayers : undefined),
    });
    const { error: err } = await updateRecording(user.id, recordingId, { ai_labels: aiLabels });
    setSavingField(null);
    if (err) showAlert('Save failed', err.message);
    else {
      setRecording((p) => (p ? { ...p, ai_labels: aiLabels } : p));
      const savedParsed = parseAiLabels(aiLabels);
      setEditLabel(savedParsed.displayLabel ?? editLabel);
      setEditSkill(savedParsed.skillCategory ?? '');
      setEditPosition(savedParsed.position ?? '');
      setEditFeedback(savedParsed.feedbackType ?? '');
      if (Array.isArray(savedParsed.taggedPlayers)) setTaggedPlayerNames(savedParsed.taggedPlayers);
      router.back();
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || !user?.id) return;
    setAddingCategory(true);
    try {
      const description = await describeBucketWithAI(name, editLabel || recording?.transcription?.slice(0, 200) || '');
      await addCustomBucket(user.id, name, newCategoryType, description);
      const buckets = await getCustomBuckets(user.id);
      const skill = buckets.filter((b) => b.type === 'skill').map((b) => b.name);
      const position = buckets.filter((b) => b.type === 'position').map((b) => b.name);
      const feedback = buckets.filter((b) => b.type === 'feedback').map((b) => b.name);
      setCustomBuckets({ skill, position, feedback });
      setNewCategoryName('');
      setAddCategoryModalVisible(false);
      showAlert('Category added', `"${name}" is saved and will appear in the ${newCategoryType} list for future recordings.`);
    } catch (e) {
      showAlert('Error', 'Could not save category. Please try again.');
    } finally {
      setAddingCategory(false);
    }
  };

  const toggleTaggedPlayer = (name) => {
    const next = taggedPlayerNames.includes(name)
      ? taggedPlayerNames.filter((n) => n !== name)
      : [...taggedPlayerNames, name];
    setTaggedPlayerNames(next);
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
          {/* Title - AI Label */}
          <ThemedText type="title" style={styles.title}>
            {recording.ai_labels ? removeEmojis(parseAiLabels(recording.ai_labels).displayLabel) || 'Recording' : 'Recording'}
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

          {/* Summary & categories (from transcription analysis) */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Edit Recording Name</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Title and categories are filled from the recording. You can change them below.
            </ThemedText>
            {fillingMetadata && (
              <View style={styles.fillingMetaRow}>
                <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].tint} />
                <ThemedText style={styles.fillingMetaText}>Filling from transcription…</ThemedText>
              </View>
            )}
            <TextInput
              style={[styles.labelInput, { color: Colors[colorScheme ?? 'light'].text, backgroundColor: colorScheme === 'dark' ? '#1F1F1F' : '#FFFFFF', borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}
              placeholder="Label"
              placeholderTextColor="#999"
              value={editLabel}
              onChangeText={setEditLabel}
            />
            <View style={styles.labelMetaRow}>
              <ThemedText style={styles.labelMetaLabel}>Skill</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {['', ...Object.keys(SKILL_CATEGORY_LABELS), ...customBuckets.skill, 'other'].map((s) => (
                  <TouchableOpacity key={s || '_'} style={[styles.metaChip, editSkill === s && { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} onPress={() => setEditSkill(s)}>
                    <ThemedText style={[styles.metaChipText, editSkill === s && { color: '#FFF' }]}>
                      {s === '' ? 'Any' : s === 'other' ? 'Other' : (SKILL_CATEGORY_LABELS[s] ?? s)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.addCategoryLink} onPress={() => { setNewCategoryType('skill'); setNewCategoryName(''); setAddCategoryModalVisible(true); }}>
                <ThemedText style={[styles.addCategoryLinkText, { color: Colors[colorScheme ?? 'light'].tint }]}>+ Add category</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.labelMetaRow}>
              <ThemedText style={styles.labelMetaLabel}>Position</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {['', ...Object.keys(POSITION_LABELS), ...customBuckets.position, 'other'].map((p) => (
                  <TouchableOpacity key={p || '_'} style={[styles.metaChip, editPosition === p && { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} onPress={() => setEditPosition(p)}>
                    <ThemedText style={[styles.metaChipText, editPosition === p && { color: '#FFF' }]}>
                      {p === '' ? 'Any' : p === 'other' ? 'Other' : (POSITION_LABELS[p] ?? p)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.labelMetaRow}>
              <ThemedText style={styles.labelMetaLabel}>Feedback</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {['', ...Object.keys(FEEDBACK_TYPE_LABELS), ...customBuckets.feedback, 'other'].map((f) => (
                  <TouchableOpacity key={f || '_'} style={[styles.metaChip, editFeedback === f && { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} onPress={() => setEditFeedback(f)}>
                    <ThemedText style={[styles.metaChipText, editFeedback === f && { color: '#FFF' }]}>
                      {f === '' ? 'Any' : f === 'other' ? 'Other' : (FEEDBACK_TYPE_LABELS[f] ?? f)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.addCategoryLink} onPress={() => { setNewCategoryType('feedback'); setNewCategoryName(''); setAddCategoryModalVisible(true); }}>
                <ThemedText style={[styles.addCategoryLinkText, { color: Colors[colorScheme ?? 'light'].tint }]}>+ Add category</ThemedText>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.saveFieldButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
              onPress={handleSaveLabels}
              disabled={savingField === 'labels'}
            >
              {savingField === 'labels' ? <ActivityIndicator size="small" color="#FFF" /> : <ThemedText style={styles.saveFieldButtonText}>Save changes</ThemedText>}
            </TouchableOpacity>
          </View>

          {/* Tagged players */}
          {roster.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Tagged players</ThemedText>
              <View style={styles.tagRow}>
                {roster.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.metaChip, taggedPlayerNames.includes(p.name) && { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
                    onPress={() => toggleTaggedPlayer(p.name)}
                  >
                    <ThemedText style={[styles.metaChipText, taggedPlayerNames.includes(p.name) && { color: '#FFF' }]}>{p.name}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.saveFieldButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} onPress={handleSaveLabels} disabled={savingField === 'labels'}>
                {savingField === 'labels' ? <ActivityIndicator size="small" color="#FFF" /> : <ThemedText style={styles.saveFieldButtonText}>Save tags</ThemedText>}
              </TouchableOpacity>
            </View>
          )}

          {/* Processing Status (errors) */}
          {recording.status && ['transcription_failed', 'label_failed'].includes(recording.status) && (
            <View style={[styles.statusCard, { backgroundColor: colorScheme === 'dark' ? '#2A1F1F' : '#FFF5F5' }]}>
              <ThemedText style={[styles.statusText, { color: colorScheme === 'dark' ? '#FF9999' : '#D32F2F' }]}>
                {recording.status === 'transcription_failed' && 'Transcription failed'}
                {recording.status === 'label_failed' && 'Label generation failed (transcription available)'}
              </ThemedText>
            </View>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      <Modal animationType="slide" transparent visible={addCategoryModalVisible} onRequestClose={() => setAddCategoryModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAddCategoryModalVisible(false)}>
          <View onStartShouldSetResponder={() => true} style={[styles.addCategoryModalContent, { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF' }]}>
            <ThemedText style={styles.addCategoryModalTitle}>Add category</ThemedText>
            <ThemedText style={styles.addCategoryModalHint}>New category for {newCategoryType}. It will appear here and when generating recording names.</ThemedText>
            <TextInput
              style={[styles.addCategoryInput, { color: Colors[colorScheme ?? 'light'].text, borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}
              placeholder="Category name"
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoCapitalize="words"
            />
            <View style={styles.addCategoryActions}>
              <TouchableOpacity style={[styles.addCategoryCancelBtn, { borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]} onPress={() => setAddCategoryModalVisible(false)}>
                <ThemedText style={styles.addCategoryCancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addCategorySubmitBtn, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
                onPress={handleAddCategory}
                disabled={!newCategoryName.trim() || addingCategory}
              >
                {addingCategory ? <ActivityIndicator size="small" color="#FFF" /> : <ThemedText style={styles.addCategorySubmitText}>Add</ThemedText>}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  sectionSubtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
    marginBottom: 12,
  },
  fillingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  fillingMetaText: {
    fontSize: 13,
    opacity: 0.8,
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
  saveFieldButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 8,
  },
  saveFieldButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  labelInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  labelMetaRow: {
    marginBottom: 10,
  },
  labelMetaLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.8,
  },
  chipScroll: {
    flexGrow: 0,
  },
  metaChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginRight: 8,
    marginBottom: 4,
  },
  metaChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  addCategoryLink: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  addCategoryLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  addCategoryModalContent: {
    padding: 20,
    borderRadius: 16,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  addCategoryModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  addCategoryModalHint: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 16,
  },
  addCategoryInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  addCategoryActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  addCategoryCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
  },
  addCategoryCancelText: {
    fontSize: 15,
  },
  addCategorySubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  addCategorySubmitText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
