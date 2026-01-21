import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteGameForUser,
  fetchRecordingsForUser,
  formatDuration,
} from '@/lib/recording';

export default function ReviewScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const titleText = useMemo(() => '🏟️ Games', []);

  const loadRecordings = useCallback(async (opts?: { isRefresh?: boolean }) => {
    if (!user?.id) {
      setLoading(false);
      setRecordings([]);
      return;
    }

    if (opts?.isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);
    const { data, error: fetchError } = await fetchRecordingsForUser(user.id);

    if (fetchError) {
      if (
        fetchError.message.includes('does not exist') ||
        fetchError.message.includes('column') ||
        // Empty response for RLS, table missing, or join error
        (fetchError).code === 'PGRST116'
      ) {
        setRecordings([]);
        setError(null);
      } else {
        setError(fetchError.message);
      }
    } else {
      setRecordings(data ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadRecordings();
    } else {
      setLoading(false);
    }
  }, [user?.id, loadRecordings]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadRecordings();
      }
    }, [user?.id, loadRecordings])
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const groupedGames = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        title: string;
        dateLabel: string;
        recordings: RecordingRow[];
      }
    >();

    recordings.forEach((rec) => {
      const gameId = rec.game_session_id ?? 'unassigned';
      const opponent = rec.game_sessions?.opponent_name ?? 'Default Session';
      const title = `vs. ${opponent}`;
      const dateLabel = rec.game_sessions?.date
        ? formatDate(rec.game_sessions.date)
        : formatDate(rec.created_at);

      if (!map.has(gameId)) {
        map.set(gameId, {
          id: gameId,
          title,
          dateLabel,
          recordings: [],
        });
      }

      map.get(gameId)?.recordings.push(rec);
    });

    return Array.from(map.values());
  }, [recordings]);

  const handleDeleteGame = (gameId) => {
    if (!user?.id) return;

    Alert.alert(
      'Delete game?',
      'This will permanently remove all recordings for this game.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error: deleteError } = await deleteGameForUser(user.id, gameId);
            if (deleteError) {
              Alert.alert('Delete failed', deleteError.message);
              return;
            }

            setRecordings((prev) =>
              prev.filter((rec) =>
                gameId === 'unassigned'
                  ? rec.game_session_id !== null
                  : rec.game_session_id !== gameId
              )
            );
          },
        },
      ]
    );
  };

  const renderGameItem = ({
    item,
  }: {
    item: {
      id: string;
      title: string;
      dateLabel: string;
      recordings: RecordingRow[];
    };
  }) => {
    const totalDuration = item.recordings.reduce(
      (sum, rec) => sum + (rec.duration ?? 0),
      0
    );

    return (
      <TouchableOpacity
        style={[
          styles.gameItem,
          {
            backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
            borderColor: colorScheme === 'dark' ? '#3A3A3A' : '#E5E5E5',
          },
        ]}
        onPress={() => router.push(`/(tabs)/review/game/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <IconSymbol
            name="calendar"
            size={24}
            color={Colors[colorScheme ?? 'light'].tint}
          />
        </View>
        <View style={styles.recordingInfo}>
          <ThemedText style={styles.recordingTitle}>{item.title}</ThemedText>
          <View style={styles.recordingMeta}>
            <ThemedText style={styles.metaText}>
              {item.dateLabel}
            </ThemedText>
            <View style={styles.metaSeparator} />
            <ThemedText style={styles.metaText}>
              {item.recordings.length} recordings
            </ThemedText>
            <View style={styles.metaSeparator} />
            <ThemedText style={styles.metaText}>
              {formatDuration(totalDuration)}
            </ThemedText>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteGame(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol
            name="trash"
            size={20}
            color={colorScheme === 'dark' ? '#FF6B6B' : '#D32F2F'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
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
          <ThemedText style={styles.backText}>Back</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          {titleText}
        </ThemedText>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
          <ThemedText style={styles.loadingText}>Loading recordings...</ThemedText>
        </View>
      )}

      {!loading && error && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadRecordings()}
          >
            <ThemedText style={[styles.retryButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>
              Retry
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && recordings.length === 0 && (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              {
                backgroundColor:
                  colorScheme === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.05)',
              },
            ]}
          >
            <IconSymbol
              name="mic.slash"
              size={48}
              color={colorScheme === 'dark' ? '#666' : '#999'}
            />
          </View>
          <ThemedText style={styles.emptyTitle}>No games yet</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Your recordings will appear under each game once you record.
          </ThemedText>
        </View>
      )}

      {!loading && !error && groupedGames.length > 0 && (
        <FlatList
          data={groupedGames}
          renderItem={renderGameItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshing={refreshing}
          onRefresh={() => loadRecordings({ isRefresh: true })}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    paddingBottom: 16,
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
    marginTop: 12,
  },
  listContent: {
    paddingBottom: 40,
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recordingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    opacity: 0.6,
  },
  metaSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#999',
    marginHorizontal: 8,
  },
  separator: {
    height: 12,
  },
  deleteButton: {
    paddingLeft: 12,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 22,
  },
});
