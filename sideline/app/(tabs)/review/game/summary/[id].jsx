import { useMemo, useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchRecordingsForGame, parseRecordingNotes } from '@/lib/recording';
import {
  parseAiLabels,
  aggregateVolleyballStats,
  SKILL_CATEGORY_LABELS,
} from '@/lib/volleyballVocabulary';
import { getPlayersForGameSession } from '@/lib/roster';
import { synthesizeNoticedMost, synthesizeMatchFlow } from '@/lib/summarySynthesis';

function normalizeLabel(s) {
  if (!s || typeof s !== 'string') return '';
  return s.trim().replace(/\s+/g, ' ').slice(0, 80);
}

/** Rephrase a label for Match Flow so it reads differently from "What You Noticed Most". */
function rephraseForMatchFlow(label, players) {
  if (!label || !players?.length) return label;
  const names = players
    .map((p) => (p && p.name) ? p.name.trim() : '')
    .filter(Boolean)
    .sort((a, b) => b.length - a.length); // longer names first (e.g. "John Maliacal" before "John")
  const lower = label.trim().toLowerCase();
  // If label starts with a player name, move name to end: "Edward split step receiving" → "Split step receiving (Edward)"
  for (const name of names) {
    const n = name.toLowerCase();
    if (lower.startsWith(n)) {
      const rest = label.slice(name.length).trim();
      if (rest) return `${rest} (${name})`;
      return label;
    }
  }
  // If label contains a player name, move it to end: "X John Maliacal Y" → "X Y (John Maliacal)"
  for (const name of names) {
    const n = name.toLowerCase();
    const idx = lower.indexOf(n);
    if (idx !== -1) {
      const before = label.slice(0, idx).trim();
      const after = label.slice(idx + name.length).trim();
      const rest = [before, after].filter(Boolean).join(' ').trim();
      if (rest) return `${rest} (${name})`;
      return label;
    }
  }
  // Fallback: frame as a moment so wording differs
  return label.startsWith('Noted: ') ? label : `Noted: ${label}`;
}

