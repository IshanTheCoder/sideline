/**
 * Login — redesign: black auth background matching the welcome screen, white
 * Google button, on-dark inputs with uppercase eyebrow labels, green Sign In.
 * Auth logic (Supabase email/password, Google OAuth, password reset) is
 * unchanged from the previous version.
 */
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { EyeIcon, EyeOffIcon, GoogleLogoIcon } from '@/components/icons/AuthIcons';
import { Brand } from '@/constants/brand';
import { showAlert } from '@/lib/alert';
import { signInWithGoogle } from '@/lib/googleAuth';
import { supabase } from '@/lib/supabase';

// on-dark surfaces for the auth forms (welcome.jsx's black world)
const Dark = {
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.16)',
  placeholder: 'rgba(255,255,255,0.35)',
  label: 'rgba(255,255,255,0.55)',
  divider: 'rgba(255,255,255,0.14)',
  dividerText: 'rgba(255,255,255,0.45)',
  iconMuted: 'rgba(255,255,255,0.5)',
  backBtnBg: 'rgba(255,255,255,0.09)',
  error: '#FF8A7A',
  errorBorder: '#FF6B5C',
};

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Show error from OAuth callback if present
  useEffect(() => {
    if (params.error) {
      showAlert('Authentication Error', params.error);
    }
  }, [params.error]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error('Login error:', error);
        showAlert('Login Error', error.message);
        setLoading(false);
        return;
      }

      console.log('✅ Login successful!');
      // AuthContext will handle navigation via the RootLayoutNav
    } catch (error) {
      console.error('Login error:', error);
      showAlert('Error', error.message || 'An unexpected error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        showAlert('Google Sign-In Error', error.message);
        setLoading(false);
        return;
      }
      // AuthContext will handle navigation via the RootLayoutNav
      setLoading(false);
    } catch (error) {
      showAlert('Error', error.message || 'An error occurred during Google sign-in');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showAlert('Email Required', 'Please enter your email address first');
      return;
    }

    if (!emailRegex.test(email)) {
      showAlert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Platform.OS === 'web'
          ? `${window.location.origin}/reset-password`
          : 'sideline://reset-password',
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        showAlert('Error', error.message);
        setResetLoading(false);
        return;
      }

      showAlert(
        'Email Sent',
        `Check your email (${email}) for a link to reset your password.`,
        [{ text: 'OK' }]
      );
      setResetLoading(false);
    } catch (error) {
      console.error('❌ Password reset exception:', error);
      showAlert('Error', error.message || 'Failed to send password reset email');
      setResetLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={18} color="#fff" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to pick up where you left off.</Text>

        {/* Google */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Brand.ink} />
          ) : (
            <>
              <GoogleLogoIcon size={19} color={Brand.ink} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* email */}
        <Text style={styles.fieldLabel}>EMAIL</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="coach@school.edu"
          placeholderTextColor={Dark.placeholder}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errors.email) setErrors({ ...errors, email: undefined });
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardAppearance="dark"
          editable={!loading}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        {/* password */}
        <Text style={styles.fieldLabel}>PASSWORD</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
            placeholder="Your password"
            placeholderTextColor={Dark.placeholder}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: undefined });
            }}
            secureTextEntry={!showPassword}
            keyboardAppearance="dark"
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            {showPassword ? (
              <EyeOffIcon size={22} color={Dark.iconMuted} />
            ) : (
              <EyeIcon size={22} color={Dark.iconMuted} />
            )}
          </TouchableOpacity>
        </View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        <TouchableOpacity
          onPress={handleForgotPassword}
          disabled={resetLoading}
          style={styles.forgotWrap}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotText}>
            {resetLoading ? 'Sending…' : 'Forgot password?'}
          </Text>
        </TouchableOpacity>

        {/* sign in */}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => router.push('/(auth)/signup')}
          activeOpacity={0.7}
        >
          <Text style={styles.switchText}>
            Don’t have an account? <Text style={styles.switchLink}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.authBg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 56,
    paddingBottom: 48,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Dark.backBtnBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#FFFFFF',
    marginTop: 26,
  },
  subtitle: {
    fontSize: 15,
    color: Brand.onDarkMuted,
    marginTop: 6,
    lineHeight: 22,
  },
  googleBtn: {
    marginTop: 28,
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleBtnText: {
    color: Brand.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Dark.divider,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Dark.dividerText,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Dark.label,
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderColor: Dark.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: Dark.inputBg,
  },
  passwordWrap: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 15,
  },
  inputError: {
    borderColor: Dark.errorBorder,
  },
  errorText: {
    color: Dark.error,
    fontSize: 12.5,
    marginTop: 6,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  forgotText: {
    color: Brand.greenLink,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtn: {
    marginTop: 26,
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  switchRow: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 15,
    color: Brand.onDarkMuted,
  },
  switchLink: {
    color: Brand.greenLink,
    fontWeight: '700',
  },
});
