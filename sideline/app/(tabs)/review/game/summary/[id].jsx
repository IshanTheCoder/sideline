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
import { fetchRosterForUser } from '@/lib/roster';
import { synthesizeNoticedMost, synthesizePostGameSummary, synthesizePlayerSummaries } from '@/lib/summarySynthesis';

function normalizeLabel(s) {
  if (!s || typeof s !== 'string') return '';
  return s.trim().replace(/\s+/g, ' ').slice(0, 80);
}

export default function PostGameSummaryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [rosterNames, setRosterNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [synthesizedThemes, setSynthesizedThemes] = useState([]);
  const [postGameSummary, setPostGameSummary] = useState('');
  const [synthesisLoading, setSynthesisLoading] = useState(false);

  const gameId = useMemo(() => (Array.isArray(id) ? id[0] : id), [id]);

  const loadData = useCallback(async () => {
    if (!user?.id || !gameId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [recResult, rosterResult] = await Promise.all([
      fetchRecordingsForGame(user.id, gameId),
      fetchRosterForUser(user.id),
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
    const names = (rosterResult.data ?? [])
      .map((p) => p.name?.split(' ')[0]?.trim())
      .filter(Boolean);
    setRosterNames(names);
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
  const matchType = useMemo(
    () => recordings[0]?.game_sessions?.match_type ?? null,
    [recordings]
  );

  const volleyballStats = useMemo(() => aggregateVolleyballStats(recordings), [recordings]);

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

  const playerNotesInput = useMemo(() => {
    const items = [];
    for (const rec of recordings) {
      const parsed = parseAiLabels(rec.ai_labels ?? null);
      const label = normalizeLabel(parsed.displayLabel);
      const transcription = (rec.transcription || '').trim();
      if (label) items.push(label);
      if (transcription && transcription !== label) items.push(transcription);
    }
    return [...new Set(items)];
  }, [recordings]);

  const [playerSummaries, setPlayerSummaries] = useState([]);

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
    setPostGameSummary('');
    setPlayerSummaries([]);
  }, [gameId]);

  useEffect(() => {
    if (!noticedMostInput.length && !matchFlow.length && !playerNotesInput.length) {
      setSynthesisLoading(false);
      return;
    }
    let cancelled = false;
    setSynthesisLoading(true);
    const run = async () => {
      const [themesRes, summaryRes, playerRes] = await Promise.all([
        noticedMostInput.length > 0 ? synthesizeNoticedMost(noticedMostInput) : Promise.resolve({ themes: [], error: null }),
        matchFlow.length > 0 ? synthesizePostGameSummary(matchFlow) : Promise.resolve({ summary: '', error: null }),
        playerNotesInput.length > 0 && rosterNames.length > 0
          ? synthesizePlayerSummaries(playerNotesInput, rosterNames)
          : Promise.resolve({ summaries: [], error: null }),
      ]);
      if (cancelled) return;
      setSynthesizedThemes(themesRes.themes ?? []);
      setPostGameSummary(summaryRes.summary ?? '');
      setPlayerSummaries(playerRes.summaries ?? []);
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  }), [isDark]);

  const feedbackBarChartConfig = useMemo(() => ({
    backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
    backgroundGradientFrom: isDark ? '#2A2A2A' : '#F5F5F5',
    backgroundGradientTo: isDark ? '#2A2A2A' : '#F5F5F5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    // Use a vivid orange to match the desired style consistently.
    color: () => 'rgb(229, 105, 71)',
    fillShadowGradient: '#E56947',
    fillShadowGradientFrom: '#E56947',
    fillShadowGradientTo: '#E56947',
    fillShadowGradientFromOpacity: 1,
    fillShadowGradientToOpacity: 1,
    fillShadowGradientOpacity: 1,
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
      legendFontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }));
  }, [volleyballStats.bySkill, isDark]);

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
    return {
      legendFontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      labels,
      datasets: [{
        data,
        // Force a vivid solid orange for each bar across native + web.
        colors: data.map(() => () => '#E56947'),
      }],
    };
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
            <ThemedText style={[styles.subtitle, { opacity: 0.7 }]}>
              {`vs. ${opponentName}${matchType ? ` · ${matchType}` : ''}`}
            </ThemedText>
          ) : null}

          {/* Analytics charts */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>
              SKILL DISTRIBUTION
            </ThemedText>
            {pieChartData && pieChartData.length > 0 ? (
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
            ) : (
              <View style={[styles.insufficientData, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                <IconSymbol name="chart.pie" size={24} color={isDark ? '#666' : '#999'} />
                <ThemedText style={styles.insufficientDataText}>Not enough information</ThemedText>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>
              FEEDBACK BY SET
            </ThemedText>
            {feedbackPerSetData && feedbackPerSetData.datasets[0].data.some((n) => n > 0) ? (
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
                  withCustomBarColorFromData
                  flatColor
                  showBarTops={false}
                  style={styles.feedbackChartStyle}
                />
              </View>
            ) : (
              <View style={[styles.insufficientData, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                <IconSymbol name="chart.bar" size={24} color={isDark ? '#666' : '#999'} />
                <ThemedText style={styles.insufficientDataText}>Not enough information</ThemedText>
              </View>
            )}
          </View>

          {synthesisLoading && (noticedMostInput.length > 0 || matchFlow.length > 0) && (
            <View style={styles.section}>
              <View style={[styles.synthesisLoadingRow, { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F0F0F0' }]}>
                <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].tint} />
                <ThemedText style={styles.synthesisLoadingText}>Synthesizing insights...</ThemedText>
              </View>
            </View>
          )}

          {!synthesisLoading && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>
                COACHING TAKEAWAYS
              </ThemedText>
              {(synthesizedThemes.length > 0 || noticedMost.length > 0) ? (
                (synthesizedThemes.length > 0 ? synthesizedThemes : noticedMost.map((m) => m.text)).map((text, i) => (
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
                ))
              ) : (
                <View style={[styles.insufficientData, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                  <IconSymbol name="eye" size={24} color={isDark ? '#666' : '#999'} />
                  <ThemedText style={styles.insufficientDataText}>Not enough information</ThemedText>
                </View>
              )}
            </View>
          )}

          {!synthesisLoading && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>
                PLAYER-SPECIFIC NOTES
              </ThemedText>
              {playerSummaries.length > 0 ? (
                playerSummaries.map((ps, i) => (
                  <View
                    key={`ps-${ps.name}-${i}`}
                    style={[
                      styles.card,
                      { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F0F0F0' },
                    ]}
                  >
                    <ThemedText style={[styles.playerTag, { color: Colors[colorScheme ?? 'light'].tint }]}>
                      {ps.name}
                    </ThemedText>
                    <ThemedText style={styles.cardText} numberOfLines={2}>
                      {ps.summary}
                    </ThemedText>
                  </View>
                ))
              ) : (
                <View style={[styles.insufficientData, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                  <IconSymbol name="person.text.rectangle" size={24} color={isDark ? '#666' : '#999'} />
                  <ThemedText style={styles.insufficientDataText}>Not enough information</ThemedText>
                </View>
              )}
            </View>
          )}

          {!synthesisLoading && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>POST-GAME SUMMARY</ThemedText>
              {postGameSummary ? (
                <View style={[styles.summaryCard, { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F0F0F0' }]}>
                  <ThemedText style={styles.summaryText}>{postGameSummary}</ThemedText>
                </View>
              ) : (
                <View style={[styles.insufficientData, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                  <IconSymbol name="doc.text" size={24} color={isDark ? '#666' : '#999'} />
                  <ThemedText style={styles.insufficientDataText}>Not enough information</ThemedText>
                </View>
              )}
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
  summaryCard: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
  },
  insufficientData: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  insufficientDataText: {
    fontSize: 14,
    opacity: 0.5,
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
