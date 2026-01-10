import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SportButtonSelector } from '@/components/SportButtonSelector';
import { SportSelectionModal } from '@/components/SportSelectionModal';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/googleAuth';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function SignupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sport, setSport] = useState('Volleyball');
  const [loading, setLoading] = useState(false);
  const [showSportModal, setShowSportModal] = useState(false);
  const [googleUserData, setGoogleUserData] = useState<any>(null);
  const [errors, setErrors] = useState<{
    teamName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Team name validation
    if (!teamName.trim()) {
      newErrors.teamName = 'Team name is required';
    } else if (teamName.trim().length < 2) {
      newErrors.teamName = 'Team name must be at least 2 characters';
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

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

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Sign up with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        Alert.alert('Signup Error', authError.message);
        return;
      }

      if (authData.user) {
        // Create profile in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            username: email.trim().split('@')[0], // Use email prefix as username
            name: teamName.trim(),
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't fail signup if profile creation fails - user can update later
        }

        Alert.alert(
          'Success',
          'Account created successfully! Please check your email to verify your account.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/(auth)/login'),
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const { data, error } = await signInWithGoogle();
      if (error) {
        Alert.alert('Google Sign-In Error', error.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Store user data and show sport selection modal
        setGoogleUserData(data.user);
        setShowSportModal(true);
        setLoading(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred during Google sign-in');
      setLoading(false);
    }
  };

  const handleSportSelection = async (selectedSport: string) => {
    if (!googleUserData) return;

    setLoading(true);
    try {
      // Check if profile exists, if not create one
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', googleUserData.id)
        .single();

      if (!profile) {
        // Create profile with Google account info
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: googleUserData.id,
            username: googleUserData.email?.split('@')[0] || 'user',
            name: googleUserData.user_metadata?.full_name || googleUserData.email?.split('@')[0] || 'User',
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      // TODO: Save selected sport to user profile or team
      // For now, we'll just navigate to main app
      // In the future, this should create a team with the selected sport

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred while completing signup');
    } finally {
      setLoading(false);
      setGoogleUserData(null);
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
            Create Account
          </ThemedText>
        </View>

        {/* Google Sign-In Button */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignup}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#FFFFFF" />
              <ThemedText style={styles.googleButtonText}>
                Sign up with Google
              </ThemedText>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>OR</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        {/* Team Name Input */}
        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Team's Name</ThemedText>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.background },
              errors.teamName && styles.inputError,
            ]}
            placeholder="Enter name"
            placeholderTextColor={colors.text + '80'}
            value={teamName}
            onChangeText={(text) => {
              setTeamName(text);
              if (errors.teamName) setErrors({ ...errors, teamName: undefined });
            }}
            autoCapitalize="words"
            editable={!loading}
          />
          {errors.teamName && (
            <ThemedText style={styles.errorText}>{errors.teamName}</ThemedText>
          )}
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
            placeholder="Enter email"
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
          <TextInput
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.background },
              errors.password && styles.inputError,
            ]}
            placeholder="Enter password"
            placeholderTextColor={colors.text + '80'}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: undefined });
            }}
            secureTextEntry
            editable={!loading}
          />
          {errors.password && (
            <ThemedText style={styles.errorText}>{errors.password}</ThemedText>
          )}
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Confirm Password</ThemedText>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.background },
              errors.confirmPassword && styles.inputError,
            ]}
            placeholder="Confirm password"
            placeholderTextColor={colors.text + '80'}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
            }}
            secureTextEntry
            editable={!loading}
          />
          {errors.confirmPassword && (
            <ThemedText style={styles.errorText}>{errors.confirmPassword}</ThemedText>
          )}
        </View>

        {/* Sport Button Selector */}
        <SportButtonSelector selectedSport={sport} onSportChange={setSport} />

        {/* Sign Up Button */}
        <TouchableOpacity
          style={[styles.signupButton, loading && styles.signupButtonDisabled]}
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.signupButtonText}>Sign Up</ThemedText>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <ThemedText style={styles.loginText}>
            Already have an account?{' '}
            <ThemedText
              style={styles.loginLink}
              onPress={() => router.push('/(auth)/login')}
            >
              Login
            </ThemedText>
          </ThemedText>
        </View>
      </ScrollView>

      {/* Sport Selection Modal for Google Sign-up */}
      <SportSelectionModal
        visible={showSportModal}
        onClose={() => {
          setShowSportModal(false);
          setGoogleUserData(null);
        }}
        onSelect={handleSportSelection}
        initialSport={sport}
      />
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
  inputError: {
    borderColor: '#FF6B4A',
  },
  errorText: {
    color: '#FF6B4A',
    fontSize: 12,
    marginTop: 4,
  },
  signupButton: {
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
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 16,
    opacity: 0.7,
  },
  loginLink: {
    color: '#3B6FA8',
    fontWeight: '600',
    opacity: 1,
  },
});
