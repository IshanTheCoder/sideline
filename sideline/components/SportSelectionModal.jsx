import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { SportButtonSelector } from './SportButtonSelector';
import { IconSymbol } from './ui/icon-symbol';

export function SportSelectionModal({
  visible,
  onClose,
  onSelect,
  initialSport = 'Volleyball',
}) {
  const [selectedSport, setSelectedSport] = useState(initialSport);

  const handleConfirm = () => {
    onSelect(selectedSport);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText type="title" style={styles.modalTitle}>
              Select Your Sport
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={22} color="#3B6FA8" />
            </TouchableOpacity>
          </View>

          <ThemedText style={styles.modalDescription}>
            Please select the sport you coach. This helps us provide better insights for your team.
          </ThemedText>

          <SportButtonSelector
            selectedSport={selectedSport}
            onSportChange={setSelectedSport}
          />

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.confirmButtonText}>Confirm</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: '#3B6FA8',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#3B6FA8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
