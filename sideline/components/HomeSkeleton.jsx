/**
 * Home screen skeletons — mirrors app.jsx's schedule rows (date-chip + text)
 * and recent-game rows (initials-tile + text), shown while each section's
 * data is still loading.
 */
import { StyleSheet, View } from 'react-native';
import { SkeletonBlock } from '@/components/Skeleton';
import { Brand, Shape } from '@/constants/brand';

export function ScheduleRowSkeleton({ count = 2 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.scheduleRow}>
          <SkeletonBlock width={48} height={48} radius={14} />
          <View style={styles.rowInfo}>
            <SkeletonBlock width="55%" height={16} radius={4} />
            <SkeletonBlock width="35%" height={12} radius={4} style={styles.rowSubGap} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function GameRowSkeleton({ count = 3 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.gameRow}>
          <SkeletonBlock width={46} height={46} radius={14} />
          <View style={styles.rowInfo}>
            <SkeletonBlock width="45%" height={16} radius={4} />
            <SkeletonBlock width="30%" height={12} radius={4} style={styles.rowSubGap} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowSubGap: {
    marginTop: 6,
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
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    padding: 16,
    ...Shape.cardShadow,
  },
});
