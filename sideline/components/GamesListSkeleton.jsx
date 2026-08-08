/**
 * Games list skeleton — mirrors review/index.jsx's game rows (initials-tile +
 * title/subtitle), shown while the season's games are still loading.
 */
import { StyleSheet, View } from 'react-native';
import { SkeletonBlock } from '@/components/Skeleton';
import { Brand, Shape } from '@/constants/brand';

export default function GamesListSkeleton({ count = 5 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.gameRow}>
          <SkeletonBlock width={46} height={46} radius={14} />
          <View style={styles.rowInfo}>
            <SkeletonBlock width="50%" height={16} radius={4} />
            <SkeletonBlock width="32%" height={12} radius={4} style={styles.rowSubGap} />
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
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 16,
    ...Shape.cardShadow,
  },
});
