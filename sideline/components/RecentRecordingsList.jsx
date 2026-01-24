import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';

export default function RecentRecordingsList({
  recordings,
  maxItems = 5,
  onPress,
}) {
  const colorScheme = useColorScheme();
  const router = useRouter();
  
  // Animation for empty state icon
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Pulse animation for empty state icon
    if (recordings.length === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [recordings.length, scaleAnim]);

  // Limit to maxItems
  const displayedRecordings = recordings.slice(0, maxItems);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const handleRecordingPress = (recording) => {
    if (onPress) {
      onPress(recording);
    } else {
      // Default navigation to recording detail
      router.push(`/(tabs)/review/${recording.id}`);
    }
  };

  const renderRecordingItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.recordingItem,
        {
          backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
          borderColor: colorScheme === 'dark' ? '#3A3A3A' : '#E5E5E5',
        },
      ]}
      onPress={() => handleRecordingPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <IconSymbol
          name="waveform"
          size={24}
          color={Colors[colorScheme ?? 'light'].tint}
        />
      </View>
      <View style={styles.recordingInfo}>
        <ThemedText style={styles.recordingTitle}>
          {item.game_session?.opponent_name
            ? `vs. ${item.game_session.opponent_name}`
            : 'Recording'}
        </ThemedText>
        <View style={styles.recordingMeta}>
          <ThemedText style={styles.metaText}>
            {formatDate(item.created_at)}
          </ThemedText>
          <View style={styles.metaSeparator} />
          <ThemedText style={styles.metaText}>
            {formatDuration(item.duration)}
          </ThemedText>
        </View>
      </View>
      <IconSymbol
        name="chevron.right"
        size={20}
        color={colorScheme === 'dark' ? '#666' : '#999'}
      />
    </TouchableOpacity>
  );

  // Empty state
  if (displayedRecordings.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <View style={[
            styles.emptyIconCircle,
            { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }
          ]}>
            <IconSymbol
              name="mic.slash"
              size={48}
              color={colorScheme === 'dark' ? '#666' : '#999'}
            />
          </View>
        </Animated.View>
        <ThemedText style={styles.emptyTitle}>No recordings yet</ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          Tap "Start Recording" to create your first recording
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={displayedRecordings}
        renderItem={renderRecordingItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  recordingItem: {
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
