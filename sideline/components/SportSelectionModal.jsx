/**
 * SportSelectionModal — redesign: brand-styled bottom sheet shown after
 * Google sign-up to pick the coached sport (volleyball for now). Was an
 * old-theme modal with a blue confirm button; behavior unchanged.
 */
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomSheet from '@/components/BottomSheet';
import { Brand } from '@/constants/brand';

const SPORTS = ['Volleyball'];

export function SportSelectionModal({ visible, onClose, onSelect, initialSport = 'Volleyball' }) {
  const [selectedSport, setSelectedSport] = useState(initialSport);

  const handleConfirm = () => {
    onSelect(selectedSport);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPct={0.6}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Select your sport</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <X size={13} color={Brand.chip} strokeWidth={2.6} />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        Pick the sport you coach — it shapes the vocabulary Sideline listens for.
      </Text>

      <View style={styles.chipRow}>
        {SPORTS.map((s) => {
          const sel = selectedSport === s;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.chip, sel && styles.chipActive]}
              onPress={() => setSelectedSport(s)}
              activeOpacity={0.8}
            >
              <Text style={styles.chipEmoji}>🏐</Text>
              <Text style={[styles.chipText, sel && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
        <Text style={styles.confirmBtnText}>Confirm</Text>
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
  description: {
    fontSize: 13.5,
    color: Brand.muted,
    lineHeight: 20,
    marginTop: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  chip: {
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
  chipActive: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.ink,
  },
  chipTextActive: {
    color: '#fff',
  },
  confirmBtn: {
    marginTop: 22,
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
