/**
 * Signup — redesign: black auth background matching welcome/login, white
 * Google button, on-dark inputs with uppercase eyebrow labels, and a simple
 * sport chip (volleyball) instead of the old themed selector. Signup logic
 * (Supabase email/password + profile insert, Google OAuth + sport modal) is
 * unchanged from the previous version.
 */
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
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
import { SportSelectionModal } from '@/components/SportSelectionModal';
import { Brand } from '@/constants/brand';
import { showAlert } from '@/lib/alert';
import { signInWithGoogle } from '@/lib/googleAuth';
import { supabase } from '@/lib/supabase';

// on-dark surfaces for the auth forms (kept in sync with login.jsx)
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

const SPORTS = ['Volleyball'];

export default function SignupScreen() {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sport, setSport] = useState('Volleyball');
  const [loading, setLoading] = useState(false);
  const [showSportModal, setShowSportModal] = useState(false);
  const [googleUserData, setGoogleUserData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateForm = () => {
    const newErrors = {};

    if (!teamName.trim()) {
      newErrors.teamName = 'Team name is required';
    } else if (teamName.trim().length < 2) {
      newErrors.teamName = 'Team name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

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

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: teamName.trim(),
            sport: sport,
          },
        },
      });

      if (authError) {
        console.error('Signup error:', authError);
        if (Platform.OS === 'web') {
          window.alert(`Signup Error: ${authError.message}`);
        } else {
          showAlert('Signup Error', authError.message);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        if (Platform.OS === 'web') {
          window.alert('Error: Failed to create account. Please try again.');
        } else {
          showAlert('Error', 'Failed to create account. Please try again.');
        }
        setLoading(false);
        return;
      }

      // Create profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: email.trim().split('@')[0], // Use email prefix
          name: teamName.trim(),
          sport: sport,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Show error to user but don't completely fail the signup
        const errorMsg = 'Your account was created, but there was an issue setting up your profile. You can update your profile later.\n\nError: ' + profileError.message;

        if (Platform.OS === 'web') {
          window.alert(errorMsg);
          router.push('/(auth)/login');
        } else {
          showAlert('Profile Creation Warning', errorMsg, [
            { text: 'OK', onPress: () => router.push('/(auth)/login') },
          ]);
        }
        setLoading(false);
        return;
      }

      console.log('✅ Account created successfully!');
      const successMsg = 'Account created successfully! Please check your email to verify your account.';

      if (Platform.OS === 'web') {
        window.alert(successMsg);
        setTeamName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        router.push('/(auth)/login');
      } else {
        showAlert('Success', successMsg, [
          {
            text: 'OK',
            onPress: () => {
              setTeamName('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
              router.push('/(auth)/login');
            },
          },
        ]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Signup error:', error);
      const errorMsg = error.message || 'An unexpected error occurred during signup. Please try again.';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        showAlert('Error', errorMsg);
      }
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const { data, error } = await signInWithGoogle();
      if (error) {
        showAlert('Google Sign-In Error', error.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Store user data and show sport selection modal
        setGoogleUserData(data.user);
        setShowSportModal(true);
        setLoading(false);
      }
    } catch (error) {
      showAlert('Error', error.message || 'An error occurred during Google sign-in');
      setLoading(false);
    }
  };

  const handleSportSelection = async (selectedSport) => {
    if (!googleUserData) return;

    setLoading(true);
    try {
      // Check if profile exists, if not create one
      const { data: profile, error: selectError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', googleUserData.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 is the "no rows returned" error, expected for new users
        console.error('Profile fetch error:', selectError);
        showAlert('Error', 'Failed to check profile. Please try again.');
        setLoading(false);
        return;
      }

      if (!profile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: googleUserData.id,
            username: googleUserData.email?.split('@')[0] || 'user',
            name: googleUserData.user_metadata?.full_name || googleUserData.email?.split('@')[0] || 'User',
            sport: selectedSport,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          showAlert(
            'Profile Error',
            'Failed to create your profile. Please try again.\n\nError: ' + profileError.message
          );
          setLoading(false);
          return;
        }
      } else {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ sport: selectedSport })
          .eq('id', googleUserData.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
          showAlert(
            'Update Error',
            'Failed to update your sport preference. You can change it later in settings.'
          );
        }
      }

      // AuthContext will handle navigation via the RootLayoutNav
    } catch (error) {
      console.error('Sport selection error:', error);
      showAlert(
        'Error',
        error.message || 'An unexpected error occurred while completing signup'
      );
    } finally {
      setLoading(false);
      setGoogleUserData(null);
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
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Three-second voice notes on game day, practice plans after.
        </Text>

        {/* Google */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleSignup}
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

        {/* team name */}
        <Text style={styles.fieldLabel}>TEAM NAME</Text>
        <TextInput
          style={[styles.input, errors.teamName && styles.inputError]}
          placeholder="e.g. Varsity Volleyball 2026"
          placeholderTextColor={Dark.placeholder}
          value={teamName}
          onChangeText={(text) => {
            setTeamName(text);
            if (errors.teamName) setErrors({ ...errors, teamName: undefined });
          }}
          autoCapitalize="words"
          keyboardAppearance="dark"
          editable={!loading}
        />
        {errors.teamName && <Text style={styles.errorText}>{errors.teamName}</Text>}

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
        <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
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

        {/* sport */}
        <Text style={styles.fieldLabel}>SPORT</Text>
        <View style={styles.sportRow}>
          {SPORTS.map((s) => {
            const sel = sport === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.sportChip, sel && styles.sportChipActive]}
                onPress={() => setSport(s)}
                activeOpacity={0.8}
              >
                <Text style={styles.sportEmoji}>🏐</Text>
                <Text style={[styles.sportChipText, sel && styles.sportChipTextActive]}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* sign up */}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.7}
        >
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchLink}>Login</Text>
          </Text>
        </TouchableOpacity>
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
  sportRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Dark.inputBorder,
    backgroundColor: Dark.inputBg,
  },
  sportChipActive: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  sportEmoji: {
    fontSize: 16,
  },
  sportChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sportChipTextActive: {
    color: '#FFFFFF',
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
