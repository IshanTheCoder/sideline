/**
 * Settings skeleton — mirrors settings.jsx's MY TEAMS and active-team cards
 * (badge + name/meta rows), shown while team data is still loading. The
 * profile card and ACCOUNT section aren't gated since they come from
 * AuthContext, which is already loaded by the time this screen mounts.
 */
import { StyleSheet, View } from 'react-native';
import { SkeletonBlock } from '@/components/Skeleton';
import { Brand, Shape } from '@/constants/brand';

export default function SettingsSkeleton() {
  return (
    <View>
      <SkeletonBlock width={90} height={12} radius={4} style={styles.eyebrow} />
      <View style={styles.card}>
        {[0, 1].map((i) => (
          <View key={i} style={[styles.row, i === 0 && styles.rowBorder]}>
            <SkeletonBlock width={40} height={40} radius={12} />
            <View style={styles.info}>
              <SkeletonBlock width="50%" height={15} radius={4} />
              <SkeletonBlock width="35%" height={12} radius={4} style={styles.subGap} />
            </View>
          </View>
        ))}
      </View>

      <SkeletonBlock width={130} height={12} radius={4} style={styles.eyebrow} />
      <View style={styles.card}>
        <View style={styles.row}>
          <SkeletonBlock width="30%" height={15} radius={4} />
          <SkeletonBlock width="25%" height={13} radius={4} style={styles.valueSpacer} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    marginTop: 22,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    overflow: 'hidden',
    ...Shape.cardShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Brand.hairline,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  subGap: {
    marginTop: 6,
  },
  valueSpacer: {
    marginLeft: 'auto',
  },
});
