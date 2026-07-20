/**
 * ChangeEmailModal — redesign: brand-styled bottom sheet (was an old-theme
 * full-width modal). Verifies the current password, then sends Supabase's
 * email-change verification link. Logic unchanged; only the shell/styles
 * moved to the shared BottomSheet + Brand tokens.
 */
import { X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheet from '@/components/BottomSheet';
import { Brand } from '@/constants/brand';
import { showAlert } from '@/lib/alert';
import { supabase } from '@/lib/supabase';

export default function ChangeEmailModal({ visible, onClose, currentEmail }) {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleClose = () => {
    setNewEmail('');
    setPassword('');
    setEmailError('');
    setPasswordError('');
    onClose();
  };

  const handleSave = async () => {
    setEmailError('');
    setPasswordError('');

    if (!newEmail.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(newEmail.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setEmailError('New email must be different from current email');
      return;
    }
    if (!password.trim()) {
      setPasswordError('Password is required to confirm this change');
      return;
    }

    setSaving(true);
    try {
      // First, verify the password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: password,
      });

      if (signInError) {
        setPasswordError('Incorrect password');
        setSaving(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already in use')) {
          setEmailError('This email is already in use');
        } else if (error.message.includes('rate limit')) {
          showAlert('Error', 'Too many attempts. Please try again later.');
        } else {
          showAlert('Error', error.message || 'Failed to update email. Please try again.');
        }
        setSaving(false);
        return;
      }

      setSaving(false);
      showAlert(
        'Verification Email Sent',
        `A confirmation email has been sent to ${newEmail}. Please check your inbox and click the verification link to complete the email change.`,
        [{ text: 'OK', onPress: () => handleClose() }]
      );
    } catch (error) {
      console.log('Unexpected error updating email:', error);
      showAlert('Error', 'An unexpected error occurred. Please try again.');
      setSaving(false);
    }
  };

  const canSave = newEmail.trim().length > 0 && password.trim().length > 0 && !saving;

  return (
    <BottomSheet visible={visible} onClose={handleClose} maxHeightPct={0.86}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Change email</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
          <X size={13} color={Brand.chip} strokeWidth={2.6} />
        </TouchableOpacity>
      </View>

      <Text style={styles.fieldLabel}>CURRENT EMAIL</Text>
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyText} numberOfLines={1}>
          {currentEmail}
        </Text>
      </View>

      <Text style={styles.fieldLabel}>NEW EMAIL</Text>
      <TextInput
        value={newEmail}
        onChangeText={(t) => {
          setNewEmail(t);
          setEmailError('');
        }}
        placeholder="coach@school.edu"
        placeholderTextColor={Brand.faint}
        style={[styles.input, !!emailError && styles.inputError]}
        editable={!saving}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
      />
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

      <Text style={styles.fieldLabel}>CONFIRM WITH PASSWORD</Text>
      <TextInput
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setPasswordError('');
        }}
        placeholder="Your password"
        placeholderTextColor={Brand.faint}
        style={[styles.input, !!passwordError && styles.inputError]}
        editable={!saving}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
      />
      {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

      <Text style={styles.hint}>
        We’ll send a verification link to the new address — your email only changes once you
        click it.
      </Text>

      <TouchableOpacity
        style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!canSave}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Send verification</Text>
        )}
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Brand.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Brand.muted,
    marginTop: 16,
    marginBottom: 8,
  },
  readOnlyBox: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: Brand.hairline,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  readOnlyText: {
    fontSize: 16,
    color: Brand.muted,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: Brand.border2,
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 16,
    color: Brand.ink,
    backgroundColor: Brand.card,
  },
  inputError: {
    borderColor: Brand.danger,
  },
  errorText: {
    color: Brand.danger,
    fontSize: 12.5,
    marginTop: 6,
  },
  hint: {
    fontSize: 12.5,
    color: Brand.muted,
    lineHeight: 18.5,
    marginTop: 14,
  },
  saveBtn: {
    marginTop: 18,
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: Brand.chevron,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
