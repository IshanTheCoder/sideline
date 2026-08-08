/**
 * Game Analysis skeleton — mirrors summary/[id].jsx's dark hero, the AT A
 * GLANCE donut + notes-by-set cards, and prioritized player cards, shown
 * while the game's recordings/roster are still loading.
 */
import { StyleSheet, View } from 'react-native';
import { SkeletonBlock, SkeletonCircle } from '@/components/Skeleton';
import { Brand, Shape } from '@/constants/brand';

export default function GameAnalysisSkeleton({ playerCount = 2 }) {
  return (
    <View>
      {/* hero */}
      <View style={styles.hero}>
        <SkeletonBlock width={140} height={11} radius={4} tone="dark" />
        <SkeletonBlock width="85%" height={20} radius={5} tone="dark" style={styles.heroLine} />
        <SkeletonBlock width="60%" height={14} radius={4} tone="dark" style={styles.heroLineSm} />
      </View>

      {/* at a glance */}
      <SkeletonBlock width={110} height={12} radius={4} style={styles.sectionEyebrow} />
      <View style={styles.glanceRow}>
        <View style={styles.glanceCard}>
          <SkeletonCircle size={120} />
          <View style={styles.legend}>
            <SkeletonBlock width="90%" height={11} radius={4} />
            <SkeletonBlock width="75%" height={11} radius={4} style={styles.legendGap} />
            <SkeletonBlock width="80%" height={11} radius={4} style={styles.legendGap} />
          </View>
        </View>
        <View style={styles.glanceCard}>
          <SkeletonBlock width="60%" height={13} radius={4} style={styles.glanceTitleGap} />
          <View style={styles.columns}>
            {[26, 46, 34, 18].map((h, i) => (
              <SkeletonBlock key={i} width={18} height={h} radius={6} />
            ))}
          </View>
        </View>
      </View>

      {/* players */}
      <SkeletonBlock width={160} height={12} radius={4} style={styles.sectionEyebrow} />
      <View style={styles.cardList}>
        {Array.from({ length: playerCount }).map((_, i) => (
          <View key={i} style={styles.playerCard}>
            <View style={styles.playerHead}>
              <SkeletonCircle size={42} />
              <View style={styles.playerHeadInfo}>
                <SkeletonBlock width="45%" height={15} radius={4} />
                <SkeletonBlock width="30%" height={11} radius={4} style={styles.legendGap} />
              </View>
            </View>
            <SkeletonBlock width="95%" height={13} radius={4} style={styles.insightLine} />
            <SkeletonBlock width="70%" height={13} radius={4} style={styles.legendGap} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: Brand.ink,
    borderRadius: Shape.heroRadius,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginTop: 18,
  },
  heroLine: {
    marginTop: 12,
  },
  heroLineSm: {
    marginTop: 8,
  },
  sectionEyebrow: {
    marginTop: 22,
    marginBottom: 10,
  },
  glanceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  glanceCard: {
    flex: 1,
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    padding: 16,
    alignItems: 'center',
    ...Shape.cardShadow,
  },
  legend: {
    marginTop: 12,
    width: '100%',
  },
  legendGap: {
    marginTop: 8,
  },
  glanceTitleGap: {
    alignSelf: 'flex-start',
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
    gap: 10,
    height: 104,
    marginTop: 14,
    alignSelf: 'stretch',
  },
  cardList: {
    gap: 10,
  },
  playerCard: {
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    padding: 16,
    ...Shape.cardShadow,
  },
  playerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerHeadInfo: {
    flex: 1,
  },
  insightLine: {
    marginTop: 14,
  },
});
