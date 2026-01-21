import { Platform, StyleSheet, TouchableOpacity, Alert, View, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import HamburgerMenu from '@/components/HamburgerMenu';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { fetchRecordingsForUser, formatDuration } from '@/lib/recording';

export default function HomeScreen() {
  const { user, profile, signOut } = useAuth();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  
  // State for games
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecentRecordings = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await fetchRecordingsForUser(user.id);

      if (fetchError) {
        // If table doesn't exist or schema is incomplete, show empty state gracefully
        if (fetchError.message.includes('does not exist') || 
            fetchError.message.includes('column') ||
            fetchError.code === 'PGRST116') {
          setRecordings([]);
          setError(null);
          setLoading(false);
          return;
        }
        
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setRecordings(data ?? []);
    } catch (err) {
      // Don't show error to user for missing table - just show empty state
      setRecordings([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch recent recordings on mount
  useEffect(() => {
    if (user?.id) {
      fetchRecentRecordings();
    } else {
      setLoading(false);
    }
  }, [user?.id, fetchRecentRecordings]);

  const handleSignOut = async () => {
    const doSignOut = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Sign out error:', error);
      }
    };

    // For web, sign out immediately to avoid blocked dialogs
    if (Platform.OS === 'web') {
      await doSignOut();
      return;
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: doSignOut,
        },
      ]
    );
  };

  const handleStartRecording = () => {
    router.push('/(tabs)/record-details');
  };

  const handleViewAllRecordings = () => {
    router.push('/(tabs)/review');
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchRecentRecordings();
      }
    }, [user?.id, fetchRecentRecordings])
  );

  const games = useMemo(() => {
    const map = new Map();

    recordings.forEach((rec) => {
      const gameId = rec.game_session_id ?? 'unassigned';
      const opponent = rec.game_sessions?.opponent_name ?? 'Default Session';
      const title = `vs. ${opponent}`;
      const dateLabel = rec.game_sessions?.date
        ? formatDate(rec.game_sessions.date)
        : formatDate(rec.created_at);
      const latest = new Date(rec.created_at).getTime();

      const existing = map.get(gameId);
      if (!existing || existing.latestRecordingAt < latest) {
        map.set(gameId, {
          id: gameId,
          title,
          dateLabel,
          totalDuration: (existing?.totalDuration ?? 0) + rec.duration,
          latestRecordingAt: latest,
        });
      } else {
        existing.totalDuration += rec.duration;
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.latestRecordingAt - a.latestRecordingAt)
      .slice(0, 5);
  }, [recordings]);

  // Get a random greeting
  const getGreeting = () => {
    const greetings = [
      'Welcome back',
      'Hey there',
      'Good to see you',
      'Ready to record',
      'Let\'s go',
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  return (
    <ThemedView style={styles.container}>
      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onSignOut={handleSignOut}
      />
      
      {/* Header */}
      <View style={styles.header}>
        {/* Hamburger Menu Button */}
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.hamburgerLine, {
            backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#1A1A1A',
          }]} />
          <View style={[styles.hamburgerLine, {
            backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#1A1A1A',
          }]} />
          <View style={[styles.hamburgerLine, {
            backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#1A1A1A',
          }]} />
        </TouchableOpacity>

        {/* Settings Button */}
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('/(tabs)/settings')}
          activeOpacity={0.7}
        >
          <IconSymbol
            name="gearshape.fill"
            size={28}
            color="#1A1A1A"
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <ThemedText style={styles.welcomeText}>
            {getGreeting()},
          </ThemedText>
          <ThemedText style={styles.userName}>
            {profile?.name || 'Coach'}
          </ThemedText>
        </View>

        {/* Start Recording Button */}
        <TouchableOpacity
          style={styles.startRecordingButton}
          onPress={handleStartRecording}
          activeOpacity={0.8}
        >
          <View style={styles.recordingButtonContent}>
            <IconSymbol name="mic.fill" size={36} color="#1E90FF" />
            <View style={styles.recordingButtonTextContainer}>
              <ThemedText style={styles.startRecordingText}>
                Start Recording
              </ThemedText>
              <ThemedText style={styles.startRecordingSubtext}>
                Tap to begin a new recording
              </ThemedText>
            </View>
          </View>
        </TouchableOpacity>

        {/* Recent Games Section */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Recent Games
            </ThemedText>
            {games.length > 0 && !loading && (
              <TouchableOpacity onPress={handleViewAllRecordings}>
                <ThemedText style={[styles.viewAllText, {
                  color: Colors[colorScheme ?? 'light'].tint,
                }]}>
                  View All
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator 
                size="large" 
                color={Colors[colorScheme ?? 'light'].tint} 
              />
              <ThemedText style={styles.loadingText}>
                Loading recordings...
              </ThemedText>
            </View>
          )}

          {/* Error State */}
          {error && !loading && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>
                {error}
              </ThemedText>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={fetchRecentRecordings}
              >
                <ThemedText style={[styles.retryButtonText, {
                  color: Colors[colorScheme ?? 'light'].tint,
                }]}>
                  Retry
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Recordings List */}
          {!loading && !error && (
            <View style={styles.gamesList}>
              {games.length === 0 && (
                <View style={styles.emptyState}>
                  <IconSymbol name="mic.slash" size={32} color="#666" />
                  <ThemedText style={styles.emptyStateTitle}>No games yet</ThemedText>
                  <ThemedText style={styles.emptyStateSubtitle}>
                    Your recordings will appear under each game once you record.
                  </ThemedText>
                </View>
              )}
              {games.map((game) => (
                <TouchableOpacity
                  key={game.id}
                  style={[
                    styles.gameCard,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                      borderColor: colorScheme === 'dark' ? '#3A3A3A' : '#E5E5E5',
                    },
                  ]}
                  onPress={() => router.push(`/(tabs)/review/game/${game.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.gameIcon}>
                    <IconSymbol name="calendar" size={20} color={Colors[colorScheme ?? 'light'].tint} />
                  </View>
                  <View style={styles.gameInfo}>
                    <ThemedText style={styles.gameTitle}>{game.title}</ThemedText>
                    <View style={styles.gameMeta}>
                      <ThemedText style={styles.metaText}>{game.dateLabel}</ThemedText>
                      <View style={styles.metaSeparator} />
                      <ThemedText style={styles.metaText}>{formatDuration(game.totalDuration)}</ThemedText>
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={18} color={colorScheme === 'dark' ? '#666' : '#999'} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {games.length > 0 && !loading && !error && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={handleViewAllRecordings}
            >
              <ThemedText style={[styles.viewAllButtonText, {
                color: Colors[colorScheme ?? 'light'].tint,
              }]}>
                View All Games →
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  hamburgerLine: {
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 20,
    opacity: 0.7,
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    minHeight: 40,
  },
  startRecordingButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingButtonTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  startRecordingText: {
    color: '#1A1A1A',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  startRecordingSubtext: {
    color: '#4A4A4A',
    fontSize: 14,
    opacity: 0.8,
  },
  recentSection: {
    marginBottom: 20,
  },
  gamesList: {
    gap: 12,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  gameIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  gameMeta: {
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 12,
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
});
