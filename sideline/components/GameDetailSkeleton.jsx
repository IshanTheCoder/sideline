/**
 * Game Detail skeleton — mirrors review/game/[id].jsx's SET groups of note
 * rows (play-tile + title + chip row), shown while notes are still loading.
 */
import { StyleSheet, View } from 'react-native';
import { SkeletonBlock, SkeletonCircle } from '@/components/Skeleton';
import { Brand, Shape } from '@/constants/brand';

export default function GameDetailSkeleton({ groups = 2, rowsPerGroup = 2 }) {
  return (
    <View style={styles.setList}>
      {Array.from({ length: groups }).map((_, g) => (
        <View key={g}>
          <SkeletonBlock width={52} height={12} radius={4} style={styles.eyebrow} />
          <View style={styles.noteList}>
            {Array.from({ length: rowsPerGroup }).map((_, i) => (
              <View key={i} style={styles.noteRow}>
                <SkeletonCircle size={40} />
                <View style={styles.noteInfo}>
                  <SkeletonBlock width="58%" height={15} radius={4} />
                  <View style={styles.chipRow}>
                    <SkeletonBlock width={52} height={16} radius={9} />
                    <SkeletonBlock width={64} height={16} radius={9} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  setList: {
    marginTop: 24,
    gap: 18,
  },
  eyebrow: {
    marginBottom: 10,
  },
  noteList: {
    gap: 10,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: Brand.card,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 15,
    ...Shape.cardShadow,
  },
  noteInfo: {
    flex: 1,
    minWidth: 0,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
});