export default function PostGameSummaryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [synthesizedThemes, setSynthesizedThemes] = useState([]);
  const [synthesizedMatchFlowBullets, setSynthesizedMatchFlowBullets] = useState([]);
  const [synthesisLoading, setSynthesisLoading] = useState(false);

  const gameId = useMemo(() => (Array.isArray(id) ? id[0] : id), [id]);

  const loadData = useCallback(async () => {
    if (!user?.id || !gameId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [recResult, playersResult] = await Promise.all([
      fetchRecordingsForGame(user.id, gameId),
      getPlayersForGameSession(gameId),
    ]);
    if (recResult.error) {
      setError(recResult.error.message);
      setRecordings([]);
    } else {
      const sorted = (recResult.data ?? []).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setRecordings(sorted);
    }
    setPlayers(playersResult.players ?? []);
    setLoading(false);
  }, [user?.id, gameId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const opponentName = useMemo(
    () => recordings[0]?.game_sessions?.opponent_name ?? null,
    [recordings]
  );

  const volleyballStats = useMemo(() => aggregateVolleyballStats(recordings), [recordings]);

  const mentionedPlayers = useMemo(() => {
    const names = players.map((p) => p.name).filter(Boolean);
    const count = {};
    names.forEach((name) => { count[name] = 0; });
    recordings.forEach((rec) => {
      const text = [rec.transcription, parseAiLabels(rec.ai_labels ?? null).displayLabel].filter(Boolean).join(' ').toLowerCase();
      names.forEach((name) => {
        if (name && text.includes(name.toLowerCase())) count[name]++;
      });
    });
    return Object.entries(count).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [recordings, players]);

  const noticedMost = useMemo(() => {
    const count = {};
    for (const rec of recordings) {
      const parsed = parseAiLabels(rec.ai_labels ?? null);
      const label = normalizeLabel(parsed.displayLabel);
      if (!label) continue;
      count[label] = (count[label] ?? 0) + 1;
    }
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([text, count]) => ({ text, count }));
  }, [recordings]);

  const nameToNumber = useMemo(() => {
    const map = {};
    players.forEach((p) => {
      if (p.name) map[p.name.toLowerCase().trim()] = p.number || p.name;
    });
    return map;
  }, [players]);

  const playerNotes = useMemo(() => {
    const list = [];
    for (const rec of recordings) {
      const parsed = parseAiLabels(rec.ai_labels ?? null);
      const tagged = parsed.taggedPlayers;
      const label = normalizeLabel(parsed.displayLabel);
      if (!Array.isArray(tagged) || tagged.length === 0 || !label) continue;
      for (const name of tagged) {
        const num = nameToNumber[(name || '').toLowerCase().trim()];
        const displayNum = num != null ? String(num) : (name || '?');
        list.push({ number: displayNum, label });
      }
    }
    return list;
  }, [recordings, nameToNumber]);

  const matchFlow = useMemo(() => {
    return recordings
      .map((rec) => {
        const parsed = parseAiLabels(rec.ai_labels ?? null);
        return normalizeLabel(parsed.displayLabel) || 'Note';
      })
      .filter(Boolean)
      .slice(0, 10);
  }, [recordings]);

  const noticedMostInput = useMemo(() => {
    return recordings
      .map((rec) => {
        const parsed = parseAiLabels(rec.ai_labels ?? null);
        const displayLabel = normalizeLabel(parsed.displayLabel);
        if (!displayLabel) return null;
        return { displayLabel, transcription: rec.transcription ?? '' };
      })
      .filter(Boolean);
  }, [recordings]);

  useEffect(() => {
    setSynthesizedThemes([]);
    setSynthesizedMatchFlowBullets([]);
  }, [gameId]);

  useEffect(() => {
    if (!noticedMostInput.length && !matchFlow.length) {
      setSynthesisLoading(false);
      return;
    }
    let cancelled = false;
    setSynthesisLoading(true);
    const run = async () => {
      const [themesRes, flowRes] = await Promise.all([
        noticedMostInput.length > 0 ? synthesizeNoticedMost(noticedMostInput) : Promise.resolve({ themes: [], error: null }),
        matchFlow.length > 0 ? synthesizeMatchFlow(matchFlow) : Promise.resolve({ bullets: [], error: null }),
      ]);
      if (cancelled) return;
      setSynthesizedThemes(themesRes.themes ?? []);
      setSynthesizedMatchFlowBullets(flowRes.bullets ?? []);
      setSynthesisLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [gameId, recordings]);

  const windowWidth = Dimensions.get('window').width;
  const [containerWidth, setContainerWidth] = useState(
    Platform.OS === 'web' ? Math.min(windowWidth, 440) - 40 : windowWidth - 40
  );
  const screenWidth = containerWidth;
  const tintColor = Colors[colorScheme ?? 'light'].tint;
  const isDark = colorScheme === 'dark';
  const chartConfig = useMemo(() => ({
    backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
    backgroundGradientFrom: isDark ? '#2A2A2A' : '#F8F8F8',
    backgroundGradientTo: isDark ? '#1A1A1A' : '#FFFFFF',
    color: (opacity = 1) => (isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`),
    labelColor: () => (isDark ? '#E0E0E0' : '#333333'),
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 0,
  }), [isDark]);

  const feedbackBarChartConfig = useMemo(() => ({
    backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
    backgroundGradientFrom: isDark ? '#2A2A2A' : '#F5F5F5',
    backgroundGradientTo: isDark ? '#2A2A2A' : '#F5F5F5',
    color: (opacity = 0.3) => (isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`),
    labelColor: () => (isDark ? '#B0B0B0' : '#666666'),
    strokeWidth: 1,
    barPercentage: 0.7,
    decimalPlaces: 0,
    formatYLabel: (value) => String(Math.round(Number(value))),
    propsForBackgroundLines: {
      strokeWidth: 0.5,
      stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      strokeDasharray: '',
    },
    paddingRight: 16,
    paddingTop: 16,
  }), [isDark]);

  const PIE_COLORS = ['#4A90D9', '#7B68EE', '#50C878', '#F4A460', '#E74C3C', '#9B59B6', '#1ABC9C', '#F39C12'];

  // Vibrant bar colors (inspired by modern chart aesthetic: coral, purple, yellow, green, blue + other)
  const FEEDBACK_BAR_COLORS = ['#E07A5F', '#9B59B6', '#F2CC8F', '#81B29A', '#81B5D8', '#95A5A6'];

  const pieChartData = useMemo(() => {
    const entries = Object.entries(volleyballStats.bySkill)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    if (entries.length === 0) return null;
    return entries.map(([key, value], i) => ({
      name: SKILL_CATEGORY_LABELS[key] ?? key,
      population: value,
      color: PIE_COLORS[i % PIE_COLORS.length],
      legendFontColor: isDark ? '#E0E0E0' : '#333333',
    }));
  }, [volleyballStats.bySkill, isDark]);

  const barChartData = useMemo(() => {
    if (mentionedPlayers.length === 0) return null;
    return {
      labels: mentionedPlayers.slice(0, 6).map(([name]) => name.length > 8 ? name.slice(0, 7) + '…' : name),
      datasets: [{ data: mentionedPlayers.slice(0, 6).map(([, count]) => count) }],
    };
  }, [mentionedPlayers]);

  // Feedback (recordings) per set: x = set number, y = count of recordings for that set
  const feedbackPerSetData = useMemo(() => {
    const setOrder = ['Set 1', 'Set 2', 'Set 3', 'Set 4', 'Set 5'];
    const countBySet = {};
    setOrder.forEach((s) => { countBySet[s] = 0; });
    let unsetCount = 0;
    for (const rec of recordings) {
      const { setMarkers } = parseRecordingNotes(rec.manual_notes ?? null);
      const setLabel = setMarkers?.[0]?.label;
      if (setLabel && setOrder.includes(setLabel)) {
        countBySet[setLabel]++;
      } else {
        unsetCount++;
      }
    }
    const labels = [...setOrder];
    const data = setOrder.map((s) => countBySet[s]);
    if (unsetCount > 0) {
      labels.push('Other');
      data.push(unsetCount);
    }
    const hasAny = data.some((n) => n > 0);
    if (!hasAny) return null;
    const colors = labels.map((_, i) => (opacity = 1) => {
      const hex = FEEDBACK_BAR_COLORS[i % FEEDBACK_BAR_COLORS.length].replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${opacity})`;
    });
    return { labels, datasets: [{ data, colors }] };
  }, [recordings]);

  // Alias for backward compatibility (replaced "FEEDBACK OVER TIME" line chart with "FEEDBACK BY SET" bar chart)
  const feedbackTrendData = null;

  const feedbackBarYAxisMax = useMemo(() => {
    if (!feedbackPerSetData?.datasets?.[0]?.data?.length) return 1;
    const data = feedbackPerSetData.datasets[0].data;
    const max = Math.max(...data);
    if (max <= 0) return 1;
    return Math.max(1, max);
  }, [feedbackPerSetData]);

  const handleBack = () => router.back();

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <IconSymbol name="chevron.left" size={28} color={Colors[colorScheme ?? 'light'].text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <IconSymbol name="chevron.left" size={28} color={Colors[colorScheme ?? 'light'].text} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onLayout={(e) => {
            const layoutWidth = e.nativeEvent.layout.width;
            if (layoutWidth > 0) {
              setContainerWidth(layoutWidth - 40);
            }
          }}
        >
          <ThemedText style={styles.pageTitle} numberOfLines={2}>Post-Game Summary</ThemedText>
          {opponentName ? (
            <ThemedText style={[styles.subtitle, { opacity: 0.7 }]}>vs. {opponentName}</ThemedText>
          ) : null}

          {/* Analytics charts */}
          {pieChartData && pieChartData.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>
                SKILL DISTRIBUTION
              </ThemedText>
              <View style={[styles.chartWrapper, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                <PieChart
                  data={pieChartData}
                  width={screenWidth}
                  height={200}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="12"
                  absolute
                />
              </View>
            </View>
          )}

          {barChartData && barChartData.labels.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>
                PLAYER MENTIONS
              </ThemedText>
              <View style={[styles.chartWrapper, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                <BarChart
                  data={barChartData}
                  width={screenWidth}
                  height={220}
                  chartConfig={{ ...chartConfig, color: () => tintColor }}
                  yAxisLabel=""
                  yAxisSuffix=""
                  fromZero
                  showBarTops={false}
                  style={styles.chartStyle}
                />
              </View>
            </View>
          )}

          {feedbackPerSetData && feedbackPerSetData.datasets[0].data.some((n) => n > 0) && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>
                FEEDBACK BY SET
              </ThemedText>
              <View style={[styles.chartWrapper, styles.feedbackChartWrapper, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                <BarChart
                  data={feedbackPerSetData}
                  width={screenWidth}
                  height={240}
                  chartConfig={feedbackBarChartConfig}
                  yAxisLabel=""
                  yAxisSuffix=""
                  fromZero
                  fromNumber={feedbackBarYAxisMax}
                  segments={feedbackBarYAxisMax}
                  showBarTops={false}
                  withCustomBarColorFromData
                  flatColor
                  style={styles.feedbackChartStyle}
                />
              </View>
            </View>
          )}

          {(synthesisLoading && (noticedMostInput.length > 0 || matchFlow.length > 0)) && (
            <View style={styles.section}>
              <View style={[styles.synthesisLoadingRow, { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F0F0F0' }]}>
                <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].tint} />
                <ThemedText style={styles.synthesisLoadingText}>Synthesizing insights...</ThemedText>
              </View>
            </View>
          )}

          {!synthesisLoading && (synthesizedThemes.length > 0 || noticedMost.length > 0) && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>
                WHAT YOU NOTICED MOST
              </ThemedText>
              {(synthesizedThemes.length > 0 ? synthesizedThemes : noticedMost.map((m) => m.text)).map((text, i) => (
                <View
                  key={`theme-${i}`}
                  style={[
                    styles.card,
                    { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F0F0F0' },
                  ]}
                >
                  <View style={[styles.themeBullet, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} />
                  <ThemedText style={styles.cardText} numberOfLines={3}>
                    {text}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {playerNotes.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>
                PLAYER-SPECIFIC NOTES
              </ThemedText>
              {playerNotes.map((note, i) => (
                <View
                  key={`${note.number}-${note.label}-${i}`}
                  style={[
                    styles.card,
                    { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F0F0F0' },
                  ]}
                >
                  <ThemedText style={[styles.playerTag, { color: Colors[colorScheme ?? 'light'].tint }]}>
                    #{note.number}
                  </ThemedText>
                  <ThemedText style={styles.cardText} numberOfLines={2}>
                    {note.label}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {!synthesisLoading && (synthesizedMatchFlowBullets.length > 0 || matchFlow.length > 0) && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>MATCH FLOW</ThemedText>
              {(synthesizedMatchFlowBullets.length > 0 ? synthesizedMatchFlowBullets : matchFlow.map((l) => rephraseForMatchFlow(l, players))).map((sentence, i) => (
                <View key={`flow-${i}`} style={styles.flowRow}>
                  <View style={[styles.bullet, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} />
                  <ThemedText style={styles.flowText} numberOfLines={4}>
                    {typeof sentence === 'string' ? sentence.replace(/\.+$/, '') : sentence}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {!synthesisLoading && synthesizedThemes.length === 0 && synthesizedMatchFlowBullets.length === 0 && noticedMost.length === 0 && matchFlow.length === 0 && playerNotes.length === 0 && (
            <View style={styles.emptySection}>
              <ThemedText style={[styles.emptyText, { opacity: 0.7 }]}>
                No insights yet. Record and label plays during the game to see match reflection here.
              </ThemedText>
            </View>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 17,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    paddingRight: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  chartWrapper: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  chartStyle: {
    borderRadius: 12,
  },
  feedbackChartWrapper: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  feedbackChartStyle: {
    borderRadius: 12,
    marginLeft: -8,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  synthesisLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  synthesisLoadingText: {
    fontSize: 14,
    opacity: 0.8,
  },
  themeBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  countBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  playerTag: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 4,
  },
  cardText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  flowText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  emptySection: {
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
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
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.8,
  },
});
