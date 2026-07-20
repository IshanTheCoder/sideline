/**
 * Roster — redesign: green number avatars, "{Position} · {Class year}" rows,
 * an Add Player bottom sheet (position + class-year chips, save disabled
 * until name & number are set), and a Scan-a-roster sheet wired to the real
 * Groq vision importer with an include/exclude review list. Tap a player to
 * edit, long-press to remove.
 */
import { useRouter } from 'expo-router';
import { Camera, Check, ChevronLeft, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheet from '@/components/BottomSheet';
import { Brand, Shape } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenshotScan } from '@/hooks/use-screenshot-scan';
import { showAlert } from '@/lib/alert';
import {
  addPlayer,
  deletePlayer,
  fetchRosterForUser,
  getTeamIdForUser,
  importRosterPlayers,
  updatePlayer,
} from '@/lib/roster';
import { parseRosterFromScreenshot } from '@/lib/rosterScreenshotImport';

const parseRosterImage = async (imageAsset) => {
  const { players, error } = await parseRosterFromScreenshot(imageAsset);
  return { items: players, error };
};

const POSITION_OPTIONS = ['Outside Hitter', 'Setter', 'Libero', 'Middle Blocker', 'Opposite', 'DS'];
const POSITION_LABEL_TO_INITIAL = {
  'Outside Hitter': 'OH',
  Setter: 'S',
  Libero: 'L',
  'Middle Blocker': 'MB',
  Opposite: 'O',
  DS: 'DS',
};
const INITIAL_TO_LABEL = {
  OH: 'Outside Hitter',
  S: 'Setter',
  L: 'Libero',
  MB: 'Middle Blocker',
  O: 'Opposite',
  DS: 'DS',
};
const CLASS_YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
const GRADE_TO_CLASS = { 9: 'Freshman', 10: 'Sophomore', 11: 'Junior', 12: 'Senior' };

const displayPosition = (position) => {
  if (!position) return '';
  return String(position)
    .split(',')
    .map((p) => INITIAL_TO_LABEL[p.trim().toUpperCase()] ?? p.trim())
    .join(', ');
};

const displayClassYear = (grade) => {
  if (!grade) return '';
  const trimmed = String(grade).trim();
  return GRADE_TO_CLASS[Number(trimmed)] ?? trimmed;
};

