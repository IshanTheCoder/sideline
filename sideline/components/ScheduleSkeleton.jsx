/**
 * Schedule skeleton — mirrors schedule.jsx's game cards (date-chip +
 * title/subtitle), shown while the month's games are still loading.
 */
import { StyleSheet, View } from 'react-native';
import { SkeletonBlock } from '@/components/Skeleton';
import { Brand, Shape } from '@/constants/brand';

export default function ScheduleSkeleton({ count = 4 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.gameCard}>
          <SkeletonBlock width={50} height={56} radius={14} />
          <View style={styles.rowInfo}>
            <SkeletonBlock width="55%" height={16} radius={4} />
            <SkeletonBlock width="38%" height={12} radius={4} style={styles.rowSubGap} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    marginTop: 18,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowSubGap: {
    marginTop: 6,
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
});
