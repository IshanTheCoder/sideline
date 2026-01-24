import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export function ActiveSessionIndicator({ session }) {
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <View style={[styles.card, { borderColor }]}>
      {session ? (
        <>
          <ThemedText style={styles.title}>vs. {session.opponentName}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            {formatDate(session.date)} • {session.matchType}
          </ThemedText>
        </>
      ) : (
        <>
          <ThemedText style={styles.title}>No active session</ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            Tap Start Recording to add details
          </ThemedText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
});
