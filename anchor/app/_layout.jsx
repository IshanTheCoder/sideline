import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ActiveSessionProvider } from '@/contexts/ActiveSessionContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Protected route component that handles navigation based on auth state
function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
  if (loading) {
    return (
      <View style={[
        styles.loadingContainer,
        { backgroundColor: '#000000' }
      ]}>
        <ActivityIndicator size="large" color="#5BA3F5" />
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
});
