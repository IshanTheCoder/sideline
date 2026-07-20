/**
 * Game Analysis — redesign: dark "do one thing" hero, an AT A GLANCE row
 * (svg donut of notes by type + notes-by-set columns), prioritized player
 * cards with drill suggestions, focus-area bars, a numbered practice plan,
 * and the opponent scouting report. All synthesized from the game's real
 * notes via Groq, with data-only fallbacks when AI is unavailable.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, Eye } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Brand, ChartAccents, Shape, playerAccent } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { fetchRecordingsForGame, parseRecordingNotes } from '@/lib/recording';
import { fetchRosterForUser } from '@/lib/roster';
import {
  synthesizeOpponentScoutingReport,
  synthesizePracticePlan,
} from '@/lib/summarySynthesis';
import {
  FEEDBACK_TYPE_LABELS,
  SKILL_CATEGORY_LABELS,
  parseAiLabels,
} from '@/lib/volleyballVocabulary';

const setNumberFor = (rec) => {
  const { setMarkers } = parseRecordingNotes(rec.manual_notes);
  const m = setMarkers?.[0]?.label?.match(/(\d+)/);
  return m ? Number(m[1]) : 1;
};

function Donut({ segments, total }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const gap = 5;
  let acc = 0;
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      <Circle cx={60} cy={60} r={R} fill="none" stroke={Brand.hairline} strokeWidth={15} />
      {segments.map((s, i) => {
        const full = total > 0 ? (C * s.count) / total : 0;
        const dash = Math.max(0, full - gap);
        const offset = -acc;
        acc += full;
        if (dash <= 0) return null;
        return (
          <Circle
            key={i}
            cx={60}
            cy={60}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={15}
            strokeLinecap="round"
            strokeDasharray={`${dash.toFixed(1)} ${(C - dash).toFixed(1)}`}
            strokeDashoffset={offset.toFixed(1)}
            transform="rotate(-90 60 60)"
          />
        );
      })}
      <SvgText x={60} y={57} textAnchor="middle" fontSize={28} fontWeight="800" fill={Brand.ink}>
        {total}
      </SvgText>
      <SvgText x={60} y={73} textAnchor="middle" fontSize={10} fontWeight="600" letterSpacing={0.5} fill={Brand.muted}>
        NOTES
      </SvgText>
    </Svg>
  );
}

export default function GameAnalysisScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [recordings, setRecordings] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [practice, setPractice] = useState({ hero: null, players: [], plan: [] });
  const [scouting, setScouting] = useState([]);

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    try {
      const { data } = await fetchRecordingsForGame(user.id, String(id));
      const recs = data ?? [];
      setRecordings(recs);
      const { data: players } = await fetchRosterForUser(user.id);
      setRoster(players ?? []);
      setLoading(false);

      // AI synthesis in the background — data sections render immediately
      setAiLoading(true);
      const parsed = recs.map((r) => ({ rec: r, meta: parseAiLabels(r.ai_labels) }));
      const own = parsed.filter((p) => !p.meta.isOpponentNote);
      const opp = parsed.filter((p) => p.meta.isOpponentNote);
      const ownItems = own
        .filter((p) => p.meta.displayLabel || p.rec.transcription)
        .map((p) => ({ displayLabel: p.meta.displayLabel, transcription: p.rec.transcription ?? undefined }));
      const oppItems = opp
        .filter((p) => p.meta.displayLabel || p.rec.transcription)
        .map((p) => ({ displayLabel: p.meta.displayLabel, transcription: p.rec.transcription ?? undefined }));
      const opponentName = recs[0]?.game_sessions?.opponent_name ?? '';

      const [planRes, scoutRes] = await Promise.all([
        synthesizePracticePlan(ownItems),
        oppItems.length
          ? synthesizeOpponentScoutingReport(oppItems, opponentName)
          : Promise.resolve({ points: [], error: null }),
      ]);
      if (!planRes.error) {
        setPractice({ hero: planRes.hero, players: planRes.players, plan: planRes.plan });
      }
      setScouting(scoutRes.points ?? []);
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  }, [user?.id, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const parsedAll = useMemo(
    () => recordings.map((r) => ({ rec: r, meta: parseAiLabels(r.ai_labels) })),
    [recordings]
  );
  const ownNotes = useMemo(() => parsedAll.filter((p) => !p.meta.isOpponentNote), [parsedAll]);
  const opponent = recordings[0]?.game_sessions?.opponent_name ?? 'Game';
  const totalNotes = ownNotes.length;

  // Scouting fallback when AI is unavailable (matches the previous summary
  // screen): raw opponent-note labels ranked by how often they were repeated.
  const scoutingFallback = useMemo(() => {
    const counts = new Map();
    for (const p of parsedAll) {
      if (!p.meta.isOpponentNote) continue;
      const label = p.meta.displayLabel?.trim();
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, c]) => (c > 1 ? `${label} (noted ${c}×)` : label));
  }, [parsedAll]);
  const scoutingPoints = scouting.length > 0 ? scouting : scoutingFallback;
  const hasOpponentNotes = useMemo(
    () => parsedAll.some((p) => p.meta.isOpponentNote),
    [parsedAll]
  );

  // donut: notes by feedback type (top 3)
  const donutSegments = useMemo(() => {
    const counts = new Map();
    for (const p of ownNotes) {
      const key = p.meta.feedbackType ?? 'other';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key, count], i) => ({
        name: key === 'other' ? 'Other' : FEEDBACK_TYPE_LABELS[key] ?? key,
        count,
        color: ChartAccents.donut[i],
      }));
  }, [ownNotes]);
  const donutTotal = donutSegments.reduce((a, s) => a + s.count, 0);

  // column chart: notes by set
  const notesBySet = useMemo(() => {
    const counts = new Map();
    for (const p of ownNotes) {
      const n = setNumberFor(p.rec);
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    const entries = [...counts.entries()].sort((a, b) => a[0] - b[0]);
    const max = Math.max(1, ...entries.map(([, c]) => c));
    return entries.map(([n, c]) => ({ label: `S${n}`, count: c, pct: c / max }));
  }, [ownNotes]);

  // focus areas: skills by count
  const focusAreas = useMemo(() => {
    const counts = new Map();
    for (const p of ownNotes) {
      if (!p.meta.skillCategory) continue;
      counts.set(p.meta.skillCategory, (counts.get(p.meta.skillCategory) ?? 0) + 1);
    }
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const max = Math.max(1, ...entries.map(([, c]) => c));
    return entries.map(([skill, count], i) => ({
      name: SKILL_CATEGORY_LABELS[skill] ?? skill,
      count,
      pct: count / max,
      color: ChartAccents.focus[i % ChartAccents.focus.length],
    }));
  }, [ownNotes]);

  // per-player note counts + roster info for the player cards
  const playerMeta = useMemo(() => {
    const counts = new Map();
    for (const p of ownNotes) {
      for (const name of p.meta.taggedPlayers ?? []) {
        const first = String(name).split(/\s+/)[0];
        counts.set(first.toLowerCase(), (counts.get(first.toLowerCase()) ?? 0) + 1);
      }
    }
    return (first) => {
      const key = String(first).split(/\s+/)[0].toLowerCase();
      const rosterEntry = roster.find((r) => r.name.toLowerCase().startsWith(key));
      return {
        count: counts.get(key) ?? 0,
        pos: rosterEntry?.position ?? '',
        num: rosterEntry?.number ?? '',
        fullName: rosterEntry?.name ?? first,
      };
    };
  }, [ownNotes, roster]);

  // hero fallback straight from the data when AI is unavailable
  const hero = practice.hero
    ? practice.hero
    : focusAreas.length > 0
      ? {
          drill: `${focusAreas[0].name} reps.`,
          evidence: `${focusAreas[0].count} of your ${totalNotes} notes were about ${focusAreas[0].name.toLowerCase()}.`,
        }
      : null;

  const priorityCount = Math.min(3, practice.plan.length || focusAreas.length);

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
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color={Brand.ink} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              Game Analysis
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              vs. {opponent} · {totalNotes} note{totalNotes === 1 ? '' : 's'}
              {priorityCount > 0 ? ` → ${priorityCount} priorities` : ''}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Brand.green} />
          </View>
        ) : totalNotes === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No notes to analyze for this game yet.</Text>
          </View>
        ) : (
          <>
            {/* do-one-thing hero */}
            {hero && (
              <View style={styles.hero}>
                <Text style={styles.heroEyebrow}>NEXT PRACTICE, DO ONE THING</Text>
                <Text style={styles.heroDrill}>{hero.drill}</Text>
                {!!hero.evidence && <Text style={styles.heroEvidence}>{hero.evidence}</Text>}
                {aiLoading && !practice.hero && (
                  <View style={styles.heroLoadingRow}>
                    <ActivityIndicator size="small" color={Brand.greenPale} />
                    <Text style={styles.heroLoadingText}>Refining with AI…</Text>
                  </View>
                )}
              </View>
            )}

            {/* at a glance */}
            <Text style={styles.eyebrow}>AT A GLANCE</Text>
            <View style={styles.glanceRow}>
              <View style={styles.glanceCard}>
                <Donut segments={donutSegments} total={donutTotal || totalNotes} />
                <View style={styles.legend}>
                  {donutSegments.map((s) => (
                    <View key={s.name} style={styles.legendRow}>
                      <View style={[styles.legendSwatch, { backgroundColor: s.color }]} />
                      <Text style={styles.legendName}>{s.name}</Text>
                      <Text style={styles.legendCount}>{s.count}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.glanceCard}>
                <Text style={styles.glanceTitle}>Notes by set</Text>
                <View style={styles.columns}>
                  {notesBySet.map((s) => (
                    <View key={s.label} style={styles.column}>
                      <Text style={styles.columnCount}>{s.count}</Text>
                      <View style={[styles.columnBar, { height: Math.round(12 + s.pct * 46) }]} />
                      <Text style={styles.columnLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* players */}
            {(practice.players.length > 0 || aiLoading) && (
              <>
                <Text style={styles.eyebrow}>PLAYERS · PRIORITIZED</Text>
                {practice.players.length === 0 && aiLoading ? (
                  <View style={styles.aiLoadingCard}>
                    <ActivityIndicator size="small" color={Brand.green} />
                    <Text style={styles.aiLoadingText}>Analyzing player notes…</Text>
                  </View>
                ) : (
                  <View style={styles.cardList}>
                    {practice.players.map((p) => {
                      const info = playerMeta(p.name);
                      const accent = playerAccent(roster, p.name);
                      return (
                        <View key={p.name} style={styles.playerCard}>
                          <View style={styles.playerHead}>
                            <View style={[styles.playerAvatar, { backgroundColor: accent.bg }]}>
                              <Text style={[styles.playerAvatarText, { color: accent.ink }]}>
                                {info.num || p.name.slice(0, 2).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.playerHeadInfo}>
                              <Text style={styles.playerName}>{info.fullName}</Text>
                              <Text style={styles.playerSub}>
                                {[info.pos, info.count ? `${info.count} note${info.count === 1 ? '' : 's'}` : null]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.playerInsight}>{p.insight}</Text>
                          {!!p.drill && (
                            <View style={styles.drillPill}>
                              <CheckCircle2 size={14} color={Brand.green} strokeWidth={2.2} />
                              <Text style={styles.drillText}>Drill: {p.drill}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {/* focus areas */}
            {focusAreas.length > 0 && (
              <>
                <Text style={styles.eyebrow}>FOCUS AREAS</Text>
                <View style={styles.focusCard}>
                  {focusAreas.map((f) => (
                    <View key={f.name}>
                      <View style={styles.focusHead}>
                        <Text style={styles.focusName}>{f.name}</Text>
                        <Text style={styles.focusCount}>
                          {f.count} note{f.count === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <View style={styles.focusTrack}>
                        <View
                          style={[
                            styles.focusFill,
                            { width: `${Math.round(f.pct * 100)}%`, backgroundColor: f.color },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* practice plan */}
            {practice.plan.length > 0 && (
              <>
                <Text style={styles.eyebrow}>PRACTICE PLAN</Text>
                <View style={styles.cardList}>
                  {practice.plan.map((d, i) => (
                    <View key={d.name} style={styles.planRow}>
                      <View style={styles.planNum}>
                        <Text style={styles.planNumText}>{i + 1}</Text>
                      </View>
                      <View style={styles.planInfo}>
                        <Text style={styles.planName}>{d.name}</Text>
                        {!!d.why && <Text style={styles.planWhy}>{d.why}</Text>}
                      </View>
                      {!!d.mins && <Text style={styles.planMins}>{d.mins}</Text>}
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* opponent scouting — retained from the previous summary screen.
                Always shown: data-derived labels appear instantly, the AI
                report replaces them, and an empty state explains how to fill
                it when no opponent notes were tagged this game. */}
            <Text style={styles.eyebrow}>OPPONENT SCOUTING · {opponent.toUpperCase()}</Text>
            {scoutingPoints.length > 0 ? (
              <View style={styles.scoutCard}>
                {scoutingPoints.map((point, i) => (
                  <View key={i} style={[styles.scoutRow, i > 0 && styles.scoutRowBorder]}>
                    <Eye size={15} color={Brand.green} strokeWidth={2.2} style={styles.scoutIcon} />
                    <Text style={styles.scoutText}>{point}</Text>
                  </View>
                ))}
                {hasOpponentNotes && aiLoading && scouting.length === 0 && (
                  <View style={[styles.scoutRow, styles.scoutRowBorder]}>
                    <ActivityIndicator size="small" color={Brand.green} style={styles.scoutIcon} />
                    <Text style={styles.scoutText}>Sharpening these into a scouting report…</Text>
                  </View>
                )}
              </View>
            ) : hasOpponentNotes && aiLoading ? (
              <View style={styles.aiLoadingCard}>
                <ActivityIndicator size="small" color={Brand.green} />
                <Text style={styles.aiLoadingText}>Building the scouting report…</Text>
              </View>
            ) : (
              <View style={styles.scoutEmptyCard}>
                <Eye size={22} color={Brand.green} strokeWidth={1.8} />
                <Text style={styles.scoutEmptyText}>
                  No opponent notes this game. During capture, note what the other team does
                  (“their outside only swings line”) and it lands here as a scouting report.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    padding: 18,
    marginTop: 18,
    ...Shape.cardShadow,
  },
  emptyText: {
    fontSize: 13.5,
    color: Brand.muted,
  },
  hero: {
    backgroundColor: Brand.ink,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginTop: 18,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Brand.greenPale,
  },
  heroDrill: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 26.5,
    color: '#fff',
    marginTop: 8,
  },
  heroEvidence: {
    fontSize: 14,
    color: Brand.onDarkMuted,
    lineHeight: 21,
    marginTop: 6,
  },
  heroLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  heroLoadingText: {
    fontSize: 12,
    color: Brand.greenPale,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Brand.muted,
    marginTop: 22,
    marginBottom: 10,
  },
  glanceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  glanceCard: {
    flex: 1,
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    padding: 16,
    alignItems: 'center',
    ...Shape.cardShadow,
  },
  legend: {
    gap: 6,
    marginTop: 12,
    width: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  legendSwatch: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  legendName: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: Brand.ink,
  },
  legendCount: {
    fontSize: 12.5,
    color: Brand.muted,
  },
  glanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.ink,
    alignSelf: 'flex-start',
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
    gap: 10,
    height: 104,
    marginTop: 14,
    alignSelf: 'stretch',
  },
  column: {
    flex: 1,
    maxWidth: 52,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  columnCount: {
    fontSize: 12,
    fontWeight: '800',
    color: Brand.green,
  },
  columnBar: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: Brand.green,
  },
  columnLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Brand.muted,
  },
  cardList: {
    gap: 10,
  },
  aiLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    padding: 16,
    ...Shape.cardShadow,
  },
  aiLoadingText: {
    fontSize: 13.5,
    color: Brand.muted,
  },
  playerCard: {
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    padding: 16,
    ...Shape.cardShadow,
  },
  playerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Brand.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.green,
  },
  playerHeadInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.ink,
  },
  playerSub: {
    fontSize: 12.5,
    color: Brand.muted,
  },
  playerInsight: {
    fontSize: 14.5,
    lineHeight: 21.5,
    color: Brand.inkSoft,
    marginTop: 12,
  },
  drillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.greenDrillBg,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  drillText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Brand.green,
  },
  focusCard: {
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    padding: 16,
    gap: 14,
    ...Shape.cardShadow,
  },
  focusHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  focusName: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.ink,
  },
  focusCount: {
    fontSize: 14,
    fontWeight: '500',
    color: Brand.muted,
  },
  focusTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: Brand.hairline,
    overflow: 'hidden',
  },
  focusFill: {
    height: '100%',
    borderRadius: 4,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: Brand.card,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...Shape.cardShadow,
  },
  planNum: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Brand.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.ink,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.ink,
  },
  planWhy: {
    fontSize: 12.5,
    color: Brand.muted,
    marginTop: 1,
  },
  planMins: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.muted,
  },
  scoutCard: {
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    ...Shape.cardShadow,
  },
  scoutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  scoutRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Brand.hairline,
  },
  scoutIcon: {
    marginTop: 2,
  },
  scoutText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: Brand.inkSoft,
  },
  scoutEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    padding: 16,
    ...Shape.cardShadow,
  },
  scoutEmptyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: Brand.muted,
  },
});
