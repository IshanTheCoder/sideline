/**
 * Schedule — redesign: season game list with a month toggle (arrows step
 * through any month, showing "July 2026" + game count), big date-chip cards
 * (MON / day / weekday), an empty state per month, and the Add Game sheet
 * (manual + scan). Long-press a game to remove it from the schedule.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AddGameSheet from '@/components/AddGameSheet';
import { Brand, Shape } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert } from '@/lib/alert';
import { deleteScheduledGame, fetchScheduledGames } from '@/lib/gameSessions';
import {
  defaultMonthKey,
  gameDateParts,
  gameWhenLabel,
  gamesInMonthKey,
  isToday,
  monthKeyParts,
} from '@/lib/scheduleFormat';
import { getActiveTeam } from '@/lib/teams';

export default function ScheduleScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [teamId, setTeamId] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthKey, setMonthKey] = useState(null); // null → follow defaultMonthKey until the user navigates
  const [addGameOpen, setAddGameOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const { team } = await getActiveTeam(user.id);
      if (team?.id) {
        setTeamId(team.id);
        const { games: scheduled } = await fetchScheduledGames(team.id);
        setGames(scheduled);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const curKey = monthKey ?? defaultMonthKey(games);
  const month = monthKeyParts(curKey);
  const monthGames = useMemo(() => gamesInMonthKey(games, curKey), [games, curKey]);
  const stepMonth = (delta) => setMonthKey(curKey + delta);

  const removeGame = (game) => {
    showAlert(
      'Remove game?',
      `vs. ${game.opponent_name} will be removed from the schedule.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteScheduledGame(game.id);
            if (error) {
              showAlert('Could not remove game', error.message);
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
            <Text style={styles.title}>Schedule</Text>
            <Text style={styles.subtitle}>
              {games.length} game{games.length === 1 ? '' : 's'} this season
            </Text>
          </View>
        </View>

        {/* month toggle — arrows step through any month, across year boundaries */}
        <View style={styles.monthToggle}>
          <TouchableOpacity
            style={styles.monthArrow}
            onPress={() => stepMonth(-1)}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color="#fff" strokeWidth={2.6} />
          </TouchableOpacity>
          <View style={styles.monthCenter}>
            <Text style={styles.monthTitle}>
              {month.name} {month.year}
            </Text>
            <Text style={styles.monthCount}>
              {monthGames.length === 0 ? 'No games' : `${monthGames.length} game${monthGames.length === 1 ? '' : 's'}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.monthArrow}
            onPress={() => stepMonth(1)}
            activeOpacity={0.7}
          >
            <ChevronRight size={18} color="#fff" strokeWidth={2.6} />
          </TouchableOpacity>
        </View>

        {/* month games */}
        {loading && games.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Brand.green} />
          </View>
        ) : monthGames.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Calendar size={26} color={Brand.green} strokeWidth={1.8} />
            </View>
            <View style={styles.emptyTextWrap}>
              <Text style={styles.emptyTitle}>No games in {month.name}</Text>
              <Text style={styles.emptySub}>Add a game below, or use the arrows to change month.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.list}>
            {monthGames.map((g) => {
              const parts = gameDateParts(g.date);
              const today = isToday(g.date);
              return (
                <TouchableOpacity
                  key={g.id}
                  style={styles.gameCard}
                  onLongPress={() => removeGame(g)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[styles.dateChip, today && { backgroundColor: Brand.greenTintToday }]}
                  >
                    <Text style={styles.dateChipMon}>{parts.mon}</Text>
                    <Text style={styles.dateChipDay}>{parts.day}</Text>
                    <Text style={styles.dateChipDow}>{parts.dow}</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>vs. {g.opponent_name}</Text>
                    <Text style={styles.rowSub}>{gameWhenLabel(g)}</Text>
                  </View>
                  {!!g.venue && (
                    <View
                      style={[
                        styles.venueTag,
                        g.venue === 'Home' ? styles.venueTagHome : styles.venueTagAway,
                      ]}
                    >
                      <Text
                        style={[
                          styles.venueTagText,
                          g.venue === 'Home' ? styles.venueTagTextHome : styles.venueTagTextAway,
                        ]}
                      >
                        {g.venue}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* add game */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddGameOpen(true)}
          activeOpacity={0.85}
        >
          <Plus size={18} color="#fff" strokeWidth={2.4} />
          <Text style={styles.addBtnText}>Add game</Text>
        </TouchableOpacity>
      </ScrollView>

      <AddGameSheet
        visible={addGameOpen}
        onClose={() => setAddGameOpen(false)}
        teamId={teamId}
        onAdded={load}
      />
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
  monthToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    backgroundColor: Brand.green,
    marginTop: 18,
    paddingHorizontal: 6,
  },
  monthArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  monthCount: {
    fontSize: 11,
    fontWeight: '600',
    color: Brand.greenPaleSub,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  list: {
    gap: 10,
    marginTop: 18,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...Shape.cardShadow,
  },
  dateChip: {
    width: 50,
    height: 56,
    borderRadius: 14,
    backgroundColor: Brand.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipMon: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.green,
    letterSpacing: 0.6,
  },
  dateChipDay: {
    fontSize: 20,
    fontWeight: '800',
    color: Brand.ink,
    lineHeight: 21,
  },
  dateChipDow: {
    fontSize: 9,
    fontWeight: '600',
    color: Brand.muted,
    letterSpacing: 0.4,
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
  venueTag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  venueTagHome: {
    backgroundColor: Brand.greenTint,
  },
  venueTagAway: {
    backgroundColor: Brand.hairline,
  },
  venueTagText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  venueTagTextHome: {
    color: Brand.green,
  },
  venueTagTextAway: {
    color: Brand.chip,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 14,
    backgroundColor: Brand.card,
    borderRadius: 22,
    paddingVertical: 44,
    paddingHorizontal: 28,
    marginTop: 18,
    ...Shape.cardShadow,
  },
  emptyIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Brand.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTextWrap: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.ink,
  },
  emptySub: {
    fontSize: 13.5,
    color: Brand.muted,
    marginTop: 4,
    lineHeight: 20,
    textAlign: 'center',
  },
  addBtn: {
    marginTop: 18,
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: Brand.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
