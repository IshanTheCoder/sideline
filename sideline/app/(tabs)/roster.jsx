import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import {
  fetchRosterForUser,
  addPlayer,
  updatePlayer,
  deletePlayer,
  importRosterFromCsv,
  getTeamIdForUser,
  parseRosterCsv,
} from '@/lib/roster';

const POSITION_OPTIONS = ['Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite', 'Libero', 'Defensive Specialist', ''];

export default function RosterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formGrade, setFormGrade] = useState('');
  const [saving, setSaving] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

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

  const handleSavePlayer = async () => {
    const name = formName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter a player name.');
      return;
    }
    setSaving(true);
    try {
      const { teamId, error: teamError } = await getTeamIdForUser(user.id);
      if (teamError || !teamId) {
        Alert.alert('Error', 'Could not load team.');
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
        if (updateError) Alert.alert('Error', updateError.message);
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
        if (insertError) Alert.alert('Error', insertError.message);
        else {
          setModalVisible(false);
          loadRoster();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (p) => {
    Alert.alert(
      'Remove player?',
      `Remove ${p.name} from the roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error: delError } = await deletePlayer(p.id);
            if (delError) Alert.alert('Error', delError.message);
            else loadRoster();
          },
        },
      ]
    );
  };

  const handleImportCsv = async () => {
    const parsed = parseRosterCsv(csvText);
    if (parsed.length === 0) {
      Alert.alert('No data', 'Paste CSV with columns: Name, Number, Position, Grade (or use commas/tabs).');
      return;
    }
    setImporting(true);
    try {
      const { teamId, error: teamError } = await getTeamIdForUser(user.id);
      if (teamError || !teamId) {
        Alert.alert('Error', 'Could not load team.');
        setImporting(false);
        return;
      }
      const { added, errors } = await importRosterFromCsv(teamId, csvText);
      setImportModalVisible(false);
      setCsvText('');
      loadRoster();
      if (errors.length > 0) {
        Alert.alert('Import done', `Added ${added} player(s). Some rows had errors: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`);
      } else {
        Alert.alert('Import complete', `Added ${added} player(s) to your roster.`);
      }
    } finally {
      setImporting(false);
    }
  };

  const renderPlayer = ({ item }) => (
    <View
      style={[
        styles.playerRow,
        { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5', borderColor: colorScheme === 'dark' ? '#3A3A3A' : '#E5E5E5' },
      ]}
    >
      <View style={styles.playerInfo}>
        <ThemedText style={styles.playerName}>{item.name}</ThemedText>
        <View style={styles.playerMeta}>
          {item.number ? <ThemedText style={styles.playerMetaText}>#{item.number}</ThemedText> : null}
          {item.position ? <ThemedText style={styles.playerMetaText}> · {item.position}</ThemedText> : null}
          {item.grade ? <ThemedText style={styles.playerMetaText}> · {item.grade}</ThemedText> : null}
        </View>
      </View>
      <View style={styles.playerActions}>
        <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8} style={styles.iconBtn}>
          <IconSymbol name="pencil" size={20} color={Colors[colorScheme ?? 'light'].tint} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8} style={styles.iconBtn}>
          <IconSymbol name="trash" size={20} color={colorScheme === 'dark' ? '#FF6B6B' : '#D32F2F'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <IconSymbol name="chevron.left" size={28} color={Colors[colorScheme ?? 'light'].text} />
          <ThemedText style={styles.backText}>Back</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          Roster
        </ThemedText>
      </View>

      <ThemedText style={styles.subtitle}>
        Add players so transcriptions and AI summaries use correct names
      </ThemedText>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={openAdd}
          activeOpacity={0.7}
        >
          <IconSymbol name="plus" size={20} color="#FFF" />
          <ThemedText style={styles.primaryButtonText}>Add player</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={() => { setCsvText(''); setImportModalVisible(true); }}
          activeOpacity={0.7}
        >
          <IconSymbol name="doc.text" size={20} color={Colors[colorScheme ?? 'light'].tint} />
          <ThemedText style={[styles.secondaryButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>
            Import from CSV
          </ThemedText>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
          <ThemedText style={styles.loadingText}>Loading roster...</ThemedText>
        </View>
      )}

      {!loading && error && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={loadRoster}>
            <ThemedText style={[styles.retryButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && players.length === 0 && (
        <View style={styles.emptyContainer}>
          <IconSymbol name="person.2" size={48} color={colorScheme === 'dark' ? '#666' : '#999'} />
          <ThemedText style={styles.emptyTitle}>No players yet</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Add players manually or import from Excel/Google Sheets (export as CSV, then paste below).
          </ThemedText>
        </View>
      )}

      {!loading && !error && players.length > 0 && (
        <FlatList
          data={players}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Add/Edit modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFF' }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText style={styles.modalTitle}>{editingPlayer ? 'Edit player' : 'Add player'}</ThemedText>
            <TextInput
              style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}
              placeholder="Name *"
              placeholderTextColor="#999"
              value={formName}
              onChangeText={setFormName}
              autoCapitalize="words"
            />
            <TextInput
              style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}
              placeholder="Number"
              placeholderTextColor="#999"
              value={formNumber}
              onChangeText={setFormNumber}
              keyboardType="number-pad"
            />
            <TextInput
              style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}
              placeholder="Position (e.g. Setter, Libero)"
              placeholderTextColor="#999"
              value={formPosition}
              onChangeText={setFormPosition}
            />
            <TextInput
              style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}
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
                style={[styles.saveButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
                onPress={handleSavePlayer}
                disabled={saving}
              >
                {saving ? <ActivityIndicator size="small" color="#FFF" /> : <ThemedText style={styles.saveButtonText}>Save</ThemedText>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Import CSV modal */}
      <Modal visible={importModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.importModalContent, { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFF' }]}
          >
            <ThemedText style={styles.modalTitle}>Import from CSV</ThemedText>
            <ThemedText style={styles.importHint}>
              Paste data from Excel or Google Sheets. Use columns: Name, Number, Position, Grade (or a header row).
            </ThemedText>
            <TextInput
              style={[styles.csvInput, { color: Colors[colorScheme ?? 'light'].text, borderColor: colorScheme === 'dark' ? '#444' : '#DDD' }]}
              placeholder="Name,Number,Position,Grade&#10;Sarah,7,Setter,10&#10;..."
              placeholderTextColor="#999"
              value={csvText}
              onChangeText={setCsvText}
              multiline
              numberOfLines={8}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setImportModalVisible(false); setCsvText(''); }}>
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
                onPress={handleImportCsv}
                disabled={importing}
              >
                {importing ? <ActivityIndicator size="small" color="#FFF" /> : <ThemedText style={styles.saveButtonText}>Import</ThemedText>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
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
    fontSize: 28,
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  separator: {
    height: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  playerInfo: { flex: 1 },
  playerName: {
    fontSize: 17,
    fontWeight: '600',
  },
  playerMeta: { flexDirection: 'row', marginTop: 4 },
  playerMetaText: { fontSize: 14, opacity: 0.8 },
  playerActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
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
    gap: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, opacity: 0.8, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  importModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  importHint: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  csvInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 160,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
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
