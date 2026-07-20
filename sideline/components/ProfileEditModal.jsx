/**
 * ProfileEditModal — redesign: brand-styled bottom sheet (was an old-theme
 * full-width modal). Tap the avatar to pick + upload a profile picture,
 * edit the display name, save. Upload/save logic unchanged; only the shell
 * and styles moved to the shared BottomSheet + Brand tokens.
 */
import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheet from '@/components/BottomSheet';
import { Brand } from '@/constants/brand';
import { showAlert } from '@/lib/alert';
import { uploadProfilePicture } from '@/lib/profilePicture';
import { supabase } from '@/lib/supabase';

export default function ProfileEditModal({
  visible,
  onClose,
  userId,
  currentName,
  currentProfilePicture,
  onSave,
  onImageUploaded,
}) {
  const [name, setName] = useState(currentName);
  const [profileImageUri, setProfileImageUri] = useState(currentProfilePicture || null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Sync with parent's currentProfilePicture when it changes or modal opens
  React.useEffect(() => {
    if (visible) {
      setName(currentName);
      setProfileImageUri(currentProfilePicture || null);
      setImageError(false);
    }
  }, [visible, currentName, currentProfilePicture]);

  const getInitials = () => {
    if (name) {
      const nameParts = name.trim().split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const pickImage = async () => {
    try {
      const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      let finalStatus = currentStatus;

      if (currentStatus !== 'granted') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        showAlert(
          'Photo Access Needed',
          'Sideline needs access to your camera roll to set your profile picture.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: async () => {
                if (Platform.OS === 'ios') {
                  try {
                    await Linking.openURL('app-settings:');
                  } catch (error) {
                    console.log('Could not open settings:', error);
                    showAlert(
                      'Cannot Open Settings',
                      'Please go to Settings > Sideline > Photos to enable access.'
                    );
                  }
                }
              },
            },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        ...(Platform.OS === 'ios' && {
          allowsMultipleSelection: false,
        }),
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setUploadingImage(true);
        setImageError(false);

        const uriParts = asset.uri.split('.');
        let fileExtension = uriParts[uriParts.length - 1].toLowerCase();
        if (fileExtension === 'jpeg') {
          fileExtension = 'jpg';
        }

        const mimeType = fileExtension === 'jpg' ? 'image/jpeg' : `image/${fileExtension}`;

        const { url, error } = await uploadProfilePicture(
          userId,
          {
            uri: asset.uri,
            type: mimeType,
            name: `profile.${fileExtension}`,
          },
          fileExtension
        );

        if (error) {
          showAlert('Upload Failed', 'Failed to upload profile picture. Please try again.');
          console.log('❌ Upload error:', error);
          setUploadingImage(false);
        } else if (url) {
          // Update local state immediately for preview
          const separator = url.includes('?') ? '&' : '?';
          setProfileImageUri(`${url}${separator}t=${Date.now()}`);
          setImageError(false);
          setUploadingImage(false);

          // Immediately notify parent component of the new image URL
          if (onImageUploaded) {
            onImageUploaded(url);
          }

          // Wait a moment for database to commit, then refresh profile
          await new Promise((resolve) => setTimeout(resolve, 500));
          await onSave();
        } else {
          showAlert('Error', 'Upload succeeded but no URL was returned. Please try again.');
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.log('Error picking image:', error);
      showAlert('Error', 'Failed to pick image. Please try again.');
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Error', 'Please enter your name');
      return;
    }
    if (uploadingImage) {
      showAlert('Please wait', 'Image is still uploading...');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', userId);

      if (error) {
        console.log('Error updating profile:', error);
        showAlert('Error', 'Failed to update profile. Please try again.');
        setSaving(false);
        return;
      }

      setSaving(false);
      await onSave();
      onClose();
    } catch (error) {
      console.log('Unexpected error updating profile:', error);
      showAlert('Error', 'An unexpected error occurred. Please try again.');
      setSaving(false);
    }
  };

  const handleClose = () => {
    // Reset to original values
    setName(currentName);
    setProfileImageUri(currentProfilePicture || null);
    setImageError(false);
    // Refresh profile one more time before closing so parent has latest data
    onSave().then(() => {
      onClose();
    });
  };

  const canSave = name?.trim()?.length > 0 && !saving && !uploadingImage;

  return (
    <BottomSheet visible={visible} onClose={handleClose} maxHeightPct={0.86}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Edit profile</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
          <X size={13} color={Brand.chip} strokeWidth={2.6} />
        </TouchableOpacity>
      </View>

      {/* avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={pickImage}
          disabled={uploadingImage || saving}
          activeOpacity={0.8}
        >
          {profileImageUri && !imageError ? (
            <Image
              key={profileImageUri}
              source={{ uri: profileImageUri }}
              style={styles.avatarImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{getInitials()}</Text>
            </View>
          )}
          {uploadingImage ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          ) : (
            <View style={styles.cameraBadge}>
              <Camera size={14} color="#fff" strokeWidth={2.2} />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to change your photo</Text>
      </View>

      <Text style={styles.fieldLabel}>NAME</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={Brand.faint}
        style={styles.input}
        editable={!saving}
        autoCapitalize="words"
        maxLength={50}
      />

      <TouchableOpacity
        style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!canSave}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save profile</Text>
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
  avatarSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarWrap: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  avatarImage: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  avatarPlaceholder: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '800',
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 54,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Brand.green,
    borderWidth: 2.5,
    borderColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontSize: 13,
    color: Brand.muted,
    marginTop: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Brand.muted,
    marginTop: 20,
    marginBottom: 8,
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
  saveBtn: {
    marginTop: 22,
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
