/**
 * Auth / welcome screen — light cream background (matches marketing + app),
 * whistle logo, green SIDELINE wordmark, green Get Started. Entry point for
 * signed-out users.
 */
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Brand } from '@/constants/brand';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* Web only: escape hatch back to the marketing site */}
      {Platform.OS === 'web' && (
        <TouchableOpacity
          style={styles.backToSite}
          onPress={() => { window.location.href = '/'; }}
          activeOpacity={0.7}
          accessibilityLabel="Back to the Sideline website"
        >
          <ChevronLeft size={17} color={Brand.greenLink} strokeWidth={2.6} />
          <Text style={styles.backToSiteText}>Back to site</Text>
        </TouchableOpacity>
      )}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.center}>
          <Image
            source={require('@/assets/images/app-logo.png')}
            style={styles.whistle}
            resizeMode="contain"
          />
          <Text style={styles.wordmark}>SIDELINE</Text>
          <Text style={styles.title}>Welcome to Sideline</Text>
          <Text style={styles.subtitle}>
            Your coaching assistant for capturing and organizing game observations
          </Text>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.loginRow}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginLink}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.bg,
  },
  backToSite: {
    position: 'absolute',
    top: 56,
    left: 22,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  backToSiteText: {
    color: Brand.greenLink,
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 56,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  whistle: {
    width: 300,
    height: 300,
  },
  wordmark: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 1,
    color: Brand.greenWordmark,
    lineHeight: 60,
    marginTop: 8,
    textAlign: 'center',
    includeFontPadding: false,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Brand.ink,
    marginTop: 22,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Brand.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 300,
  },
  bottom: {
    width: '100%',
  },
  primaryButton: {
    width: '100%',
    height: 60,
    borderRadius: 16,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  loginRow: {
    marginTop: 22,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: Brand.muted,
  },
  loginLink: {
    color: Brand.greenLink,
    fontWeight: '700',
  },
});
