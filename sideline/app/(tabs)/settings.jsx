import ChangeEmailModal from '@/components/ChangeEmailModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
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
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

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

  // Sync profile picture URI when profile changes
  useEffect(() => {
    console.log('🔄 Profile changed, checking profile picture URL...');
    console.log('📍 Current profile?.profile_picture_url:', profile?.profile_picture_url);
    console.log('📍 Current profileImageUri state:', profileImageUri);
    
    if (profile?.profile_picture_url) {
      // Only update if the URL actually changed to avoid unnecessary re-renders
      const currentUrlWithoutCache = profileImageUri?.split('?')[0];
      const newUrlWithoutCache = profile.profile_picture_url.split('?')[0];
      
      if (currentUrlWithoutCache !== newUrlWithoutCache) {
        // Add cache busting parameter to force reload with expo-image
        // Check if URL already has query parameters
        const separator = profile.profile_picture_url.includes('?') ? '&' : '?';
        const cacheBuster = `${separator}t=${Date.now()}`;
        const newUri = profile.profile_picture_url + cacheBuster;
        console.log('✅ Setting NEW profile image URI:', newUri);
        setProfileImageUri(newUri);
        setImageError(false);
      } else {
        console.log('⚠️ URL unchanged, skipping update');
      }
    } else {
      console.log('⚠️ No profile picture URL, clearing image');
      if (profileImageUri) {
        setProfileImageUri(null);
        setImageError(false);
      }
    }
  }, [profile?.profile_picture_url]);

  const handleEditProfile = () => {
    setShowEditModal(true);
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
        Alert.alert('Error', 'Failed to update sport. Please try again.');
        setSavingSport(false);
        return;
      }

      // Refresh profile to get updated sport
      await refreshProfile();
      setSavingSport(false);
      
      Alert.alert('Success', `Your sport has been updated to ${sport}!`);
    } catch (error) {
      console.log('Unexpected error updating sport:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setSavingSport(false);
    }
  };

  const handleModalSave = async () => {
    console.log('Modal save triggered, refreshing profile...');
    // Refresh profile data after save
    await refreshProfile();
    console.log('Profile refresh completed');
    
    // Force re-check after a short delay to ensure state has propagated
    setTimeout(async () => {
      console.log('Checking profile after delay...');
      console.log('Current profile:', profile);
      console.log('Current profileImageUri:', profileImageUri);
      
      // Force another refresh if the image URI is not set
      if (profile?.profile_picture_url && !profileImageUri) {
        console.log('Image URI not set, forcing update...');
        const separator = profile.profile_picture_url.includes('?') ? '&' : '?';
        const cacheBuster = `${separator}t=${Date.now()}`;
        setProfileImageUri(profile.profile_picture_url + cacheBuster);
        setImageError(false);
      }
    }, 500);
  };

  const handleSignOut = async () => {
    const doSignOut = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Sign out error:', error);
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      await doSignOut();
      return;
    }

    Alert.alert(
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

  // Volleyball icon using emoji - matches SportButtonSelector implementation
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
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
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
        {/* Profile Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Profile</ThemedText>
          
          <View style={styles.profileContainer}>
            <View style={styles.profilePictureContainer}>
              {/* Profile Picture / Camera Icon */}
              <View style={styles.profilePictureWrapper}>
              {profileImageUri && !imageError ? (
                <Image
                  key={profileImageUri}
                  source={{ uri: profileImageUri }}
                  style={styles.profilePicture}
                  onLoadStart={() => {
                    console.log('🔄 Starting to load profile picture (React Native Image)...');
                    console.log('📍 URI:', profileImageUri);
                  }}
                  onLoad={() => {
                    console.log('✅ Profile picture loaded successfully!');
                    console.log('📍 Loaded URI:', profileImageUri);
                    setImageError(false);
                  }}
                  onError={(event) => {
                    console.log('❌ React Native Image failed, error:', event.nativeEvent.error);
                    console.log('📍 Image URI:', profileImageUri);
                    console.log('🧪 Testing URL accessibility...');
                    
                    // Test if URL is accessible
                    fetch(profileImageUri.split('?')[0], { method: 'HEAD' })
                      .then(response => {
                        console.log('📡 URL test response status:', response.status);
                        console.log('📡 Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
                        if (response.ok) {
                          console.log('✅ URL is accessible via fetch');
                        } else {
                          console.log('❌ URL returned error status:', response.status);
                        }
                      })
                      .catch(err => {
                        console.log('❌ Failed to test URL:', err);
                      });
                    
                    setImageError(true);
                  }}
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

              {/* Edit Badge - Opens modal */}
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

        {/* Privacy Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Privacy</ThemedText>
          
          <TouchableOpacity 
            style={[styles.settingItem, {
              backgroundColor: Colors[colorScheme].cardBackground,
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

        {/* Sport Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Sport</ThemedText>
          
          <TouchableOpacity 
            style={[styles.settingItem, {
              backgroundColor: Colors[colorScheme].cardBackground,
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

        {/* Account Section */}
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

        {/* App Version */}
        <View style={styles.versionContainer}>
          <ThemedText style={styles.versionText}>
            Sideline v1.0.0
          </ThemedText>
        </View>
      </ScrollView>

      {/* Profile Edit Modal */}
      {user && (
        <ProfileEditModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          userId={user.id}
          currentName={profile?.name || ''}
          currentProfilePicture={profileImageUri}
          onSave={handleModalSave}
          onImageUploaded={(imageUrl) => {
            // Immediately update the image URI when uploaded
            console.log('📥 Received new image URL from modal:', imageUrl);
            const separator = imageUrl.includes('?') ? '&' : '?';
            const cacheBuster = `${separator}t=${Date.now()}`;
            setProfileImageUri(imageUrl + cacheBuster);
            setImageError(false);
          }}
        />
      )}

      {/* Change Email Modal */}
      {user && (
        <ChangeEmailModal
          visible={showChangeEmailModal}
          onClose={() => setShowChangeEmailModal(false)}
          currentEmail={user.email || ''}
        />
      )}

      {/* Change Password Modal */}
      {user && (
        <ChangePasswordModal
          visible={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
          userEmail={user.email || ''}
        />
      )}

      {/* Sport Selection Modal */}
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
