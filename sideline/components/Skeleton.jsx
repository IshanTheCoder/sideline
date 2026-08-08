/**
 * Skeleton loading primitives — pulsing placeholder blocks used while screens
 * fetch data, instead of a centered ActivityIndicator. Per-screen skeleton
 * layouts (HomeSkeleton, RosterSkeleton, etc.) compose these to mirror the
 * real content's shape so the swap-in doesn't cause layout jumps.
 */
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Brand } from '@/constants/brand';

// 'light' → for placeholders sitting on white/cream cards (most screens).
// 'dark' → for placeholders sitting on Brand.ink hero cards.
const TONE_COLOR = {
  light: Brand.border2,
  dark: 'rgba(255,255,255,0.18)',
};

export function SkeletonBlock({ width, height, radius = 8, tone = 'light', style }) {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: TONE_COLOR[tone] },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCircle({ size, tone = 'light', style }) {
  return <SkeletonBlock width={size} height={size} radius={size / 2} tone={tone} style={style} />;
}