export default function RosterScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // add/edit player sheet
  const [playerSheetOpen, setPlayerSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState('');
  const [classYear, setClassYear] = useState('');
  const [saving, setSaving] = useState(false);

  // scan sheet
  const [scanOpen, setScanOpen] = useState(false);
  const scan = useScreenshotScan(parseRosterImage, 'roster');

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await fetchRosterForUser(user.id);
      setPlayers(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openAddPlayer = () => {
    setEditingId(null);
    setName('');
    setNumber('');
    setPosition('');
    setClassYear('');
    setPlayerSheetOpen(true);
  };

  const openEditPlayer = (p) => {
    setEditingId(p.id);
    setName(p.name ?? '');
    setNumber(p.number ? String(p.number) : '');
    const firstInitial = String(p.position ?? '').split(',')[0]?.trim().toUpperCase();
    setPosition(INITIAL_TO_LABEL[firstInitial] ?? '');
    setClassYear(displayClassYear(p.grade));
    setPlayerSheetOpen(true);
  };

  const canSave = name.trim().length > 0 && number.trim().length > 0 && !saving;

  const savePlayer = async () => {
    if (!canSave || !user?.id) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        number: number.trim(),
        position: position ? POSITION_LABEL_TO_INITIAL[position] : undefined,
        grade: classYear || undefined,
      };
      if (editingId) {
        const { error } = await updatePlayer(editingId, payload);
        if (error) {
          showAlert('Could not save', error.message);
          return;
        }
      } else {
        const { teamId, error: teamError } = await getTeamIdForUser(user.id);
        if (teamError || !teamId) {
          showAlert('Could not save', 'No team found. Try again.');
          return;
        }
        const { error } = await addPlayer(teamId, payload);
        if (error) {
          showAlert('Could not save', error.message);
          return;
        }
      }
      setPlayerSheetOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const removePlayer = (p) => {
    showAlert('Remove player?', `${p.name} will be removed from the roster.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deletePlayer(p.id);
          if (error) {
            showAlert('Could not remove', error.message);
            return;
          }
          load();
        },
      },
    ]);
  };

  const openScan = () => {
    scan.reset();
    setScanOpen(true);
  };

  const confirmScan = async () => {
    if (!user?.id || scan.includedCount === 0 || saving) return;
    setSaving(true);
    try {
      const { teamId, error: teamError } = await getTeamIdForUser(user.id);
      if (teamError || !teamId) {
        showAlert('Could not import', 'No team found. Try again.');
        return;
      }
      const toAdd = scan.included();
      const { added, error } = await importRosterPlayers(teamId, toAdd);
      if (error) {
        showAlert('Import failed', error.message);
        return;
      }
      if (added < toAdd.length) {
        showAlert('Partly imported', `${added} of ${toAdd.length} players were added.`);
      }
      setScanOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/app'))}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color={Brand.ink} strokeWidth={2.4} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Roster</Text>
            <Text style={styles.subtitle}>Names power transcription accuracy</Text>
          </View>
        </View>

        {/* actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.addBtn} onPress={openAddPlayer} activeOpacity={0.85}>
            <Text style={styles.addBtnText}>+ Add player</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scanBtn} onPress={openScan} activeOpacity={0.85}>
            <Text style={styles.scanBtnText}>Scan a roster</Text>
          </TouchableOpacity>
        </View>

        {/* player rows */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Brand.green} />
          </View>
        ) : players.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No players yet. Add them by hand or scan a printed roster — names make
              transcription attribution accurate.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {players.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.playerRow}
                onPress={() => openEditPlayer(p)}
                onLongPress={() => removePlayer(p)}
                activeOpacity={0.75}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{p.number || p.name.slice(0, 1)}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{p.name}</Text>
                  <Text style={styles.playerSub}>
                    {[displayPosition(p.position), displayClassYear(p.grade)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* add / edit player sheet */}
      <BottomSheet visible={playerSheetOpen} onClose={() => setPlayerSheetOpen(false)} maxHeightPct={0.86}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{editingId ? 'Edit player' : 'Add player'}</Text>
          <TouchableOpacity
            style={styles.sheetClose}
            onPress={() => setPlayerSheetOpen(false)}
            activeOpacity={0.7}
          >
            <X size={13} color={Brand.chip} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Zoe Kim"
          placeholderTextColor={Brand.faint}
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>JERSEY #</Text>
        <TextInput
          value={number}
          onChangeText={(t) => setNumber(t.replace(/\D/g, '').slice(0, 2))}
          placeholder="e.g. 8"
          placeholderTextColor={Brand.faint}
          inputMode="numeric"
          style={[styles.input, styles.numberInput]}
        />
        <Text style={styles.fieldLabel}>POSITION</Text>
        <View style={styles.chipWrap}>
          {POSITION_OPTIONS.map((p) => {
            const sel = position === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.chip, sel && styles.chipActive]}
                onPress={() => setPosition(sel ? '' : p)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, sel && styles.chipTextActive]}>{p}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.fieldLabel}>CLASS YEAR</Text>
        <View style={styles.chipWrap}>
          {CLASS_YEARS.map((y) => {
            const sel = classYear === y;
            return (
              <TouchableOpacity
                key={y}
                style={[styles.chip, sel && styles.chipActive]}
                onPress={() => setClassYear(sel ? '' : y)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, sel && styles.chipTextActive]}>{y}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={savePlayer}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {name.trim()
                ? `${editingId ? 'Save' : 'Add'} ${name.trim().split(/\s+/)[0]}`
                : editingId
                  ? 'Save player'
                  : 'Add player'}
            </Text>
          )}
        </TouchableOpacity>
      </BottomSheet>

      {/* scan roster sheet */}
      <BottomSheet visible={scanOpen} onClose={() => setScanOpen(false)} maxHeightPct={0.86}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Scan a roster</Text>
          <TouchableOpacity
            style={styles.sheetClose}
            onPress={() => setScanOpen(false)}
            activeOpacity={0.7}
          >
            <X size={13} color={Brand.chip} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        {scan.stage === 'pick' && (
          <View>
            <View style={styles.dropCard}>
              <View style={styles.dropIconCircle}>
                <Camera size={24} color={Brand.green} strokeWidth={1.8} />
              </View>
              <Text style={styles.dropTitle}>Photo or screenshot of your roster</Text>
              <Text style={styles.dropSub}>
                Snap a printed team sheet or upload a screenshot, Sideline reads names, numbers
                and positions so transcription attributes notes correctly.
              </Text>
            </View>
            <View style={styles.scanBtnRow}>
              <TouchableOpacity
                style={styles.scanPrimary}
                onPress={() => scan.pickImage(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.scanPrimaryText}>Take photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scanOutline}
                onPress={() => scan.pickImage(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.scanOutlineText}>Upload screenshot</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {scan.stage === 'processing' && (
          <View style={styles.processing}>
            <ActivityIndicator size="large" color={Brand.green} />
            <Text style={styles.processingTitle}>Reading roster…</Text>
            <Text style={styles.processingSub}>Extracting names, numbers, positions</Text>
          </View>
        )}

        {scan.stage === 'review' && (
          <View>
            <Text style={styles.reviewHint}>
              Found {scan.results.length} player{scan.results.length === 1 ? '' : 's'}, tap to
              exclude any.
            </Text>
            <View style={styles.reviewList}>
              {scan.results.map((p, i) => {
                const off = scan.excluded.includes(i);
                return (
                  <TouchableOpacity
                    key={`${p.name}-${i}`}
                    style={[styles.reviewRow, off && styles.reviewRowOff]}
                    onPress={() => scan.toggleExcluded(i)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>{p.number || p.name.slice(0, 1)}</Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{p.name}</Text>
                      <Text style={styles.playerSub}>
                        {[displayPosition(p.position), displayClassYear(p.grade)]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    {off ? (
                      <View style={styles.excludeRing} />
                    ) : (
                      <View style={styles.includeCheck}>
                        <Check size={12} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, (scan.includedCount === 0 || saving) && styles.saveBtnDisabled]}
              onPress={confirmScan}
              disabled={scan.includedCount === 0 || saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  Add {scan.includedCount} player{scan.includedCount === 1 ? '' : 's'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 66,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Brand.ink,
  },
  subtitle: {
    fontSize: 13,
    color: Brand.muted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  addBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  scanBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Brand.borderBtn,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnText: {
    color: Brand.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    padding: 18,
    marginTop: 16,
    ...Shape.cardShadow,
  },
  emptyText: {
    fontSize: 13.5,
    color: Brand.muted,
    lineHeight: 20,
  },
  list: {
    gap: 8,
    marginTop: 16,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: Brand.card,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 15,
    ...Shape.cardShadow,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Brand.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.green,
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: Brand.ink,
  },
  playerSub: {
    fontSize: 12.5,
    color: Brand.muted,
  },
  // sheets
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Brand.ink,
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Brand.muted,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: Brand.border2,
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 16,
    color: Brand.ink,
    backgroundColor: Brand.card,
  },
  numberInput: {
    width: 110,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 40,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border2,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.ink,
  },
  chipTextActive: {
    color: '#fff',
  },
  saveBtn: {
    marginTop: 22,
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: Brand.chevron,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dropCard: {
    marginTop: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Brand.dashed,
    borderRadius: 20,
    paddingVertical: 34,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
    backgroundColor: Brand.cardHover,
  },
  dropIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(64,97,58,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.ink,
    textAlign: 'center',
  },
  dropSub: {
    fontSize: 13,
    color: Brand.muted,
    textAlign: 'center',
    lineHeight: 19.5,
  },
  scanBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  scanPrimary: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  scanOutline: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Brand.borderBtn,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanOutlineText: {
    color: Brand.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  processing: {
    marginTop: 16,
    paddingVertical: 44,
    alignItems: 'center',
    gap: 14,
  },
  processingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.ink,
  },
  processingSub: {
    fontSize: 13,
    color: Brand.muted,
  },
  reviewHint: {
    fontSize: 13,
    color: Brand.muted,
    marginTop: 10,
  },
  reviewList: {
    gap: 8,
    marginTop: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.greenPaleSub,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  reviewRowOff: {
    backgroundColor: Brand.cardHover,
    borderColor: '#EDECE7',
    opacity: 0.45,
  },
  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Brand.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.green,
  },
  includeCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  excludeRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    borderColor: Brand.chevron,
  },
});
