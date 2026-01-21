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
import { supabase } from '@/lib/supabase';

export default function ChangeEmailModal({
  visible,
  onClose,
  currentEmail,
}: ChangeEmailModalProps) {
  const colorScheme = 'dark';
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text) => {
    setNewEmail(text);
    setEmailError('');
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    setPasswordError('');
  };

  const handleSave = async () => {
    // Reset errors
    setEmailError('');
    setPasswordError('');

    // Validation
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
        console.log('Password verification failed:', signInError);
        setPasswordError('Incorrect password');
        setSaving(false);
        return;
      }

      // Password is correct, proceed with email update
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (error) {
        console.log('Email update error:', error);
        
        // Handle specific error cases
        if (error.message.includes('already registered') || error.message.includes('already in use')) {
          setEmailError('This email is already in use');
        } else if (error.message.includes('rate limit')) {
          Alert.alert('Error', 'Too many attempts. Please try again later.');
        } else {
          Alert.alert('Error', error.message || 'Failed to update email. Please try again.');
        }
        
        setSaving(false);
        return;
      }

      // Success
      setSaving(false);
      
      Alert.alert(
        'Verification Email Sent',
        `A confirmation email has been sent to ${newEmail}. Please check your inbox and click the verification link to complete the email change.`,
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
      console.log('Unexpected error updating email:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setSaving(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setNewEmail('');
    setPassword('');
    setEmailError('');
    setPasswordError('');
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
            <ThemedText style={styles.title}>Change Email</ThemedText>
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
            {/* Current Email (Read-only) */}
            <View style={styles.inputSection}>
              <ThemedText style={styles.label}>Current Email</ThemedText>
              <View
                style={[
                  styles.input,
                  styles.readOnlyInput,
                  {
                    backgroundColor: Colors[colorScheme].cardBackground,
                    borderColor: Colors[colorScheme].border,
                  },
                ]}
              >
                <ThemedText style={styles.readOnlyText}>{currentEmail}</ThemedText>
              </View>
            </View>

            {/* New Email Input */}
            <View style={styles.inputSection}>
              <ThemedText style={styles.label}>New Email Address</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme].inputBackground,
                    color: Colors[colorScheme].text,
                    borderColor: emailError ? Colors[colorScheme].error : Colors[colorScheme].border,
                    borderWidth: emailError ? 1 : 0,
                  },
                ]}
                value={newEmail}
                onChangeText={handleEmailChange}
                placeholder="Enter new email address"
                placeholderTextColor={Colors[colorScheme].placeholder}
                editable={!saving}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
              />
              {emailError ? (
                <View style={styles.errorContainer}>
                  <IconSymbol
                    name="exclamationmark.circle.fill"
                    size={16}
                    color={Colors[colorScheme].error}
                  />
                  <ThemedText style={[styles.errorText, { color: Colors[colorScheme].error }]}>
                    {emailError}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.hint}>
                  You'll need to verify your new email address
                </ThemedText>
              )}
            </View>

            {/* Password Confirmation */}
            <View style={styles.inputSection}>
              <ThemedText style={styles.label}>Confirm Password</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme].inputBackground,
                    color: Colors[colorScheme].text,
                    borderColor: passwordError ? Colors[colorScheme].error : Colors[colorScheme].border,
                    borderWidth: passwordError ? 1 : 0,
                  },
                ]}
                value={password}
                onChangeText={handlePasswordChange}
                placeholder="Enter your password"
                placeholderTextColor={Colors[colorScheme].placeholder}
                editable={!saving}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
              />
              {passwordError ? (
                <View style={styles.errorContainer}>
                  <IconSymbol
                    name="exclamationmark.circle.fill"
                    size={16}
                    color={Colors[colorScheme].error}
                  />
                  <ThemedText style={[styles.errorText, { color: Colors[colorScheme].error }]}>
                    {passwordError}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.hint}>
                  Enter your password to confirm this change
                </ThemedText>
              )}
            </View>

            {/* Security Notice */}
            <View style={styles.noticeContainer}>
              <IconSymbol
                name="info.circle"
                size={20}
                color={Colors[colorScheme].tint}
              />
              <ThemedText style={styles.noticeText}>
                After changing your email, you'll receive a verification link. Your email won't be updated until you verify it.
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
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  readOnlyInput: {
    borderWidth: 1,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: 16,
    opacity: 0.6,
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
