import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/alert';
import { signInWithGoogle } from '@/lib/googleAuth';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Show error from OAuth callback if present
  useEffect(() => {
    if (params.error) {
      if (Platform.OS === 'web') {
        window.alert(`Authentication Error: ${params.error}`);
      } else {
        showAlert('Authentication Error', params.error);
      }
    }
  }, [params.error]);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error('Login error:', error);
        if (Platform.OS === 'web') {
          window.alert(`Login Error: ${error.message}`);
        } else {
          showAlert('Login Error', error.message);
        }
        setLoading(false);
        return;
      }

      console.log('✅ Login successful!');
      // AuthContext will handle navigation via the RootLayoutNav
      // No need to manually navigate - the useEffect in _layout.tsx will handle it
    } catch (error) {
      console.error('Login error:', error);
      const errorMsg = error.message || 'An unexpected error occurred during login. Please try again.';
      
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        showAlert('Error', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await signInWithGoogle();
      if (error) {
        if (Platform.OS === 'web') {
          window.alert(`Google Sign-In Error: ${error.message}`);
        } else {
          showAlert('Google Sign-In Error', error.message);
        }
        setLoading(false);
        return;
      }

      // AuthContext will handle navigation via the RootLayoutNav
      // No need to manually navigate - the useEffect in _layout.tsx will handle it
      setLoading(false);
    } catch (error) {
      const errorMsg = error.message || 'An error occurred during Google sign-in';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        showAlert('Error', errorMsg);
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    // Validate email first
    if (!email.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Please enter your email address first');
      } else {
        showAlert('Email Required', 'Please enter your email address first');
      }
      return;
    }

    if (!emailRegex.test(email)) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a valid email address');
      } else {
        showAlert('Invalid Email', 'Please enter a valid email address');
      }
      return;
    }

    setResetLoading(true);
    try {
      console.log('📧 Sending password reset email to:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Platform.OS === 'web' 
          ? `${window.location.origin}/reset-password`
          : 'sideline://reset-password',
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        if (Platform.OS === 'web') {
          window.alert(`Error: ${error.message}`);
        } else {
          showAlert('Error', error.message);
        }
        setResetLoading(false);
        return;
      }

      console.log('✅ Password reset email sent');
      
      if (Platform.OS === 'web') {
        window.alert(`Password reset email sent! Check your email (${email}) for a link to reset your password.`);
      } else {
        showAlert(
          'Email Sent',
          `Check your email (${email}) for a link to reset your password.`,
          [{ text: 'OK' }]
        );
      }
      
      setResetLoading(false);
    } catch (error) {
      console.error('❌ Password reset exception:', error);
      const errorMsg = error.message || 'Failed to send password reset email';
      
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        showAlert('Error', errorMsg);
      }
      
      setResetLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#3B6FA8" />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            Welcome Back
          </ThemedText>
        </View>

        {/* Google Sign-In Button */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#FFFFFF" />
              <ThemedText style={styles.googleButtonText}>
                Sign in with Google
              </ThemedText>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>OR</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Email</ThemedText>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.background },
              errors.email && styles.inputError,
            ]}
            placeholder="Enter your email"
            placeholderTextColor={colors.text + '80'}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          {errors.email && (
            <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
          )}
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Password</ThemedText>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                { color: colors.text, backgroundColor: colors.background },
                errors.password && styles.inputError,
              ]}
              placeholder="Enter your password"
              placeholderTextColor={colors.text + '80'}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={colors.icon}
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <ThemedText style={styles.errorText}>{errors.password}</ThemedText>
          )}
          
          {/* Forgot Password Link */}
          <TouchableOpacity 
            onPress={handleForgotPassword}
            disabled={resetLoading}
            style={styles.forgotPasswordContainer}
          >
            <ThemedText style={styles.forgotPasswordText}>
              {resetLoading ? 'Sending...' : 'Forgot Password?'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.loginButtonText}>Sign In</ThemedText>
          )}
        </TouchableOpacity>

        {/* Sign Up Link */}
        <View style={styles.signupContainer}>
          <ThemedText style={styles.signupText}>
            Don't have an account?{' '}
            <ThemedText
              style={styles.signupLink}
              onPress={() => router.push('/(auth)/signup')}
            >
              Sign Up
            </ThemedText>
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 32 : 60,
  },
  header: {
    marginBottom: 32,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1,
    padding: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#4285F4',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    opacity: 0.6,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 50,
  },
  passwordInputContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 50, // Make room for the eye icon
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 13,
    padding: 4,
  },
  inputError: {
    borderColor: '#FF6B4A',
  },
  errorText: {
    color: '#FF6B4A',
    fontSize: 12,
    marginTop: 4,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#3B6FA8',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: '#3B6FA8',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 24,
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
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  signupContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  signupText: {
    fontSize: 16,
    opacity: 0.7,
  },
  signupLink: {
    color: '#3B6FA8',
    fontWeight: '600',
    opacity: 1,
  },
});
