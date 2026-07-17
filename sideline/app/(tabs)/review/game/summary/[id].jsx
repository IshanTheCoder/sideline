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
import { synthesizeNoticedMost, synthesizePostGameSummary, synthesizePlayerSummaries, synthesizeOpponentScoutingReport } from '@/lib/summarySynthesis';

function normalizeLabel(s) {
  if (!s || typeof s !== 'string') return '';
  return s.trim().replace(/\s+/g, ' ').slice(0, 80);
}

// fixed color per skill category so chips stay consistent across games
const SKILL_CHIP_COLORS = {
  serving: '#4A90D9',
  passing: '#50C878',
  setting: '#7B68EE',
  attacking: '#E74C3C',
  blocking: '#F4A460',
  defense: '#1ABC9C',
  transition: '#9B59B6',
  communication: '#F39C12',
  positioning: '#5D8AA8',
  strategy: '#E56947',
};

// priority 1 = cost us points (red), 2 = clear correction (amber), 3 = minor note (gray)
const PRIORITY_COLORS = { 1: '#E74C3C', 2: '#F39C12', 3: '#95A5A6' };

export default function PostGameSummaryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [rosterNames, setRosterNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [takeaways, setTakeaways] = useState([]); // { text, skill, players, priority }[]
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

  // Split notes into observations about our own team vs. scouting notes about the opponent.
  const ownRecordings = useMemo(
    () => recordings.filter((rec) => !parseAiLabels(rec.ai_labels ?? null).isOpponentNote),
    [recordings]
  );
  const opponentRecordings = useMemo(
    () => recordings.filter((rec) => parseAiLabels(rec.ai_labels ?? null).isOpponentNote),
    [recordings]
  );

  // Own-team stats aggregate ONLY own-team notes — an opponent's tagged position/skill
  // (e.g. scouting "their outside hitter") must not skew the coach's own Skill Distribution,
  // Focus Areas, or Feedback-by-Set numbers.
  const volleyballStats = useMemo(() => aggregateVolleyballStats(ownRecordings), [ownRecordings]);

  const noticedMost = useMemo(() => {
    const count = {};
    for (const rec of ownRecordings) {
      const parsed = parseAiLabels(rec.ai_labels ?? null);
      const label = normalizeLabel(parsed.displayLabel);
      if (!label) continue;
      count[label] = (count[label] ?? 0) + 1;
    }
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([text, count]) => ({ text, count }));
  }, [ownRecordings]);

  const playerNotesInput = useMemo(() => {
    const items = [];
    for (const rec of ownRecordings) {
      const parsed = parseAiLabels(rec.ai_labels ?? null);
      const label = normalizeLabel(parsed.displayLabel);
      const transcription = (rec.transcription || '').trim();
      if (label) items.push(label);
      if (transcription && transcription !== label) items.push(transcription);
    }
    return [...new Set(items)];
  }, [ownRecordings]);

  const [playerSummaries, setPlayerSummaries] = useState([]);
  const [scoutingPoints, setScoutingPoints] = useState([]);

  const matchFlow = useMemo(() => {
    return ownRecordings
      .map((rec) => {
        const parsed = parseAiLabels(rec.ai_labels ?? null);
        return normalizeLabel(parsed.displayLabel) || 'Note';
      })
      .filter(Boolean)
      .slice(0, 10);
  }, [ownRecordings]);

  const noticedMostInput = useMemo(() => {
    return ownRecordings
      .map((rec) => {
        const parsed = parseAiLabels(rec.ai_labels ?? null);
        const displayLabel = normalizeLabel(parsed.displayLabel);
        if (!displayLabel) return null;
        return { displayLabel, transcription: rec.transcription ?? '' };
      })
      .filter(Boolean);
  }, [ownRecordings]);

  const opponentNotesInput = useMemo(() => {
    return opponentRecordings
      .map((rec) => {
        const parsed = parseAiLabels(rec.ai_labels ?? null);
        const displayLabel = normalizeLabel(parsed.displayLabel);
        if (!displayLabel) return null;
        return { displayLabel, transcription: rec.transcription ?? '' };
      })
      .filter(Boolean);
  }, [opponentRecordings]);

  // Fallback shown when AI synthesis is unavailable: raw opponent labels by frequency.
  const opponentNoticedMost = useMemo(() => {
    const count = {};
    for (const rec of opponentRecordings) {
      const label = normalizeLabel(parseAiLabels(rec.ai_labels ?? null).displayLabel);
      if (!label) continue;
      count[label] = (count[label] ?? 0) + 1;
    }
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([text]) => text);
  }, [opponentRecordings]);

  useEffect(() => {
    setTakeaways([]);
    setPostGameSummary('');
    setPlayerSummaries([]);
    setScoutingPoints([]);
  }, [gameId]);

  useEffect(() => {
    if (!noticedMostInput.length && !matchFlow.length && !playerNotesInput.length && !opponentNotesInput.length) {
      setSynthesisLoading(false);
      return;
    }
    let cancelled = false;
    setSynthesisLoading(true);
    const run = async () => {
      try {
        const [themesRes, summaryRes, playerRes, scoutingRes] = await Promise.all([
          noticedMostInput.length > 0 ? synthesizeNoticedMost(noticedMostInput) : Promise.resolve({ takeaways: [], themes: [], error: null }),
          matchFlow.length > 0 ? synthesizePostGameSummary(matchFlow) : Promise.resolve({ summary: '', error: null }),
          playerNotesInput.length > 0 && rosterNames.length > 0
            ? synthesizePlayerSummaries(playerNotesInput, rosterNames)
            : Promise.resolve({ summaries: [], error: null }),
          opponentNotesInput.length > 0
            ? synthesizeOpponentScoutingReport(opponentNotesInput, opponentName ?? '')
            : Promise.resolve({ points: [], error: null }),
        ]);
        if (cancelled) return;
        setTakeaways(themesRes.takeaways ?? []);
        setPostGameSummary(summaryRes.summary ?? '');
        setPlayerSummaries(playerRes.summaries ?? []);
        setScoutingPoints(scoutingRes.points ?? []);
      } catch (err) {
        console.error('Synthesis failed:', err);
      } finally {
        // always clear the spinner, even if a synth call throws — otherwise the
        // screen gets stuck on "Synthesizing insights..." forever
        if (!cancelled) setSynthesisLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [gameId, recordings]);

  // Focus Areas: pure computation from label metadata — works even when the LLM
  // is down, and gives the coach a ranked "what ate my attention" view at a glance
  const focusAreas = useMemo(() => {
    const entries = Object.entries(volleyballStats.bySkill).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return [];
    const total = entries.reduce((sum, [, n]) => sum + n, 0);
    return entries.slice(0, 3).map(([skill, count]) => ({
      skill,
      label: SKILL_CATEGORY_LABELS[skill] ?? skill,
      count,
      share: total > 0 ? count / total : 0,
    }));
  }, [volleyballStats.bySkill]);

  // note count per player, from taggedPlayers metadata — powers the badge on player cards.
  // Own-team notes only; opponent scouting notes carry no roster players anyway, but scope
  // this to ownRecordings so the counts always mean "notes about my player".
  const playerNoteCounts = useMemo(() => {
    const counts = {};
    for (const rec of ownRecordings) {
      const parsed = parseAiLabels(rec.ai_labels ?? null);
      for (const name of parsed.taggedPlayers ?? []) {
        const first = name.split(' ')[0];
        counts[first] = (counts[first] ?? 0) + 1;
      }
    }
    return counts;
  }, [ownRecordings]);

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

  // Feedback (own-team notes) per set: x = set number, y = count of notes for that set.
  // Own-team only so opponent scouting notes don't inflate the coach's per-set feedback volume.
  const feedbackPerSetData = useMemo(() => {
    const setOrder = ['Set 1', 'Set 2', 'Set 3', 'Set 4', 'Set 5'];
    const countBySet = {};
    setOrder.forEach((s) => { countBySet[s] = 0; });
    let unsetCount = 0;
    for (const rec of ownRecordings) {
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
  }, [ownRecordings]);

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

          {synthesisLoading && (noticedMostInput.length > 0 || matchFlow.length > 0 || opponentNotesInput.length > 0) && (
            <View style={styles.section}>
              <View style={[styles.synthesisLoadingRow, { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F0F0F0' }]}>
                <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].tint} />
                <ThemedText style={styles.synthesisLoadingText}>Synthesizing insights...</ThemedText>
              </View>
            </View>
          )}

          {/* Focus Areas — computed locally, never blocked on the LLM */}
          {focusAreas.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>
                FOCUS AREAS
              </ThemedText>
              {focusAreas.map((fa) => (
                <View
                  key={`fa-${fa.skill}`}
                  style={[styles.focusRow, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}
                >
                  <View style={styles.focusHeader}>
                    <ThemedText style={styles.focusLabel}>{fa.label}</ThemedText>
                    <ThemedText style={styles.focusCount}>
                      {fa.count} {fa.count === 1 ? 'note' : 'notes'}
                    </ThemedText>
                  </View>
                  <View style={[styles.focusBarTrack, { backgroundColor: isDark ? '#3A3A3A' : '#E0E0E0' }]}>
                    <View
                      style={[
                        styles.focusBarFill,
                        {
                          width: `${Math.max(6, Math.round(fa.share * 100))}%`,
                          backgroundColor: SKILL_CHIP_COLORS[fa.skill] ?? '#888',
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {!synthesisLoading && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>
                COACHING TAKEAWAYS
              </ThemedText>
              {(takeaways.length > 0 || noticedMost.length > 0) ? (
                (takeaways.length > 0
                  ? takeaways
                  : noticedMost.map((m) => ({ text: m.text, skill: null, players: [], priority: 2 }))
                ).map((tk, i) => (
                  <View
                    key={`tk-${i}`}
                    style={[
                      styles.takeawayCard,
                      { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F0F0F0' },
                    ]}
                  >
                    <View style={styles.takeawayTopRow}>
                      <View style={[styles.themeBullet, { backgroundColor: PRIORITY_COLORS[tk.priority] ?? PRIORITY_COLORS[2] }]} />
                      <ThemedText style={styles.cardText} numberOfLines={3}>
                        {tk.text}
                      </ThemedText>
                    </View>
                    {(tk.skill || tk.players.length > 0) && (
                      <View style={styles.chipRow}>
                        {tk.skill && (
                          <View style={[styles.chip, { backgroundColor: `${SKILL_CHIP_COLORS[tk.skill] ?? '#888'}22`, borderColor: SKILL_CHIP_COLORS[tk.skill] ?? '#888' }]}>
                            <ThemedText style={[styles.chipText, { color: SKILL_CHIP_COLORS[tk.skill] ?? '#888' }]}>
                              {SKILL_CATEGORY_LABELS[tk.skill] ?? tk.skill}
                            </ThemedText>
                          </View>
                        )}
                        {tk.players.map((p) => (
                          <View key={`p-${p}`} style={[styles.chip, styles.playerChip, { borderColor: isDark ? '#555' : '#CCC' }]}>
                            <ThemedText style={styles.chipText}>{p}</ThemedText>
                          </View>
                        ))}
                      </View>
                    )}
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
                    {playerNoteCounts[ps.name] > 0 && (
                      <View style={[styles.noteCountBadge, { backgroundColor: isDark ? '#3A3A3A' : '#E4E4E4' }]}>
                        <ThemedText style={styles.noteCountText}>
                          {playerNoteCounts[ps.name]} {playerNoteCounts[ps.name] === 1 ? 'note' : 'notes'}
                        </ThemedText>
                      </View>
                    )}
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

          {/* Scouting report — coach's observations about the opposing team (extra section) */}
          {!synthesisLoading && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, styles.scoutingHeading]}>
                {opponentName ? `SCOUTING: ${opponentName.toUpperCase()}` : 'OPPONENT NOTES'}
              </ThemedText>
              {(scoutingPoints.length > 0 || opponentNoticedMost.length > 0) ? (
                (scoutingPoints.length > 0 ? scoutingPoints : opponentNoticedMost).map((text, i) => (
                  <View
                    key={`scout-${i}`}
                    style={[
                      styles.card,
                      styles.scoutingCard,
                      { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F0F0F0' },
                    ]}
                  >
                    <View style={[styles.themeBullet, { backgroundColor: '#E56947' }]} />
                    <ThemedText style={styles.cardText} numberOfLines={3}>
                      {text}
                    </ThemedText>
                  </View>
                ))
              ) : (
                <View style={[styles.insufficientData, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                  <IconSymbol name="eye" size={24} color={isDark ? '#666' : '#999'} />
                  <ThemedText style={styles.insufficientDataText}>No opponent notes yet</ThemedText>
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
  scoutingHeading: {
    color: '#E56947',
    opacity: 1,
  },
  scoutingCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#E56947',
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
  takeawayCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 8,
  },
  takeawayTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginLeft: 20,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  playerChip: {
    backgroundColor: 'transparent',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  focusRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  focusLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  focusCount: {
    fontSize: 13,
    opacity: 0.6,
  },
  focusBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  focusBarFill: {
    height: 6,
    borderRadius: 3,
  },
  noteCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  noteCountText: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
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
