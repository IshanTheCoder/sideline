import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ActiveSessionProvider } from '@/contexts/ActiveSessionContext';
import { TutorialProvider } from '@/contexts/TutorialContext';
import TutorialOverlay from '@/components/TutorialOverlay';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// The site moved from sideline-ai.pages.dev to tapsideline.com. Cloudflare
// Pages' _redirects file only matches paths (not hostnames), so send visitors
// on the old domain to the new one here, before the app mounts. Exact-match
// the hostname so branch preview deploys (*.sideline-ai.pages.dev) still work.
if (
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  window.location.hostname === 'sideline-ai.pages.dev'
) {
  window.location.replace(
    `https://tapsideline.com${window.location.pathname}${window.location.search}${window.location.hash}`
  );
}

// On web, wrap app in a centered mobile-width column so UI matches mobile
const WEB_MAX_WIDTH = 440;

function RootLayoutNav() {
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...Ionicons.font,
  });
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'dark']?.background ?? '#000000';

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inMarketingGroup = segments[0] === '(marketing)';

    // Marketing pages are public — never redirect visitors reading the site
    if (inMarketingGroup) return;

    console.log('🔍 Root Layout Navigation Check:', {
      hasUser: !!user,
      userEmail: user?.email,
      inAuthGroup,
      segments: segments.join('/'),
      loading,
    });

    if (!user && !inAuthGroup) {
      // User is not signed in and not in auth group, redirect to welcome
      console.log('🔄 Redirecting to welcome (user signed out)');
      router.replace('/(auth)/welcome');
    } else if (user && inAuthGroup) {
      // User is signed in but still in auth group, redirect to main app
      console.log('🔄 Redirecting to tabs (user signed in)');
      router.replace('/(tabs)/home');
    }
  }, [user, loading, segments]);

  // Marketing pages render as a plain document — no auth gate, no app shell,
  // no mobile-width column. This keeps the static export crawlable.
  if (segments[0] === '(marketing)') {
    return <Slot />;
  }

  // Show loading screen while checking auth state
  if (loading || !fontsLoaded) {
    const loadingView = (
      <View style={[styles.loadingContainer, { backgroundColor: backgroundColor || '#000000' }]}>
        <ActivityIndicator size="large" color="#5BA3F5" />
      </View>
    );
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.webOuter, { backgroundColor: backgroundColor || '#000000' }]}>
          <View style={styles.webInner}>{loadingView}</View>
        </View>
      );
    }
    return loadingView;
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webOuter, { backgroundColor }]}>
        <View style={[styles.webInner, { position: 'relative' }]}>
          <Slot />
          <TutorialOverlay />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.nativeRoot}>
      <Slot />
      <TutorialOverlay />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ActiveSessionProvider>
          <TutorialProvider>
            <ThemedNavigationProvider />
          </TutorialProvider>
        </ActiveSessionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Wrapper to use theme context for navigation
function ThemedNavigationProvider() {
  return (
    <NavigationThemeProvider value={DarkTheme}>
      <RootLayoutNav />
      <StatusBar style="light" />
    </NavigationThemeProvider>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh',
    width: '100%',
  },
  webInner: {
    width: '100%',
    maxWidth: WEB_MAX_WIDTH,
    flex: 1,
    minHeight: '100dvh',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
    }),
  },
});
