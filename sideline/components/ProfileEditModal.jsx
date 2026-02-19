import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';

const ROLES = ['Head Coach', 'Assistant Coach', 'Player'];

export default function ProfileEditModal({
  visible,
  onClose,
  userId,
  currentName,
  currentSchool,
  currentRole,
  onSave,
}) {
  const { colorScheme } = useTheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const [name, setName] = useState(currentName || '');
  const [school, setSchool] = useState(currentSchool || '');
  const [role, setRole] = useState(currentRole || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), school: school.trim(), role })
      .eq('id', userId);
    setSaving(false);

    if (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
      return;
    }

    await onSave?.();
    onClose();
  };

  const handleClose = () => {
    setName(currentName || '');
    setSchool(currentSchool || '');
    setRole(currentRole || '');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <ThemedText style={[styles.headerAction, { color: colors.textSecondary }]}>
              Cancel
            </ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.headerTitle}>Edit Profile</ThemedText>

          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <ThemedText style={[styles.headerAction, { color: colors.tint, fontWeight: '700' }]}>
                Save
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Name</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.placeholder}
            autoCorrect={false}
            returnKeyType="next"
          />

          {/* School */}
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>School</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={school}
            onChangeText={setSchool}
            placeholder="e.g. Lincoln High School"
            placeholderTextColor={colors.placeholder}
            autoCorrect={false}
            returnKeyType="done"
          />

          {/* Role */}
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Role</ThemedText>
          <View style={styles.roleRow}>
            {ROLES.map((r) => {
              const selected = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleButton,
                    { borderColor: colors.border, backgroundColor: colors.inputBackground },
                    selected && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => setRole(r)}
                  activeOpacity={0.7}
                >
                  <ThemedText
                    style={[
                      styles.roleText,
                      { color: colors.text },
                      selected && { color: '#fff', fontWeight: '700' },
                    ]}
                  >
                    {r}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    minWidth: 64,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerAction: {
    fontSize: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 60,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 14,
  },
});
