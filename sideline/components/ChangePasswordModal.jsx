/**
 * ChangePasswordModal — redesign: brand-styled bottom sheet (was an old-theme
 * full-width modal). Verifies the current password, then updates it via
 * Supabase. Logic unchanged; only the shell/styles moved to the shared
 * BottomSheet + Brand tokens.
 */
import { Eye, EyeOff, X } from 'lucide-react-native';
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

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  editable,
  autoComplete,
  allowReveal = true,
}) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.passwordWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Brand.faint}
          style={[styles.input, allowReveal && styles.passwordInput, !!error && styles.inputError]}
          editable={editable}
          secureTextEntry={!allowReveal || !show}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
        />
        {allowReveal ? (
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setShow(!show)} activeOpacity={0.7}>
            {show ? (
              <EyeOff size={20} color={Brand.muted} strokeWidth={2} />
            ) : (
              <Eye size={20} color={Brand.muted} strokeWidth={2} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

export default function ChangePasswordModal({ visible, onClose, userEmail }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validatePassword = (password) => {
    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }
    return { valid: true, error: '' };
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    onClose();
  };

  const handleSave = async () => {
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');

    if (!currentPassword.trim()) {
      setCurrentPasswordError('Current password is required');
      return;
    }
    if (!newPassword.trim()) {
      setNewPasswordError('New password is required');
      return;
    }
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      setNewPasswordError(passwordValidation.error);
      return;
    }
    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      setNewPasswordError('New password must be different from current password');
      return;
    }

    setSaving(true);
    try {
      // First, verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        setCurrentPasswordError('Current password is incorrect');
        setSaving(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        if (error.message.includes('same old password')) {
          setNewPasswordError('New password must be different from current password');
        } else if (error.message.includes('rate limit')) {
          showAlert('Error', 'Too many attempts. Please try again later.');
        } else {
          showAlert('Error', error.message || 'Failed to update password. Please try again.');
        }
        setSaving(false);
        return;
      }

      setSaving(false);
      showAlert('Password Changed', 'Your password has been successfully updated.', [
        { text: 'OK', onPress: () => handleClose() },
      ]);
    } catch (error) {
      console.log('Unexpected error updating password:', error);
      showAlert('Error', 'An unexpected error occurred. Please try again.');
      setSaving(false);
    }
  };

  const canSave =
    currentPassword.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    !saving;

  return (
    <BottomSheet visible={visible} onClose={handleClose} maxHeightPct={0.86}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Change password</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
          <X size={13} color={Brand.chip} strokeWidth={2.6} />
        </TouchableOpacity>
      </View>

      <PasswordField
        label="CURRENT PASSWORD"
        value={currentPassword}
        onChange={(t) => {
          setCurrentPassword(t);
          setCurrentPasswordError('');
        }}
        placeholder="Your current password"
        error={currentPasswordError}
        editable={!saving}
        autoComplete="password"
      />
      <PasswordField
        label="NEW PASSWORD"
        value={newPassword}
        onChange={(t) => {
          setNewPassword(t);
          setNewPasswordError('');
          if (confirmPassword && t === confirmPassword) setConfirmPasswordError('');
        }}
        placeholder="At least 8 characters"
        error={newPasswordError}
        hint="Must be at least 8 characters"
        editable={!saving}
        autoComplete="password-new"
      />
      <PasswordField
        label="CONFIRM NEW PASSWORD"
        value={confirmPassword}
        onChange={(t) => {
          setConfirmPassword(t);
          setConfirmPasswordError('');
        }}
        placeholder="Type it again"
        error={confirmPasswordError}
        editable={!saving}
        autoComplete="password-new"
        allowReveal={false}
      />

      <Text style={styles.hint}>You’ll stay signed in after changing your password.</Text>

      <TouchableOpacity
        style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!canSave}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Update password</Text>
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
  passwordWrap: {
    position: 'relative',
    width: '100%',
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
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 15,
  },
  inputError: {
    borderColor: Brand.danger,
  },
  errorText: {
    color: Brand.danger,
    fontSize: 12.5,
    marginTop: 6,
  },
  hintText: {
    color: Brand.faint,
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
