/**
 * Game Detail — redesign: notes grouped by SET with player/tag chips, a dark
 * Game Analysis button, and a note bottom sheet with real audio playback,
 * the transcript, manual notes, and the tag editor (skill / position /
 * feedback / players) kept below Manual Notes. Long-press a note to delete.
 */
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BarChart3, ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheet from '@/components/BottomSheet';
import { Brand, Shape, playerAccent } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert } from '@/lib/alert';
import { getCustomBuckets } from '@/lib/customBuckets';
import {
  createSignedRecordingUrl,
  deleteRecordingForUser,
  fetchRecordingsForGame,
  formatDuration,
  parseRecordingNotes,
  saveRecordingNotes,
  serializeRecordingNotes,
  updateRecording,
} from '@/lib/recording';
import { fetchRosterForUser } from '@/lib/roster';
import { gameDateParts } from '@/lib/scheduleFormat';
import {
  FEEDBACK_TYPE_LABELS,
  POSITION_LABELS,
  SKILL_CATEGORY_LABELS,
  parseAiLabels,
  serializeAiLabels,
} from '@/lib/volleyballVocabulary';

const setNumberFor = (rec) => {
  const { setMarkers } = parseRecordingNotes(rec.manual_notes);
  const label = setMarkers?.[0]?.label;
  const m = label?.match(/(\d+)/);
  return m ? Number(m[1]) : 1;
};

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [roster, setRoster] = useState([]);
  const [customBuckets, setCustomBuckets] = useState([]);

  // audio player state
  const soundRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [playMs, setPlayMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);

  // note-sheet editing state
  const [manualNote, setManualNote] = useState('');
  const [meta, setMeta] = useState({});
  const [label, setLabel] = useState('');

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    try {
      const { data } = await fetchRecordingsForGame(user.id, String(id));
      setRecordings(data ?? []);
      const { data: players } = await fetchRosterForUser(user.id);
      setRoster(players ?? []);
      const buckets = await getCustomBuckets(user.id);
      setCustomBuckets(buckets ?? []);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const unloadSound = useCallback(async () => {
    setPlaying(false);
    setPlayMs(0);
    setDurationMs(0);
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    unloadSound();
  }, [unloadSound]);

  const game = recordings[0]?.game_sessions;
  const opponent = game?.opponent_name ?? 'Game';
  const dateLabel = game?.date ? gameDateParts(game.date).label : '';
  const matchType = game?.match_type || 'Regular season';

  const sets = useMemo(() => {
    const bySet = new Map();
    for (const rec of recordings) {
      const setNum = setNumberFor(rec);
      if (!bySet.has(setNum)) bySet.set(setNum, []);
      bySet.get(setNum).push(rec);
    }
    return [...bySet.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([num, notes]) => ({ num, notes }));
  }, [recordings]);

  const activeNote = recordings.find((r) => r.id === activeNoteId) ?? null;

  const openNote = async (rec) => {
    await unloadSound();
    const parsed = parseAiLabels(rec.ai_labels);
    setLabel(parsed.displayLabel || 'Untitled note');
    setMeta({
      skillCategory: parsed.skillCategory,
      position: parsed.position,
      feedbackType: parsed.feedbackType,
      taggedPlayers: parsed.taggedPlayers ?? [],
      isOpponentNote: parsed.isOpponentNote,
      playPattern: parsed.playPattern,
      ruleNote: parsed.ruleNote,
    });
    setManualNote(parseRecordingNotes(rec.manual_notes).notes ?? '');
    setActiveNoteId(rec.id);
  };

  const closeNote = async () => {
    await unloadSound();
    setActiveNoteId(null);
    load();
  };

  const togglePlay = async () => {
    if (!activeNote) return;
    try {
      if (soundRef.current) {
        if (playing) {
          await soundRef.current.pauseAsync();
          setPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setPlaying(true);
        }
        return;
      }
      // iOS can't decode .webm (web recordings) — give a clear reason instead
      // of letting Audio.Sound.createAsync fail with a generic error
      if (Platform.OS === 'ios' && String(activeNote.audio_url).toLowerCase().includes('.webm')) {
        showAlert(
          'Unsupported Format',
          'This recording was made on the web and cannot be played on iOS. Please use a browser to listen to it.'
        );
        return;
      }
      setAudioLoading(true);
      const { url, error } = await createSignedRecordingUrl(activeNote.audio_url);
      if (error || !url) {
        showAlert('Playback failed', 'Could not load this note’s audio.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (st) => {
          if (!st.isLoaded) return;
          setPlayMs(st.positionMillis ?? 0);
          setDurationMs(st.durationMillis ?? 0);
          if (st.didJustFinish) {
            setPlaying(false);
            setPlayMs(0);
            sound.setPositionAsync(0).catch(() => {});
          }
        }
      );
      soundRef.current = sound;
      setPlaying(true);
    } catch (e) {
      console.error('Playback error:', e);
      showAlert('Playback failed', e?.message ?? 'Could not play this recording.');
    } finally {
      setAudioLoading(false);
    }
  };

  const persistMeta = async (nextMeta) => {
    setMeta(nextMeta);
    if (!activeNote || !user?.id) return;
    await updateRecording(user.id, activeNote.id, {
      ai_labels: serializeAiLabels(label, nextMeta),
    });
  };

  const persistManualNote = async () => {
    if (!activeNote || !user?.id) return;
    const { setMarkers } = parseRecordingNotes(activeNote.manual_notes);
    await saveRecordingNotes(
      user.id,
      activeNote.id,
      serializeRecordingNotes(manualNote, setMarkers ?? [])
    );
  };

  const deleteNote = (rec) => {
    showAlert('Delete note?', 'The audio and transcript will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteRecordingForUser(user.id, rec.id, rec.audio_url);
          if (error) {
            showAlert('Could not delete', error.message);
            return;
          }
          load();
        },
      },
    ]);
  };

  const totalSec = Math.round(durationMs / 1000) || activeNote?.duration || 0;
  const playPct = durationMs > 0 ? Math.min(100, (playMs / durationMs) * 100) : 0;

  const skillOptions = {
    ...SKILL_CATEGORY_LABELS,
    ...Object.fromEntries(customBuckets.filter((b) => b.type === 'skill').map((b) => [b.name, b.name])),
  };
  const positionOptions = {
    ...POSITION_LABELS,
    ...Object.fromEntries(customBuckets.filter((b) => b.type === 'position').map((b) => [b.name, b.name])),
  };
  const feedbackOptions = {
    ...FEEDBACK_TYPE_LABELS,
    ...Object.fromEntries(customBuckets.filter((b) => b.type === 'feedback').map((b) => [b.name, b.name])),
  };

  const activeParsed = activeNote ? parseAiLabels(activeNote.ai_labels) : null;

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
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              vs. {opponent}
            </Text>
            <Text style={styles.subtitle}>
              {[dateLabel, matchType].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        {/* game analysis */}
        <TouchableOpacity
          style={styles.analysisBtn}
          onPress={() => router.push(`/(tabs)/review/game/summary/${id}`)}
          activeOpacity={0.85}
        >
          <BarChart3 size={17} color="#fff" strokeWidth={2} />
          <Text style={styles.analysisBtnText}>Game Analysis</Text>
        </TouchableOpacity>

        {/* notes grouped by set */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Brand.green} />
          </View>
        ) : sets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No notes for this game yet.</Text>
          </View>
        ) : (
          <View style={styles.setList}>
            {sets.map((set) => (
              <View key={set.num}>
                <Text style={styles.setEyebrow}>SET {set.num}</Text>
                <View style={styles.noteList}>
                  {set.notes.map((rec) => {
                    const parsed = parseAiLabels(rec.ai_labels);
                    const player = parsed.taggedPlayers?.[0];
                    const accent = playerAccent(roster, player);
                    const tag = parsed.skillCategory
                      ? SKILL_CATEGORY_LABELS[parsed.skillCategory] ?? parsed.skillCategory
                      : parsed.feedbackType
                        ? FEEDBACK_TYPE_LABELS[parsed.feedbackType] ?? parsed.feedbackType
                        : null;
                    return (
                      <TouchableOpacity
                        key={rec.id}
                        style={styles.noteRow}
                        onPress={() => openNote(rec)}
                        onLongPress={() => deleteNote(rec)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.playTile}>
                          <Play size={15} color={Brand.green} fill={Brand.green} strokeWidth={0} />
                        </View>
                        <View style={styles.noteInfo}>
                          <Text style={styles.noteTitle} numberOfLines={1}>
                            {parsed.displayLabel || 'Untitled note'}
                          </Text>
                          <View style={styles.chipRow}>
                            {!!player && (
                              <View style={[styles.playerChip, { backgroundColor: accent.bg }]}>
                                <Text style={[styles.playerChipText, { color: accent.ink }]}>
                                  {player}
                                </Text>
                              </View>
                            )}
                            {!!tag && (
                              <View style={styles.tagChip}>
                                <Text style={styles.tagChipText}>{tag}</Text>
                              </View>
                            )}
                            <Text style={styles.durText}>{formatDuration(rec.duration ?? 0)}</Text>
                          </View>
                        </View>
                        <ChevronRight size={14} color={Brand.chevron} strokeWidth={2.4} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* note sheet */}
      <BottomSheet visible={!!activeNote} onClose={closeNote} maxHeightPct={0.78}>
        {activeNote && (
          <View>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity style={styles.sheetClose} onPress={closeNote} activeOpacity={0.7}>
                <X size={13} color={Brand.chip} strokeWidth={2.6} />
              </TouchableOpacity>
            </View>
            <View style={styles.sheetChips}>
              {!!activeParsed?.taggedPlayers?.[0] && (
                <View
                  style={[
                    styles.playerChip,
                    { backgroundColor: playerAccent(roster, activeParsed.taggedPlayers[0]).bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.playerChipText,
                      { color: playerAccent(roster, activeParsed.taggedPlayers[0]).ink },
                    ]}
                  >
                    {activeParsed.taggedPlayers[0]}
                  </Text>
                </View>
              )}
              {!!activeParsed?.skillCategory && (
                <View style={styles.tagChip}>
                  <Text style={styles.tagChipText}>
                    {SKILL_CATEGORY_LABELS[activeParsed.skillCategory] ?? activeParsed.skillCategory}
                  </Text>
                </View>
              )}
              <View style={styles.tagChip}>
                <Text style={styles.tagChipText}>Set {setNumberFor(activeNote)}</Text>
              </View>
            </View>

            {/* audio row */}
            <View style={styles.audioRow}>
              <TouchableOpacity style={styles.playBtn} onPress={togglePlay} activeOpacity={0.8}>
                {audioLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : playing ? (
                  <Pause size={15} color="#fff" fill="#fff" strokeWidth={0} />
                ) : (
                  <Play size={15} color="#fff" fill="#fff" strokeWidth={0} />
                )}
              </TouchableOpacity>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${playPct}%` }]} />
              </View>
              <Text style={styles.audioClock}>
                {formatDuration(Math.round(playMs / 1000))} / {formatDuration(totalSec)}
              </Text>
            </View>

            <Text style={styles.sheetEyebrow}>TRANSCRIPT</Text>
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptText}>
                {activeNote.transcription
                  ? `“${activeNote.transcription}”`
                  : 'No transcription yet — it will appear once processing finishes.'}
              </Text>
            </View>

            <Text style={styles.sheetEyebrow}>MANUAL NOTES</Text>
            <TextInput
              value={manualNote}
              onChangeText={setManualNote}
              onBlur={persistManualNote}
              placeholder="Add context for Monday…"
              placeholderTextColor={Brand.faint}
              multiline
              style={styles.notesInput}
            />

            {/* tag editor — the old Edit screen's tags live here now */}
            <Text style={styles.sheetEyebrow}>SKILL</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.editChipRow}>
                {Object.entries(skillOptions).map(([value, text]) => {
                  const sel = meta.skillCategory === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.editChip, sel && styles.editChipActive]}
                      onPress={() =>
                        persistMeta({ ...meta, skillCategory: sel ? undefined : value })
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.editChipText, sel && styles.editChipTextActive]}>
                        {text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={styles.sheetEyebrow}>POSITION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.editChipRow}>
                {Object.entries(positionOptions).map(([value, text]) => {
                  const sel = meta.position === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.editChip, sel && styles.editChipActive]}
                      onPress={() => persistMeta({ ...meta, position: sel ? undefined : value })}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.editChipText, sel && styles.editChipTextActive]}>
                        {text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={styles.sheetEyebrow}>FEEDBACK TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.editChipRow}>
                {Object.entries(feedbackOptions).map(([value, text]) => {
                  const sel = meta.feedbackType === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.editChip, sel && styles.editChipActive]}
                      onPress={() =>
                        persistMeta({ ...meta, feedbackType: sel ? undefined : value })
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.editChipText, sel && styles.editChipTextActive]}>
                        {text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {roster.length > 0 && (
              <>
                <Text style={styles.sheetEyebrow}>PLAYERS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.editChipRow}>
                    {roster.map((p) => {
                      const first = p.name.split(/\s+/)[0];
                      const tagged = meta.taggedPlayers ?? [];
                      const sel = tagged.some((t) => t === p.name || t === first);
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.editChip, sel && styles.editChipActive]}
                          onPress={() =>
                            persistMeta({
                              ...meta,
                              taggedPlayers: sel
                                ? tagged.filter((t) => t !== p.name && t !== first)
                                : [...tagged, first],
                            })
                          }
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.editChipText, sel && styles.editChipTextActive]}>
                            {p.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}
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
  headerText: {
    flex: 1,
    minWidth: 0,
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
  analysisBtn: {
    marginTop: 12,
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: Brand.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  analysisBtnText: {
    color: '#fff',
    fontSize: 16,
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
    marginTop: 24,
    ...Shape.cardShadow,
  },
  emptyText: {
    fontSize: 13.5,
    color: Brand.muted,
  },
  setList: {
    marginTop: 24,
    gap: 18,
  },
  setEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Brand.muted,
    marginBottom: 10,
  },
  noteList: {
    gap: 10,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: Brand.card,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 15,
    ...Shape.cardShadow,
  },
  playTile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(64,97,58,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteInfo: {
    flex: 1,
    minWidth: 0,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.ink,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  playerChip: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: Brand.greenTint,
  },
  playerChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Brand.green,
  },
  tagChip: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: Brand.hairline,
  },
  tagChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Brand.chip,
  },
  durText: {
    fontSize: 11.5,
    color: Brand.faint,
  },
  // note sheet
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Brand.ink,
    lineHeight: 25,
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetChips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.bg,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.border2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Brand.green,
  },
  audioClock: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Brand.muted,
  },
  sheetEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Brand.muted,
    marginTop: 20,
    marginBottom: 8,
  },
  transcriptBox: {
    backgroundColor: Brand.transcriptBg,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  transcriptText: {
    fontSize: 15.5,
    lineHeight: 24,
    color: Brand.inkSoft,
  },
  notesInput: {
    width: '100%',
    minHeight: 84,
    borderWidth: 1,
    borderColor: Brand.border2,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 15,
    fontSize: 15,
    color: Brand.inkSoft,
    backgroundColor: Brand.card,
    textAlignVertical: 'top',
  },
  editChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editChip: {
    height: 36,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border2,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editChipActive: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  editChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.ink,
  },
  editChipTextActive: {
    color: '#fff',
  },
});
