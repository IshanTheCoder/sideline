/**
 * All games — redesign: the "View all" list behind Home's Recent games.
 * Initials-tile rows with date + note count, pull-to-refresh, and
 * long-press to delete a game (recordings included).
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Brand, Shape } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert } from '@/lib/alert';
import { deleteGameForUser, fetchRecordingsForTeam } from '@/lib/recording';
import { gameDateParts, initialsFor } from '@/lib/scheduleFormat';
import { getActiveTeam } from '@/lib/teams';

export default function GamesListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      // Scope the games list to the active team so it matches Home.
      const { team } = await getActiveTeam(user.id);
      const { data } = team?.id
        ? await fetchRecordingsForTeam(user.id, team.id)
        : { data: [] };
      const map = new Map();
      (data ?? []).forEach((rec) => {
        const gameId = rec.game_session_id ?? 'unassigned';
        const opponent = rec.game_sessions?.opponent_name ?? 'Untitled game';
        const date = rec.game_sessions?.date ?? rec.created_at;
        const latest = new Date(rec.created_at).getTime();
        const existing = map.get(gameId);
        if (existing) {
          existing.noteCount += 1;
          existing.latest = Math.max(existing.latest, latest);
        } else {
          map.set(gameId, { id: gameId, opponent, date, noteCount: 1, latest });
        }
      });
      setGames([...map.values()].sort((a, b) => b.latest - a.latest));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const removeGame = (game) => {
    showAlert(
      'Delete game?',
      `vs. ${game.opponent} and all of its notes will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteGameForUser(user.id, game.id);
            if (error) {
              showAlert('Could not delete', error.message);
              return;
            }
            load();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={Brand.green}
          />
        }
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/app'))}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color={Brand.ink} strokeWidth={2.4} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Games</Text>
            <Text style={styles.subtitle}>
              {games.length} game{games.length === 1 ? '' : 's'} captured
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Brand.green} />
          </View>
        ) : games.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No captured games yet — your first game’s notes will land here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {games.map((g) => (
              <View key={g.id} style={styles.gameRow}>
                <TouchableOpacity
                  style={styles.gameRowMain}
                  onPress={() => router.push(`/(tabs)/review/game/${g.id}`)}
                  onLongPress={() => removeGame(g)}
                  activeOpacity={0.75}
                >
                  <View style={styles.initialsTile}>
                    <Text style={styles.initialsText}>{initialsFor(g.opponent)}</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>vs. {g.opponent}</Text>
                    <Text style={styles.rowSub}>
                      {gameDateParts(g.date).label} · {g.noteCount} note
                      {g.noteCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={Brand.chevron} strokeWidth={2.4} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => removeGame(g)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={17} color={Brand.muted} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
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
    lineHeight: 20,
  },
  list: {
    gap: 10,
    marginTop: 18,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 8,
    ...Shape.cardShadow,
  },
  gameRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Brand.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.green,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.ink,
  },
  rowSub: {
    fontSize: 13,
    color: Brand.muted,
    marginTop: 2,
  },
});
