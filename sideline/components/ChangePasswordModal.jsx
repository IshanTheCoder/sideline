import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

export default function ChangePasswordModal({
  visible,
  onClose,
  userEmail,
}) {
  const colorScheme = useColorScheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation
  const validatePassword = (password) => {
    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }
    
    // Optional: Add more validation rules
    // if (!/[A-Z]/.test(password)) {
    //   return { valid: false, error: 'Password must contain at least one uppercase letter' };
    // }
    // if (!/[a-z]/.test(password)) {
    //   return { valid: false, error: 'Password must contain at least one lowercase letter' };
    // }
    // if (!/[0-9]/.test(password)) {
    //   return { valid: false, error: 'Password must contain at least one number' };
    // }
    
    return { valid: true, error: '' };
  };

  const handleCurrentPasswordChange = (text) => {
    setCurrentPassword(text);
    setCurrentPasswordError('');
  };

  const handleNewPasswordChange = (text) => {
    setNewPassword(text);
    setNewPasswordError('');
    // Also clear confirm password error if passwords now match
    if (confirmPassword && text === confirmPassword) {
      setConfirmPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    setConfirmPasswordError('');
  };

  const handleSave = async () => {
    // Reset errors
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');

    // Validation
    if (!currentPassword.trim()) {
      setCurrentPasswordError('Current password is required');
      return;
    }

    if (!newPassword.trim()) {
      setNewPasswordError('New password is required');
      return;
    }

    // Validate new password
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
        console.log('Current password verification failed:', signInError);
        setCurrentPasswordError('Current password is incorrect');
        setSaving(false);
        return;
      }

      // Current password is correct, proceed with password update
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.log('Password update error:', error);
        
        if (error.message.includes('same old password')) {
          setNewPasswordError('New password must be different from current password');
        } else if (error.message.includes('rate limit')) {
          Alert.alert('Error', 'Too many attempts. Please try again later.');
        } else {
          Alert.alert('Error', error.message || 'Failed to update password. Please try again.');
        }
        
        setSaving(false);
        return;
      }

      // Success
      setSaving(false);
      
      Alert.alert(
        'Password Changed',
        'Your password has been successfully updated.',
        [
          {
            text: 'OK',
            onPress: () => {
              handleClose();
            },
          },
        ]
      );
    } catch (error) {
      console.log('Unexpected error updating password:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setSaving(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: Colors[colorScheme].background,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} disabled={saving}>
              <ThemedText style={styles.cancelButton}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.title}>Change Password</ThemedText>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={Colors[colorScheme].tint} />
              ) : (
                <ThemedText
                  style={[
                    styles.saveButton,
                    { color: Colors[colorScheme].tint },
                  ]}
                >
                  Save
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Current Password Input */}
            <View style={styles.inputSection}>
              <ThemedText style={styles.label}>Current Password</ThemedText>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      backgroundColor: Colors[colorScheme].inputBackground,
                      color: Colors[colorScheme].text,
                      borderColor: currentPasswordError ? Colors[colorScheme].error : Colors[colorScheme].border,
                      borderWidth: currentPasswordError ? 1 : 0,
                    },
                  ]}
                  value={currentPassword}
                  onChangeText={handleCurrentPasswordChange}
                  placeholder="Enter current password"
                  placeholderTextColor={Colors[colorScheme].placeholder}
                  editable={!saving}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <IconSymbol
                    name={showCurrentPassword ? "eye.slash" : "eye"}
                    size={20}
                    color={Colors[colorScheme].icon}
                  />
                </TouchableOpacity>
              </View>
              {currentPasswordError ? (
                <View style={styles.errorContainer}>
                  <IconSymbol
                    name="exclamationmark.circle.fill"
                    size={16}
                    color={Colors[colorScheme].error}
                  />
                  <ThemedText style={[styles.errorText, { color: Colors[colorScheme].error }]}>
                    {currentPasswordError}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {/* New Password Input */}
            <View style={styles.inputSection}>
              <ThemedText style={styles.label}>New Password</ThemedText>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      backgroundColor: Colors[colorScheme].inputBackground,
                      color: Colors[colorScheme].text,
                      borderColor: newPasswordError ? Colors[colorScheme].error : Colors[colorScheme].border,
                      borderWidth: newPasswordError ? 1 : 0,
                    },
                  ]}
                  value={newPassword}
                  onChangeText={handleNewPasswordChange}
                  placeholder="Enter new password"
                  placeholderTextColor={Colors[colorScheme].placeholder}
                  editable={!saving}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <IconSymbol
                    name={showNewPassword ? "eye.slash" : "eye"}
                    size={20}
                    color={Colors[colorScheme].icon}
                  />
                </TouchableOpacity>
              </View>
              {newPasswordError ? (
                <View style={styles.errorContainer}>
                  <IconSymbol
                    name="exclamationmark.circle.fill"
                    size={16}
                    color={Colors[colorScheme].error}
                  />
                  <ThemedText style={[styles.errorText, { color: Colors[colorScheme].error }]}>
                    {newPasswordError}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.hint}>
                  Must be at least 8 characters
                </ThemedText>
              )}
            </View>

            {/* Confirm New Password Input */}
            <View style={styles.inputSection}>
              <ThemedText style={styles.label}>Confirm New Password</ThemedText>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      backgroundColor: Colors[colorScheme].inputBackground,
                      color: Colors[colorScheme].text,
                      borderColor: confirmPasswordError ? Colors[colorScheme].error : Colors[colorScheme].border,
                      borderWidth: confirmPasswordError ? 1 : 0,
                    },
                  ]}
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors[colorScheme].placeholder}
                  editable={!saving}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <IconSymbol
                    name={showConfirmPassword ? "eye.slash" : "eye"}
                    size={20}
                    color={Colors[colorScheme].icon}
                  />
                </TouchableOpacity>
              </View>
              {confirmPasswordError ? (
                <View style={styles.errorContainer}>
                  <IconSymbol
                    name="exclamationmark.circle.fill"
                    size={16}
                    color={Colors[colorScheme].error}
                  />
                  <ThemedText style={[styles.errorText, { color: Colors[colorScheme].error }]}>
                    {confirmPasswordError}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {/* Security Notice */}
            <View style={styles.noticeContainer}>
              <IconSymbol
                name="info.circle"
                size={20}
                color={Colors[colorScheme].tint}
              />
              <ThemedText style={styles.noticeText}>
                For your security, make sure your new password is strong and unique. You'll remain logged in after changing your password.
              </ThemedText>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
    minHeight: '50%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    fontSize: 16,
    opacity: 0.6,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordInputContainer: {
    position: 'relative',
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  hint: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    marginLeft: 4,
  },
  noticeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(91, 163, 245, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  noticeText: {
    fontSize: 13,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
    opacity: 0.8,
  },
});
