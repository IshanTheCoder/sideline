import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert } from '@/lib/alert';
import {
  fetchRosterForUser,
  addPlayer,
  updatePlayer,
  deletePlayer,
  getTeamIdForUser,
} from '@/lib/roster';

const POSITION_OPTIONS = ['', 'Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite', 'Libero', 'Defensive Specialist'];

export default function RosterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formGrade, setFormGrade] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRoster = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setPlayers([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchRosterForUser(user.id);
    if (fetchError) {
      if (fetchError.message?.includes('does not exist') || fetchError.message?.includes('relation')) {
        setPlayers([]);
        setError(null);
      } else {
        setError(fetchError.message);
      }
    } else {
      setPlayers(data ?? []);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const openAdd = () => {
    setEditingPlayer(null);
    setFormName('');
    setFormNumber('');
    setFormPosition('');
    setFormGrade('');
    setModalVisible(true);
  };

  const openEdit = (p) => {
    setEditingPlayer(p);
    setFormName(p.name || '');
    setFormNumber(p.number || '');
    setFormPosition(p.position || '');
    setFormGrade(p.grade || '');
    setModalVisible(true);
  };

  const showError = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      showAlert(title, message);
    }
  };

  const handleSavePlayer = async () => {
    const name = formName.trim();
    if (!name) {
      showError('Name required', 'Please enter a player name.');
      return;
    }
    setSaving(true);
    try {
      const { teamId, error: teamError } = await getTeamIdForUser(user.id);
      if (teamError || !teamId) {
        showError('Error', 'Could not load team.');
        setSaving(false);
        return;
      }
      if (editingPlayer) {
        const { error: updateError } = await updatePlayer(editingPlayer.id, {
          name,
          number: formNumber.trim() || null,
          position: formPosition.trim() || null,
          grade: formGrade.trim() || null,
        });
        if (updateError) showError('Error', updateError.message);
        else {
          setModalVisible(false);
          loadRoster();
        }
      } else {
        const { error: insertError } = await addPlayer(teamId, {
          name,
          number: formNumber.trim() || undefined,
          position: formPosition.trim() || undefined,
          grade: formGrade.trim() || undefined,
        });
        if (insertError) showError('Error', insertError.message);
        else {
          setModalVisible(false);
          loadRoster();
        }
      }
    } catch (e) {
      showError('Error', e.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (p) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Remove ${p.name} from the roster?`);
      if (confirmed) {
        deletePlayer(p.id).then(({ error: delError }) => {
          if (delError) showError('Error', delError.message);
          else loadRoster();
        });
      }
      return;
    }

    showAlert(
      'Remove player?',
      `Remove ${p.name} from the roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error: delError } = await deletePlayer(p.id);
            if (delError) showAlert('Error', delError.message);
            else loadRoster();
          },
        },
      ]
    );
  };

  const tint = Colors[colorScheme ?? 'light'].tint;
  const isDark = colorScheme === 'dark';
  const tableBg = isDark ? '#1E1E1E' : '#FFF';
  const headerBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const rowBg = (i) => (i % 2 === 0 ? (isDark ? '#252525' : '#FAFAFA') : (isDark ? '#1E1E1E' : '#FFF'));
  const borderColor = isDark ? '#333' : '#E8E8E8';

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7} accessibilityLabel="Back">
          <IconSymbol name="chevron.left" size={28} color={Colors[colorScheme ?? 'light'].text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          Roster
        </ThemedText>
      </View>

      <ThemedText style={styles.subtitle}>
        Add players so transcriptions and AI summaries use correct names
      </ThemedText>

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: tint }]}
        onPress={openAdd}
        activeOpacity={0.8}
      >
        <IconSymbol name="plus" size={22} color="#FFF" />
        <ThemedText style={styles.addButtonText}>Add player</ThemedText>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
          <ThemedText style={styles.loadingText}>Loading roster...</ThemedText>
        </View>
      )}

      {!loading && error && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={loadRoster}>
            <ThemedText style={[styles.retryButtonText, { color: tint }]}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && players.length === 0 && (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
            <IconSymbol name="person.2" size={40} color={isDark ? '#666' : '#999'} />
          </View>
          <ThemedText style={styles.emptyTitle}>No players yet</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Tap “Add player” to build your roster. Names are used in transcriptions and AI summaries.
          </ThemedText>
        </View>
      )}

      {!loading && !error && players.length > 0 && (
        <View style={[styles.tableWrap, { backgroundColor: tableBg, borderColor }]}>
          <View style={[styles.tableHeader, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
            <ThemedText style={[styles.thName, styles.th]} numberOfLines={1}>Name</ThemedText>
            <ThemedText style={[styles.thNum, styles.th]} numberOfLines={1}>#</ThemedText>
            <ThemedText style={[styles.thPos, styles.th]} numberOfLines={1}>Position</ThemedText>
            <ThemedText style={[styles.thGrade, styles.th]} numberOfLines={1}>Grade</ThemedText>
            <View style={styles.thActions} />
          </View>
          <ScrollView
            style={styles.tableBody}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.tableBodyContent}
          >
            {players.map((p, i) => (
              <View
                key={p.id}
                style={[
                  styles.tableRow,
                  { backgroundColor: rowBg(i), borderBottomColor: borderColor },
                  i === players.length - 1 && styles.tableRowLast,
                ]}
              >
                <ThemedText style={styles.tdName} numberOfLines={1}>{p.name || '—'}</ThemedText>
                <ThemedText style={styles.tdNum} numberOfLines={1}>{p.number || '—'}</ThemedText>
                <ThemedText style={styles.tdPos} numberOfLines={1}>{p.position || '—'}</ThemedText>
                <ThemedText style={styles.tdGrade} numberOfLines={1}>{p.grade || '—'}</ThemedText>
                <View style={styles.tdActions}>
                  <TouchableOpacity onPress={() => openEdit(p)} hitSlop={8} style={styles.actionBtn}>
                    <IconSymbol name="pencil" size={18} color={tint} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(p)} hitSlop={8} style={styles.actionBtn}>
                    <IconSymbol name="trash" size={18} color={isDark ? '#FF7B7B' : '#D32F2F'} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setModalVisible(false);
            }}
          />
          <View
            style={[styles.modalContent, { backgroundColor: isDark ? '#1A1A1A' : '#FFF' }]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
                <ThemedText style={styles.modalTitle}>{editingPlayer ? 'Edit player' : 'Add player'}</ThemedText>
                <TextInput
                  style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: isDark ? '#444' : '#DDD' }]}
                  placeholder="Name *"
                  placeholderTextColor="#999"
                  value={formName}
                  onChangeText={setFormName}
                  autoCapitalize="words"
                />
                <TextInput
                  style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: isDark ? '#444' : '#DDD' }]}
                  placeholder="Number"
                  placeholderTextColor="#999"
                  value={formNumber}
                  onChangeText={setFormNumber}
                  keyboardType="number-pad"
                />
                <ThemedText style={styles.positionLabel}>Position</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.positionChipScroll} contentContainerStyle={styles.positionChipRow}>
                  {POSITION_OPTIONS.map((pos) => (
                    <TouchableOpacity
                      key={pos || '_none'}
                      style={[styles.positionChip, formPosition === pos && { backgroundColor: tint }]}
                      onPress={() => setFormPosition(pos)}
                    >
                      <ThemedText style={[styles.positionChipText, formPosition === pos && { color: '#FFF' }]}>
                        {pos || 'None'}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput
                  style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: isDark ? '#444' : '#DDD' }]}
                  placeholder="Grade"
                  placeholderTextColor="#999"
                  value={formGrade}
                  onChangeText={setFormGrade}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                    <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: tint }]}
                    onPress={handleSavePlayer}
                    disabled={saving}
                  >
                    {saving ? <ActivityIndicator size="small" color="#FFF" /> : <ThemedText style={styles.saveButtonText}>Save</ThemedText>}
                  </TouchableOpacity>
                </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 24 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tableWrap: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 200,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1.5,
  },
  th: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    opacity: 0.9,
  },
  thName: { flex: 2, paddingRight: 8 },
  thNum: { width: 36, textAlign: 'center' },
  thPos: { flex: 1.4, paddingRight: 8 },
  thGrade: { width: 44 },
  thActions: { width: 72 },
  tableBody: {
    flex: 1,
  },
  tableBodyContent: {
    paddingBottom: 24,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tdName: { flex: 2, fontSize: 16, fontWeight: '600', paddingRight: 8 },
  tdNum: { width: 36, fontSize: 15, textAlign: 'center', opacity: 0.9 },
  tdPos: { flex: 1.4, fontSize: 14, paddingRight: 8, opacity: 0.9 },
  tdGrade: { width: 44, fontSize: 14, opacity: 0.9 },
  tdActions: {
    width: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  actionBtn: { padding: 6 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 16 },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  errorText: { fontSize: 16 },
  retryButton: { paddingVertical: 8, paddingHorizontal: 16 },
  retryButtonText: { fontSize: 16, fontWeight: '600' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, opacity: 0.8, textAlign: 'center', lineHeight: 22 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: { flex: 1 },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalScrollContent: { paddingBottom: 24 },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  positionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.9,
  },
  positionChipScroll: { marginBottom: 12 },
  positionChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 24,
  },
  positionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  positionChipText: { fontSize: 14, fontWeight: '500' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelButtonText: { fontSize: 16 },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
