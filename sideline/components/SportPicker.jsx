import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ThemedText } from './themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

// Volleyball icon using emoji
const VolleyballIcon = ({ size = 24 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <ThemedText style={{ fontSize: size, lineHeight: size }}>
      🏐
    </ThemedText>
  </View>
);

export function SportPicker({ selectedSport, onSportChange }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>Sport</ThemedText>
      <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.icon + '40' }]}>
        <View style={styles.iconContainer}>
          <VolleyballIcon size={24} />
        </View>
        <Picker
          selectedValue={selectedSport}
          onValueChange={onSportChange}
          style={[styles.picker, { color: colors.text }]}
          dropdownIconColor="#3B6FA8"
        >
          <Picker.Item 
            label="Volleyball" 
            value="Volleyball" 
          />
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: {
    flex: 1,
    color: '#000000',
  },
});
