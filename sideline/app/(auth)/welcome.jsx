import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/whistle-logo.png')}
            style={styles.whistleLogo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>SIDELINE</Text>
        </View>

        {/* Welcome Text */}
        <View style={styles.textContainer}>
          <ThemedText type="title" style={styles.title}>
            Welcome to Sideline
          </ThemedText>
          <ThemedText style={styles.description}>
            Your coaching assistant for capturing and organizing game observations
          </ThemedText>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#3B6FA8' }]}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.primaryButtonText}>Get Started</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.secondaryButtonText}>
              Already have an account?{' '}
              <ThemedText style={styles.loginLink}>Login</ThemedText>
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    overflow: 'visible',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 36,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'visible',
  },
  whistleLogo: {
    width: 360,
    height: 360,
    marginBottom: -70,
  },
  logoText: {
    fontSize: 68,
    fontWeight: '900',
    color: '#5A8A6D',
    letterSpacing: -1.5,
    textAlign: 'center',
    width: '100%',
    lineHeight: 80,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  textContainer: {
    marginTop: -10,
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    paddingVertical: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    opacity: 0.8,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#3B6FA8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    opacity: 0.7,
  },
  loginLink: {
    color: '#3B6FA8',
    fontWeight: '600',
    opacity: 1,
  },
});
