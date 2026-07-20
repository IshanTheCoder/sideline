/**
 * Settings — redesign: profile card (tap to edit), MY TEAMS with real
 * multi-team switching (tap a team to make it active; add new teams via a
 * small sheet), an active-team section (Sport + Roster), ACCOUNT rows using
 * the existing email/password modals, and Sign out.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheet from '@/components/BottomSheet';
import ChangeEmailModal from '@/components/ChangeEmailModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import ProfileEditModal from '@/components/ProfileEditModal';
import { Brand, Shape } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert } from '@/lib/alert';
import { fetchPlayersForTeam } from '@/lib/roster';
import { initialsFor } from '@/lib/scheduleFormat';
import { createTeam, getActiveTeam, setActiveTeamId, updateTeam } from '@/lib/teams';

const SPORTS = ['Volleyball'];

export default function SettingsScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const router = useRouter();

  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [rosterCount, setRosterCount] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);
  // edit-team sheet
  const [editTeam, setEditTeam] = useState(null); // the team being edited, or null
  const [editName, setEditName] = useState('');
  const [editSport, setEditSport] = useState('Volleyball');
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { team, teams: all } = await getActiveTeam(user.id);
    setTeams(all);
    setActiveTeam(team);
    if (team?.id) {
      const { data } = await fetchPlayersForTeam(team.id);
      setRosterCount((data ?? []).length);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pickTeam = async (team) => {
    if (!user?.id || team.id === activeTeam?.id) return;
    await setActiveTeamId(user.id, team.id);
    setActiveTeam(team);
    const { data } = await fetchPlayersForTeam(team.id);
    setRosterCount((data ?? []).length);
  };

  const addTeam = async () => {
    if (!user?.id || !newTeamName.trim() || savingTeam) return;
    setSavingTeam(true);
    try {
      const { team, error } = await createTeam(user.id, { name: newTeamName.trim() });
      if (error || !team) {
        showAlert('Could not add team', error?.message ?? 'Try again.');
        return;
      }
      await setActiveTeamId(user.id, team.id);
      setAddTeamOpen(false);
      setNewTeamName('');
      load();
    } finally {
      setSavingTeam(false);
    }
  };

  const openEditTeam = (team) => {
    setEditTeam(team);
    setEditName(team.name ?? '');
    setEditSport(
      team.sport ? team.sport.charAt(0).toUpperCase() + team.sport.slice(1) : 'Volleyball'
    );
  };

  const saveEditTeam = async () => {
    if (!user?.id || !editTeam || !editName.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const { team, error } = await updateTeam(user.id, editTeam.id, {
        name: editName.trim(),
        sport: editSport,
      });
      if (error || !team) {
        showAlert('Could not update team', error?.message ?? 'Try again.');
        return;
      }
      setEditTeam(null);
      load();
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSignOut = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            console.error('Sign out error:', error);
            showAlert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const getInitials = () => {
    if (profile?.name) {
      const parts = profile.name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      return profile.name.substring(0, 2).toUpperCase();
    }
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return 'U';
  };

  const teamSeason = (team) => {
    const year = team?.created_at ? new Date(team.created_at).getFullYear() : new Date().getFullYear();
    const sport = team?.sport
      ? team.sport.charAt(0).toUpperCase() + team.sport.slice(1)
      : 'Volleyball';
    return `${sport} · ${year} season`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/app'))}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color={Brand.ink} strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* profile card — tap to edit name / photo */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => setShowEditModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{getInitials()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name || 'Coach'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </TouchableOpacity>

        {/* my teams */}
        <Text style={styles.eyebrow}>MY TEAMS</Text>
        <View style={styles.card}>
          {teams.map((t) => {
            const sel = t.id === activeTeam?.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.teamRow, styles.rowBorder]}
                onPress={() => pickTeam(t)}
                activeOpacity={0.75}
              >
                <View style={[styles.teamBadge, sel && styles.teamBadgeActive]}>
                  <Text style={[styles.teamBadgeText, sel && styles.teamBadgeTextActive]}>
                    {initialsFor(t.name)}
                  </Text>
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName} numberOfLines={1}>{t.name}</Text>
                  <Text style={styles.teamMeta}>{teamSeason(t)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.teamEditBtn}
                  onPress={() => openEditTeam(t)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Pencil size={15} color={Brand.muted} strokeWidth={2} />
                </TouchableOpacity>
                {sel ? (
                  <View style={styles.teamCheck}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </View>
                ) : (
                  <View style={styles.teamRing} />
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.teamRow}
            onPress={() => setAddTeamOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.addTeamBadge}>
              <Plus size={18} color={Brand.green} strokeWidth={2.4} />
            </View>
            <Text style={styles.addTeamText}>Add a team</Text>
          </TouchableOpacity>
        </View>

        {/* active team */}
        {activeTeam && (
          <>
            <Text style={styles.eyebrow}>{activeTeam.name.toUpperCase()}</Text>
            <View style={styles.card}>
              <View style={[styles.settingRow, styles.rowBorder]}>
                <Text style={styles.settingLabel}>Sport</Text>
                <Text style={styles.settingValue}>
                  {activeTeam.sport
                    ? activeTeam.sport.charAt(0).toUpperCase() + activeTeam.sport.slice(1)
                    : 'Volleyball'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => router.push('/(tabs)/roster')}
                activeOpacity={0.75}
              >
                <Text style={styles.settingLabel}>Roster</Text>
                <Text style={styles.settingValue}>
                  {rosterCount == null ? '—' : `${rosterCount} player${rosterCount === 1 ? '' : 's'}`}
                </Text>
                <ChevronRight size={14} color={Brand.chevron} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* account */}
        <Text style={styles.eyebrow}>ACCOUNT</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.settingRow, styles.rowBorder]}
            onPress={() => setShowChangeEmailModal(true)}
            activeOpacity={0.75}
          >
            <Text style={styles.settingLabel}>Change email</Text>
            <Text style={styles.settingValue} numberOfLines={1}>
              {user?.email}
            </Text>
            <ChevronRight size={14} color={Brand.chevron} strokeWidth={2.4} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowChangePasswordModal(true)}
            activeOpacity={0.75}
          >
            <Text style={styles.settingLabel}>Change password</Text>
            <ChevronRight size={14} color={Brand.chevron} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* add team sheet */}
      <BottomSheet visible={addTeamOpen} onClose={() => setAddTeamOpen(false)} maxHeightPct={0.5}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Add a team</Text>
          <TouchableOpacity
            style={styles.sheetClose}
            onPress={() => setAddTeamOpen(false)}
            activeOpacity={0.7}
          >
            <X size={13} color={Brand.chip} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>
        <Text style={styles.fieldLabel}>TEAM NAME</Text>
        <TextInput
          value={newTeamName}
          onChangeText={setNewTeamName}
          placeholder="e.g. Jersey Elite 17U Club"
          placeholderTextColor={Brand.faint}
          style={styles.input}
        />
        <TouchableOpacity
          style={[styles.saveBtn, (!newTeamName.trim() || savingTeam) && styles.saveBtnDisabled]}
          onPress={addTeam}
          disabled={!newTeamName.trim() || savingTeam}
          activeOpacity={0.85}
        >
          {savingTeam ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {newTeamName.trim() ? `Add ${newTeamName.trim()}` : 'Add team'}
            </Text>
          )}
        </TouchableOpacity>
      </BottomSheet>

      {/* edit team sheet */}
      <BottomSheet visible={!!editTeam} onClose={() => setEditTeam(null)} maxHeightPct={0.6}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Edit team</Text>
          <TouchableOpacity
            style={styles.sheetClose}
            onPress={() => setEditTeam(null)}
            activeOpacity={0.7}
          >
            <X size={13} color={Brand.chip} strokeWidth={2.6} />
          </TouchableOpacity>
        </View>
        <Text style={styles.fieldLabel}>TEAM NAME</Text>
        <TextInput
          value={editName}
          onChangeText={setEditName}
          placeholder="e.g. Varsity Volleyball 2025"
          placeholderTextColor={Brand.faint}
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>SPORT</Text>
        <View style={styles.sportRow}>
          {SPORTS.map((s) => {
            const sel = editSport === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.sportChip, sel && styles.sportChipActive]}
                onPress={() => setEditSport(s)}
                activeOpacity={0.8}
              >
                <Text style={styles.sportEmoji}>🏐</Text>
                <Text style={[styles.sportChipText, sel && styles.sportChipTextActive]}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, (!editName.trim() || savingEdit) && styles.saveBtnDisabled]}
          onPress={saveEditTeam}
          disabled={!editName.trim() || savingEdit}
          activeOpacity={0.85}
        >
          {savingEdit ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save changes</Text>
          )}
        </TouchableOpacity>
      </BottomSheet>

      {/* existing account modals */}
      {user && (
        <ChangeEmailModal
          visible={showChangeEmailModal}
          onClose={() => setShowChangeEmailModal(false)}
          currentEmail={user.email || ''}
        />
      )}
      {user && (
        <ChangePasswordModal
          visible={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
          userEmail={user.email || ''}
        />
      )}
      {user && (
        <ProfileEditModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          userId={user.id}
          currentName={profile?.name || ''}
          currentProfilePicture={profile?.profile_picture_url || null}
          onSave={async () => {
            await refreshProfile();
          }}
          onImageUploaded={() => {}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 66,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Brand.ink,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    padding: 16,
    marginTop: 18,
    ...Shape.cardShadow,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.ink,
  },
  profileEmail: {
    fontSize: 13,
    color: Brand.muted,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Brand.muted,
    marginTop: 22,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    overflow: 'hidden',
    ...Shape.cardShadow,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Brand.hairline,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  teamBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Brand.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamBadgeActive: {
    backgroundColor: Brand.green,
  },
  teamBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.green,
  },
  teamBadgeTextActive: {
    color: '#fff',
  },
  teamInfo: {
    flex: 1,
    minWidth: 0,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.ink,
  },
  teamMeta: {
    fontSize: 12.5,
    color: Brand.muted,
  },
  teamEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  teamCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    borderColor: Brand.borderBtn,
  },
  addTeamBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Brand.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTeamText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Brand.green,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Brand.ink,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Brand.muted,
    maxWidth: 190,
  },
  signOutBtn: {
    marginTop: 16,
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shape.cardShadow,
  },
  signOutText: {
    color: Brand.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Brand.ink,
  },
  sheetClose: {
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
  sportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    borderColor: Brand.border2,
    backgroundColor: Brand.card,
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
    color: Brand.ink,
  },
  sportChipTextActive: {
    color: '#fff',
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
