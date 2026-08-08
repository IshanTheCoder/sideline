/**
 * Roster skeleton — mirrors roster.jsx's player rows (number avatar +
 * name/position line), shown while the roster is still loading.
 */
import { StyleSheet, View } from 'react-native';
import { SkeletonBlock, SkeletonCircle } from '@/components/Skeleton';
import { Brand, Shape } from '@/constants/brand';

export default function RosterSkeleton({ count = 6 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.playerRow}>
          <SkeletonCircle size={42} />
          <View style={styles.playerInfo}>
            <SkeletonBlock width="42%" height={15} radius={4} />
            <SkeletonBlock width="28%" height={12} radius={4} style={styles.subGap} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    marginTop: 16,
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
  },
  subGap: {
    marginTop: 6,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: Brand.card,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 15,
    ...Shape.cardShadow,
  },
});
