import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';

export default function WelcomeScreen() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // If user is already logged in, redirect to main app
    if (!loading && user) {
      router.replace('/(tabs)');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Anchor
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Your coaching assistant for capturing game observations
        </ThemedText>
        <ThemedText style={styles.description}>
          Quickly capture voice memos during games and organize them with AI-powered insights.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/signup')}
          activeOpacity={0.8}>
          <ThemedText style={styles.primaryButtonText}>Get Started</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.8}>
          <ThemedText style={styles.secondaryButtonText}>Already have an account? Login</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#0a7ea4',
  },
});
