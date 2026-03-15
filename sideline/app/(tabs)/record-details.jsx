import { useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, TextInput, Modal, Platform, ActivityIndicator } from 'react-native';
import { showAlert } from '@/lib/alert';

const DateTimePicker = Platform.OS !== 'web'
  ? require('@react-native-community/datetimepicker').default
  : null;
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSession } from '@/contexts/ActiveSessionContext';
import { createGameSession } from '@/lib/gameSessions';

export default function RecordDetailsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { setActiveSession } = useActiveSession();
  const iconColor = useThemeColor({}, 'icon');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const errorColor = useThemeColor({}, 'error');

  const [opponent, setOpponent] = useState('');
  const [gameDate, setGameDate] = useState(new Date());
  const [pendingDate, setPendingDate] = useState(new Date());
  const [matchType, setMatchType] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef(null);
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const matchTypes = ['Preseason', 'Regular Season', 'Post Season', 'Scrimmage', 'Practice'];

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const openDatePicker = () => {
    if (Platform.OS === 'web') {
      dateInputRef.current?.click();
      return;
    }
    setPendingDate(gameDate);
    setShowDatePicker(true);
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const handleStartRecording = async () => {
    const trimmedOpponent = opponent.trim();
    if (!trimmedOpponent) {
      setFormError('Opponent name is required.');
      return;
    }
    if (!matchType) {
      setFormError('Please select a match type.');
      return;
    }
    if (!user?.id) {
      showAlert('Sign in required', 'Please sign in to start recording.');
      return;
    }

    setFormError(null);
    setIsSaving(true);
    const { id, error } = await createGameSession({
      userId: user.id,
      opponentName: trimmedOpponent,
      date: gameDate,
    });

    if (error || !id) {
      setIsSaving(false);
      showAlert(
        'Could not create session',
        error?.message ?? 'Please try again.'
      );
      return;
    }

    setActiveSession({
      id,
      opponentName: trimmedOpponent,
      date: gameDate,
      matchType,
      startedAt: new Date(),
    });
    setIsSaving(false);
    router.push('/(tabs)/record');
  };

  const handleCancel = () => {
    if (opponent || matchType) {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm('Discard game details? Your inputs will be cleared.');
        if (confirmed) router.back();
        return;
      }
      showAlert('Discard game details?', 'Your inputs will be cleared.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
      return;
    }
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleCancel}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="chevron-left" size={32} color={iconColor} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Game Details</ThemedText>
        <View style={styles.navButton} />
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Opponent</ThemedText>
        <TextInput
          value={opponent}
          onChangeText={setOpponent}
          placeholder="e.g., Lincoln High School"
          autoCapitalize="words"
          style={[
            styles.textInput,
            { color: textColor, backgroundColor: inputBackground, borderColor },
          ]}
          placeholderTextColor={placeholderColor}
        />
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Game date</ThemedText>
        <TouchableOpacity
          style={[styles.dateButton, { borderColor, backgroundColor: inputBackground }]}
          onPress={openDatePicker}
        >
          <ThemedText style={styles.dateButtonText}>{formatDate(gameDate)}</ThemedText>
        </TouchableOpacity>
        {Platform.OS === 'web' && (
          <input
            ref={dateInputRef}
            type="date"
            style={{ display: 'none' }}
            value={gameDate.toISOString().split('T')[0]}
            onChange={(e) => {
              if (e.target.value) setGameDate(new Date(e.target.value + 'T00:00:00'));
            }}
          />
        )}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={gameDate}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setGameDate(selectedDate);
              }
            }}
          />
        )}
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Match type</ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: textSecondary }]}>
          Choose one option to label the session.
        </ThemedText>
        <View style={styles.matchTypeContainer}>
          {matchTypes.map((type) => {
            const isSelected = matchType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.matchTypeButton,
                  { borderColor },
                  isSelected && { backgroundColor: tintColor, borderColor: tintColor },
                ]}
                onPress={() => setMatchType(type)}
              >
                <ThemedText style={[styles.matchTypeText, isSelected && styles.matchTypeTextActive]}>
                  {type}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {formError && (
        <View style={[styles.errorContainer, { borderColor: errorColor }]}>
          <ThemedText style={[styles.errorText, { color: errorColor }]}>{formError}</ThemedText>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: tintColor }]}
          onPress={handleStartRecording}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.startButtonText}>Start Recording</ThemedText>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={showDatePicker && Platform.OS === 'ios' && Platform.OS !== 'web'} transparent animationType="fade">
        <View style={styles.dateModalBackdrop}>
          <View style={[styles.dateModalCard, { backgroundColor: inputBackground }]}>
            <ThemedText style={styles.dateModalTitle}>Select date</ThemedText>
            <DateTimePicker
              value={pendingDate}
              mode="date"
              display="spinner"
              onChange={(_, selectedDate) => {
                if (selectedDate) {
                  setPendingDate(selectedDate);
                }
              }}
            />
            <View style={styles.dateModalActions}>
              <TouchableOpacity style={styles.dateModalButton} onPress={closeDatePicker}>
                <ThemedText style={styles.dateModalButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateModalButton, { backgroundColor: tintColor }]}
                onPress={() => {
                  setGameDate(pendingDate);
                  closeDatePicker();
                }}
              >
                <ThemedText style={styles.dateModalButtonTextActive}>Done</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 16,
  },
  matchTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  matchTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  matchTypeText: {
    fontSize: 13,
  },
  matchTypeTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  startButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  dateModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModalCard: {
    width: '90%',
    borderRadius: 16,
    padding: 16,
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  dateModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  dateModalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
  },
  dateModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateModalButtonTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
