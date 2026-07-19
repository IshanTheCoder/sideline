import ChangeEmailModal from '@/components/ChangeEmailModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import ProfileEditModal from '@/components/ProfileEditModal';
import { SportSelectionModal } from '@/components/SportSelectionModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { showAlert } from '@/lib/alert';

export default function SettingsScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { colorScheme } = useTheme();
  const router = useRouter();
  const [profileImageUri, setProfileImageUri] = useState(
    profile?.profile_picture_url || null
  );
  const [imageError, setImageError] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showSportModal, setShowSportModal] = useState(false);
  const [savingSport, setSavingSport] = useState(false);
  const prevPictureUrl = useRef(profile?.profile_picture_url || null);
  const cacheBusterRef = useRef(Date.now());

  useEffect(() => {
    if (profile?.profile_picture_url) {
      if (profile.profile_picture_url !== prevPictureUrl.current) {
        cacheBusterRef.current = Date.now();
        prevPictureUrl.current = profile.profile_picture_url;
      }
      const separator = profile.profile_picture_url.includes('?') ? '&' : '?';
      setProfileImageUri(profile.profile_picture_url + `${separator}t=${cacheBusterRef.current}`);
      setImageError(false);
    } else {
      setProfileImageUri(null);
      setImageError(false);
    }
  }, [profile?.profile_picture_url]);

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleModalSave = async () => {
    await refreshProfile();
  };

  const handleSportSelect = async (sport) => {
    if (!user) return;

    setSavingSport(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ sport })
        .eq('id', user.id);

      if (error) {
        console.log('Error updating sport:', error);
        showAlert('Error', 'Failed to update sport. Please try again.');
        setSavingSport(false);
        return;
      }

      // pull the latest profile so the UI reflects the new sport
      await refreshProfile();
      setSavingSport(false);
      
      showAlert('Success', `Your sport has been updated to ${sport}!`);
    } catch (error) {
      console.log('Unexpected error updating sport:', error);
      showAlert('Error', 'An unexpected error occurred. Please try again.');
      setSavingSport(false);
    }
  };

  const handleSignOut = async () => {
    const doSignOut = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Sign out error:', error);
        showAlert('Error', 'Failed to sign out. Please try again.');
      }
    };

    showAlert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: doSignOut,
        },
      ]
    );
  };

  const getInitials = () => {
    if (profile?.name) {
      const nameParts = profile.name.trim().split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      }
      return profile.name.substring(0, 2).toUpperCase();
    }
    
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      const parts = emailName.split(/[._-]/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return emailName.substring(0, 2).toUpperCase();
    }
    
    return 'U';
  };

  // volleyball emoji icon — keeps it consistent with SportButtonSelector
  const VolleyballIcon = ({ size = 24 }) => (
    <View style={{ 
      width: size * 1.5, 
      height: size * 1.5, 
      alignItems: 'center', 
      justifyContent: 'center',
      overflow: 'visible',
    }}>
      <ThemedText style={{ 
        fontSize: size, 
        lineHeight: size * 1.1,
        textAlign: 'center',
        width: size * 1.5,
      }}>
        🏐
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {/* top nav bar */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'web' ? 24 : 40 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/home')}
          activeOpacity={0.7}
        >
          <IconSymbol
            name="chevron.left"
            size={28}
            color={Colors[colorScheme ?? 'light'].text}
          />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* user profile card */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Profile</ThemedText>
          
          <View style={styles.profileContainer}>
            <View style={styles.profilePictureContainer}>
              {/* profile pic or initials fallback */}
              <View style={[styles.profilePictureWrapper, {
                borderWidth: 2,
                borderColor: Colors[colorScheme].border,
                borderRadius: 40,
              }]}>
              {profileImageUri && !imageError ? (
                <Image
                  key={profileImageUri}
                  source={{ uri: profileImageUri }}
                  style={styles.profilePicture}
                  cachePolicy="memory-disk"
                  onLoad={() => setImageError(false)}
                  onError={() => setImageError(true)}
                />
              ) : (
                  <View style={[styles.profilePicturePlaceholder, {
                    backgroundColor: Colors[colorScheme].cardBackground,
                  }]}>
                    <ThemedText style={styles.initialsText}>
                      {getInitials()}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* pencil badge to edit your profile */}
              <TouchableOpacity 
                style={[styles.editBadge, {
                  backgroundColor: Colors[colorScheme ?? 'light'].tint,
                }]}
                onPress={handleEditProfile}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.editIcon}>✏️</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              <ThemedText style={styles.profileName}>
                {profile?.name || 'User'}
              </ThemedText>
              <ThemedText style={styles.profileEmail}>
                {user?.email}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* email & password settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Privacy</ThemedText>
          
          <TouchableOpacity 
            style={[styles.settingItem, {
              backgroundColor: Colors[colorScheme].cardBackground,
              borderWidth: 4,
              borderColor: Colors[colorScheme].border,
            }]}
            onPress={() => setShowChangeEmailModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <IconSymbol
                name="envelope"
                size={24}
                color={Colors[colorScheme ?? 'light'].text}
              />
              <View style={styles.settingTextContainer}>
                <ThemedText style={styles.settingTitle}>Email</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  {user?.email}
                </ThemedText>
              </View>
            </View>
            <IconSymbol
              name="chevron.right"
              size={20}
              color={Colors[colorScheme].icon}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, {
              backgroundColor: Colors[colorScheme].cardBackground,
              borderWidth: 4,
              borderColor: Colors[colorScheme].border,
            }]}
            onPress={() => setShowChangePasswordModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <IconSymbol
                name="lock"
                size={24}
                color={Colors[colorScheme ?? 'light'].text}
              />
              <View style={styles.settingTextContainer}>
                <ThemedText style={styles.settingTitle}>Password</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Change your password
                </ThemedText>
              </View>
            </View>
            <IconSymbol
              name="chevron.right"
              size={20}
              color={Colors[colorScheme].icon}
            />
          </TouchableOpacity>
        </View>

        {/* pick your sport */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Sport</ThemedText>
          
          <TouchableOpacity 
            style={[styles.settingItem, {
              backgroundColor: Colors[colorScheme].cardBackground,
              borderWidth: 4,
              borderColor: Colors[colorScheme].border,
            }]}
            onPress={() => setShowSportModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.volleyballIconWrapper}>
                <VolleyballIcon size={40} />
              </View>
              <View style={styles.settingTextContainer}>
                <ThemedText style={styles.settingTitle}>Current Sport</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  {profile?.sport || 'Not set'}
                </ThemedText>
              </View>
            </View>
            <IconSymbol
              name="chevron.right"
              size={20}
              color={Colors[colorScheme].icon}
            />
          </TouchableOpacity>
        </View>

        {/* sign out zone */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Account</ThemedText>
          
          <TouchableOpacity 
            style={[styles.settingItem, styles.signOutButton]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <IconSymbol
                name="rectangle.portrait.and.arrow.right"
                size={24}
                color="#FF3B30"
              />
              <ThemedText style={[styles.settingTitle, styles.signOutText]}>
                Sign Out
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* version number footer */}
        <View style={styles.versionContainer}>
          <ThemedText style={styles.versionText}>
            Sideline v1.0.0
          </ThemedText>
        </View>
      </ScrollView>

      {/* legacy profile edit modal — component was removed */}

      {/* change email modal */}
      {user && (
        <ChangeEmailModal
          visible={showChangeEmailModal}
          onClose={() => setShowChangeEmailModal(false)}
          currentEmail={user.email || ''}
        />
      )}

      {/* change password modal */}
      {user && (
        <ChangePasswordModal
          visible={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
          userEmail={user.email || ''}
        />
      )}

      {/* profile edit modal — name + pic */}
      {user && (
        <ProfileEditModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          userId={user.id}
          currentName={profile?.name || ''}
          currentProfilePicture={profileImageUri}
          onSave={handleModalSave}
          onImageUploaded={(imageUrl) => {
            cacheBusterRef.current = Date.now();
            prevPictureUrl.current = imageUrl;
            const separator = imageUrl.includes('?') ? '&' : '?';
            setProfileImageUri(imageUrl + `${separator}t=${cacheBusterRef.current}`);
            setImageError(false);
          }}
        />
      )}

      {/* sport picker modal */}
      <SportSelectionModal
        visible={showSportModal}
        onClose={() => setShowSportModal(false)}
        onSelect={handleSportSelect}
        initialSport={profile?.sport || 'Volleyball'}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingLeft: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    opacity: 0.9,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingTop: 8,
    paddingLeft: 0,
    paddingRight: 0,
    minHeight: 100,
    width: '100%',
  },
  profilePictureContainer: {
    position: 'relative',
    marginRight: 16,
    marginLeft: 0,
    flexShrink: 0,
    width: 80,
    height: 80,
    overflow: 'visible',
  },
  profilePictureWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profilePicturePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  editBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
  editIcon: {
    fontSize: 18,
  },
  initialsText: {
    fontSize: 32,
    fontWeight: '700',
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 40,
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    opacity: 0.6,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingLeft: 22,
    borderRadius: 12,
    marginBottom: 12,
    minHeight: 64,
    overflow: 'visible',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    overflow: 'visible',
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  volleyballIconWrapper: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 0,
    overflow: 'visible',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    opacity: 0.6,
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  signOutText: {
    color: '#FF3B30',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 12,
    opacity: 0.4,
  },
});
