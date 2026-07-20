/**
 * Home — redesign: date eyebrow + "Coach {name}" header with round icon
 * buttons (Schedule / Roster / Settings), a dark Game Day hero for the next
 * scheduled game (Start Capture jumps straight into live capture), the
 * upcoming schedule, and recent games with note counts.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Calendar, ChevronRight, Mic, Settings, Users } from 'lucide-react-native';
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
import { useActiveSession } from '@/contexts/ActiveSessionContext';
import { useAuth } from '@/contexts/AuthContext';
import { fetchScheduledGames, startScheduledGame } from '@/lib/gameSessions';
import { fetchRecordingsForTeam } from '@/lib/recording';
import {
  gameDateParts,
  gameWhenLabel,
  initialsFor,
  isToday,
  parseGameDate,
  todayLabel,
} from '@/lib/scheduleFormat';
import { getActiveTeam } from '@/lib/teams';

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { activeSession, setActiveSession } = useActiveSession();

  const [teamId, setTeamId] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addGameOpen, setAddGameOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const { team } = await getActiveTeam(user.id);
      let scheduled = [];
      if (team?.id) {
        setTeamId(team.id);
        const res = await fetchScheduledGames(team.id);
        scheduled = res.games;
      } else {
        setTeamId(null);
      }
      setSchedule(scheduled);

      // Scope recent games to the active team so switching teams shows only
      // that team's history.
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
      setRecentGames([...map.values()].sort((a, b) => b.latest - a.latest).slice(0, 5));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // next upcoming game: today or later, soonest first. Deliberately does NOT
  // fall back to a past scheduled game — starting capture must never flip a
  // stale, months-old scheduled game to "played" just because it's first in
  // the list.
  const nextGame = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcoming = schedule.filter((g) => {
      const d = parseGameDate(g.date);
      return d && d >= now;
    });
    return upcoming[0] ?? null;
  }, [schedule]);

  const heroBadge = activeSession
    ? 'GAME IN PROGRESS'
    : nextGame && isToday(nextGame.date)
      ? 'GAME DAY'
      : 'NEXT GAME';

  const startCapture = async () => {
    // resume a capture session that's already running
    if (activeSession) {
      router.push('/(tabs)/record');
      return;
    }
    if (!nextGame) {
      setAddGameOpen(true);
      return;
    }
    await startScheduledGame(nextGame.id);
    await setActiveSession({
      id: nextGame.id,
      opponentName: nextGame.opponent_name,
      date: parseGameDate(nextGame.date) ?? new Date(),
      startedAt: new Date(),
    });
    router.push('/(tabs)/record');
  };

  const firstName = (profile?.name ?? '').trim().split(/\s+/)[0] || 'Coach';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.dateEyebrow}>{todayLabel()}</Text>
            <Text style={styles.coachName} numberOfLines={1}>
              Coach {firstName}
            </Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/(tabs)/schedule')}
              activeOpacity={0.7}
            >
              <Calendar size={20} color={Brand.ink} strokeWidth={1.8} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/(tabs)/roster')}
              activeOpacity={0.7}
            >
              <Users size={20} color={Brand.ink} strokeWidth={1.8} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/(tabs)/settings')}
              activeOpacity={0.7}
            >
              <Settings size={20} color={Brand.ink} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        {/* game day hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>{heroBadge}</Text>
          </View>
          <Text style={styles.heroOpponent} numberOfLines={2}>
            vs. {activeSession?.opponentName ?? nextGame?.opponent_name ?? 'No game set'}
          </Text>
          <Text style={styles.heroWhen}>
            {activeSession
              ? 'Capture is running — jump back in'
              : nextGame
                ? gameWhenLabel(nextGame)
                : 'Add your schedule to get started'}
          </Text>
          <TouchableOpacity style={styles.heroBtn} onPress={startCapture} activeOpacity={0.85}>
            <Mic size={18} color="#fff" strokeWidth={2.2} />
            <Text style={styles.heroBtnText}>
              {activeSession ? 'Resume Capture' : nextGame ? 'Start Capture' : 'Add a game'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <TouchableOpacity onPress={() => setAddGameOpen(true)} activeOpacity={0.7}>
              <Text style={styles.sectionLink}>+ Add game</Text>
            </TouchableOpacity>
          </View>
          {loading && schedule.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Brand.green} />
            </View>
          ) : schedule.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No upcoming games yet. Add your schedule and game day is one tap away.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {schedule.slice(0, 4).map((g) => {
                const parts = gameDateParts(g.date);
                return (
                  <View key={g.id} style={styles.scheduleRow}>
                    <View
                      style={[
                        styles.dateChip,
                        isToday(g.date) && { backgroundColor: Brand.greenTintToday },
                      ]}
                    >
                      <Text style={styles.dateChipMon}>{parts.mon}</Text>
                      <Text style={styles.dateChipDay}>{parts.day}</Text>
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle}>vs. {g.opponent_name}</Text>
                      <Text style={styles.rowSub}>{gameWhenLabel(g, { includeVenue: false })}</Text>
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
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* recent games */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent games</Text>
            {recentGames.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/review')} activeOpacity={0.7}>
                <Text style={[styles.sectionLink, { fontWeight: '600' }]}>View all</Text>
              </TouchableOpacity>
            )}
          </View>
          {loading && recentGames.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Brand.green} />
            </View>
          ) : recentGames.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Your captured games will show up here after your first game.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {recentGames.map((g) => {
                const parts = gameDateParts(g.date);
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={styles.gameRow}
                    onPress={() => router.push(`/(tabs)/review/game/${g.id}`)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.initialsTile}>
                      <Text style={styles.initialsText}>{initialsFor(g.opponent)}</Text>
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle}>vs. {g.opponent}</Text>
                      <Text style={styles.rowSub}>
                        {parts.label} · {g.noteCount} note{g.noteCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <ChevronRight size={14} color={Brand.chevron} strokeWidth={2.4} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
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
    gap: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  dateEyebrow: {
    fontSize: 14,
    color: Brand.muted,
    fontWeight: '500',
  },
  coachName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Brand.ink,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  hero: {
    backgroundColor: Brand.ink,
    borderRadius: Shape.heroRadius,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Brand.greenLightInk,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Brand.greenPale,
  },
  heroOpponent: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#fff',
    marginTop: 8,
  },
  heroWhen: {
    fontSize: 14,
    color: Brand.onDarkMuted,
    marginTop: 2,
  },
  heroBtn: {
    marginTop: 18,
    width: '100%',
    height: 56,
    borderRadius: 18,
    backgroundColor: Brand.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  heroBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Brand.ink,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.green,
  },
  list: {
    gap: 10,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    padding: 18,
    ...Shape.cardShadow,
  },
  emptyText: {
    fontSize: 13.5,
    color: Brand.muted,
    lineHeight: 20,
  },
  scheduleRow: {
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
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Brand.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipMon: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.green,
    letterSpacing: 0.4,
  },
  dateChipDay: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.ink,
    lineHeight: 19,
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
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    padding: 16,
    ...Shape.cardShadow,
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
});
