import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ThemedText } from './themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import Svg, { Circle, Path } from 'react-native-svg';

interface SportPickerProps {
  selectedSport: string;
  onSportChange: (sport: string) => void;
}

// Volleyball clipart SVG component
const VolleyballIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    {/* Volleyball pattern - simplified design */}
    <Circle cx="50" cy="50" r="45" fill="#FFFFFF" stroke="#3B6FA8" strokeWidth="2"/>
    {/* Volleyball seams */}
    <Path
      d="M 50 5 Q 30 20, 20 40 Q 15 50, 20 60 Q 30 80, 50 95"
      fill="none"
      stroke="#3B6FA8"
      strokeWidth="2"
    />
    <Path
      d="M 50 5 Q 70 20, 80 40 Q 85 50, 80 60 Q 70 80, 50 95"
      fill="none"
      stroke="#3B6FA8"
      strokeWidth="2"
    />
    <Path
      d="M 5 50 Q 20 30, 40 20 Q 50 15, 60 20 Q 80 30, 95 50"
      fill="none"
      stroke="#3B6FA8"
      strokeWidth="2"
    />
    <Path
      d="M 5 50 Q 20 70, 40 80 Q 50 85, 60 80 Q 80 70, 95 50"
      fill="none"
      stroke="#3B6FA8"
      strokeWidth="2"
    />
  </Svg>
);

export function SportPicker({ selectedSport, onSportChange }: SportPickerProps) {
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
