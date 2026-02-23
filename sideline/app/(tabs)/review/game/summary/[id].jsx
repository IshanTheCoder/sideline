import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
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
import { fetchRecordingsForGame } from '@/lib/recording';
import { parseAiLabels } from '@/lib/volleyballVocabulary';
import { getPlayersForGameSession } from '@/lib/roster';

function normalizeLabel(s) {
  if (!s || typeof s !== 'string') return '';
  return s.trim().replace(/\s+/g, ' ').slice(0, 80);
}

export default function MatchReflectionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const opponentName = useMemo(
    () => recordings[0]?.game_sessions?.opponent_name ?? null,
    [recordings]
  );

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

  const handleBack = () => router.back();

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <IconSymbol name="chevron.left" size={28} color={Colors[colorScheme ?? 'light'].text} />
            <ThemedText style={styles.backText}>Back</ThemedText>
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
          <ThemedText style={styles.backText}>Back</ThemedText>
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
        >
          <ThemedText style={styles.pageTitle}>Match Reflection</ThemedText>
          {opponentName ? (
            <ThemedText style={[styles.subtitle, { opacity: 0.7 }]}>vs. {opponentName}</ThemedText>
          ) : null}

          {noticedMost.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>
                WHAT YOU NOTICED MOST
              </ThemedText>
              {noticedMost.map((item, i) => (
                <View
                  key={`${item.text}-${i}`}
                  style={[
                    styles.card,
                    { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F0F0F0' },
                  ]}
                >
                  <View style={[styles.countBadge, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
                    <ThemedText style={styles.countBadgeText}>{item.count}</ThemedText>
                  </View>
                  <ThemedText style={styles.cardText} numberOfLines={2}>
                    {item.text}
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

          {matchFlow.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionHeading, { opacity: 0.7 }]}>MATCH FLOW</ThemedText>
              {matchFlow.map((label, i) => (
                <View key={`flow-${i}`} style={styles.flowRow}>
                  <View style={[styles.bullet, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} />
                  <ThemedText style={styles.flowText} numberOfLines={2}>
                    {label}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {noticedMost.length === 0 && playerNotes.length === 0 && matchFlow.length === 0 && (
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
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
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
