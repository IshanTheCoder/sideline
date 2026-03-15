import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import 'react-native-reanimated';
import { useFonts } from 'expo-font';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ActiveSessionProvider } from '@/contexts/ActiveSessionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// On web, wrap app in a centered mobile-width column so UI matches mobile
const WEB_MAX_WIDTH = 440;

function RootLayoutNav() {
  const [fontsLoaded] = useFonts(MaterialIcons.font);
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'dark']?.background ?? '#000000';

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
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
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

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
        <View style={styles.webInner}>
          <Slot />
        </View>
      </View>
    );
  }
  return <Slot />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ActiveSessionProvider>
          <ThemedNavigationProvider />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
  },
  webInner: {
    width: '100%',
    maxWidth: WEB_MAX_WIDTH,
    flex: 1,
    minHeight: '100vh',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
    }),
  },
});
