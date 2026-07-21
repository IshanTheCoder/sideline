/**
 * Reset password — redesign: dark auth styling matching login/signup (was an
 * old-theme screen with a blue button). Reached from the password-reset
 * email link; updates the password on the recovery session, then sends the
 * coach back to login. Logic unchanged.
 */
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { EyeIcon, EyeOffIcon } from '@/components/icons/AuthIcons';
import { Brand } from '@/constants/brand';
import { showAlert } from '@/lib/alert';
import { supabase } from '@/lib/supabase';

// on-dark surfaces for the auth forms (kept in sync with login.jsx)
const Dark = {
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.16)',
  placeholder: 'rgba(255,255,255,0.35)',
  label: 'rgba(255,255,255,0.55)',
  iconMuted: 'rgba(255,255,255,0.5)',
  error: '#FF8A7A',
  errorBorder: '#FF6B5C',
};

export default function ResetPasswordScreen() {
  const router = useRouter();
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
    const newErrors = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

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
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('❌ Password update error:', error);
        showAlert('Error', error.message);
        setLoading(false);
        return;
      }

      showAlert('Password Updated', 'You can now log in with your new password.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error) {
      console.error('❌ Password reset exception:', error);
      showAlert('Error', error.message || 'Failed to reset password');
      setLoading(false);
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
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>Choose a new password for your account.</Text>

        {/* new password */}
        <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
            placeholder="At least 6 characters"
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

        {/* confirm password */}
        <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              errors.confirmPassword && styles.inputError,
            ]}
            placeholder="Type it again"
            placeholderTextColor={Dark.placeholder}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
            }}
            secureTextEntry={!showConfirmPassword}
            keyboardAppearance="dark"
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            activeOpacity={0.7}
          >
            {showConfirmPassword ? (
              <EyeOffIcon size={22} color={Dark.iconMuted} />
            ) : (
              <EyeIcon size={22} color={Dark.iconMuted} />
            )}
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && (
          <Text style={styles.errorText}>{errors.confirmPassword}</Text>
        )}

        {/* reset */}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          onPress={handleResetPassword}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.7}
        >
          <Text style={styles.switchText}>
            Back to <Text style={styles.switchLink}>Login</Text>
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
    paddingTop: 84,
    paddingBottom: 48,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 15,
    color: Brand.onDarkMuted,
    marginTop: 6,
    lineHeight: 22,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Dark.label,
    marginTop: 22,
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
  primaryBtn: {
    marginTop: 28,
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
