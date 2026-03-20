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
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Check if user has valid session from password reset
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('⚠️ No session found for password reset');
    } else {
      console.log('✅ Valid session for password reset');
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Updating password...');
      
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('❌ Password update error:', error);
        if (Platform.OS === 'web') {
          window.alert(`Error: ${error.message}`);
        } else {
          // Alert not imported for native, would need to import
          console.error('Password reset failed:', error.message);
        }
        setLoading(false);
        return;
      }

      console.log('✅ Password updated successfully');
      
      if (Platform.OS === 'web') {
        window.alert('Password updated successfully! You can now log in with your new password.');
      }
      
      // Redirect to login
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('❌ Password reset exception:', error);
      const errorMsg = error.message || 'Failed to reset password';
      
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      }
      
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Reset Password
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Enter your new password below
          </ThemedText>
        </View>

        {/* New Password Input */}
        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>New Password</ThemedText>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                { color: colors.text, backgroundColor: colors.background },
                errors.password && styles.inputError,
              ]}
              placeholder="Enter new password"
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
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Confirm New Password</ThemedText>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                { color: colors.text, backgroundColor: colors.background },
                errors.confirmPassword && styles.inputError,
              ]}
              placeholder="Confirm new password"
              placeholderTextColor={colors.text + '80'}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
              }}
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={colors.icon}
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && (
            <ThemedText style={styles.errorText}>{errors.confirmPassword}</ThemedText>
          )}
        </View>

        {/* Reset Password Button */}
        <TouchableOpacity
          style={[styles.resetButton, loading && styles.resetButtonDisabled]}
          onPress={handleResetPassword}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.resetButtonText}>Reset Password</ThemedText>
          )}
        </TouchableOpacity>

        {/* Back to Login Link */}
        <View style={styles.loginContainer}>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <ThemedText style={styles.loginText}>
              Back to Login
            </ThemedText>
          </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
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
    paddingRight: 50,
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
  resetButton: {
    backgroundColor: '#3B6FA8',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    color: '#3B6FA8',
    fontSize: 16,
    fontWeight: '600',
  },
});
