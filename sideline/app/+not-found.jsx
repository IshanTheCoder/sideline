/**
 * Fallback route for any unmatched URL — a mistyped marketing link or a bad
 * in-app deep link both land here (Expo Router resolves every unmatched path
 * through this single file, on web and native). See _layout.jsx: this route
 * is exempted from the auth-redirect effect so it's actually reachable.
 */
import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Brand, Shape, eyebrowText } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';

export default function NotFoundScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const goHome = () => {
    router.replace(user ? '/(tabs)/app' : '/');
  };

  return (
    <View style={styles.container}>
      <Head>
        <title>Sideline - Page Not Found</title>
      </Head>
      <StatusBar style="dark" />
      <View style={styles.center}>
        <Text style={styles.eyebrow}>404</Text>
        <View style={styles.iconCircle}>
          <Image
            source={require('@/assets/images/app-logo.png')}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Oh no! You're out of bounds!</Text>
        <Text style={styles.subtitle}>
          That page isn't in the playbook. Let's get you back in the game.
        </Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={goHome}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.bg,
    paddingHorizontal: 30,
    paddingTop: 56,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    ...eyebrowText,
    color: Brand.sage,
    marginBottom: 18,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Brand.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 52,
    height: 52,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Brand.ink,
    marginTop: 24,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Brand.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 280,
  },
  bottom: {
    width: '100%',
  },
  primaryButton: {
    width: '100%',
    height: 60,
    borderRadius: Shape.buttonRadius,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
