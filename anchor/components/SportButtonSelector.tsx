import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ThemedText } from './themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import Svg, { Circle, Path } from 'react-native-svg';

interface SportButtonSelectorProps {
  selectedSport: string;
  onSportChange: (sport: string) => void;
}

// Realistic volleyball SVG component
const VolleyballIcon = ({ size = 40 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    {/* Volleyball base circle */}
    <Circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#3B6FA8" strokeWidth="1.5"/>
    
    {/* Realistic volleyball panel seams - curved pattern */}
    {/* Top panel seam */}
    <Path
      d="M 50 2 Q 35 15, 25 30 Q 20 40, 20 50 Q 20 60, 25 70 Q 35 85, 50 98"
      fill="none"
      stroke="#3B6FA8"
      strokeWidth="2"
      strokeLinecap="round"
    />
    
    {/* Bottom panel seam */}
    <Path
      d="M 50 2 Q 65 15, 75 30 Q 80 40, 80 50 Q 80 60, 75 70 Q 65 85, 50 98"
      fill="none"
      stroke="#3B6FA8"
      strokeWidth="2"
      strokeLinecap="round"
    />
    
    {/* Left panel seam */}
    <Path
      d="M 2 50 Q 15 35, 30 25 Q 40 20, 50 20 Q 60 20, 70 25 Q 85 35, 98 50"
      fill="none"
      stroke="#3B6FA8"
      strokeWidth="2"
      strokeLinecap="round"
    />
    
    {/* Right panel seam */}
    <Path
      d="M 2 50 Q 15 65, 30 75 Q 40 80, 50 80 Q 60 80, 70 75 Q 85 65, 98 50"
      fill="none"
      stroke="#3B6FA8"
      strokeWidth="2"
      strokeLinecap="round"
    />
    
    {/* Additional panel lines for realism */}
    <Path
      d="M 30 15 Q 40 10, 50 10 Q 60 10, 70 15"
      fill="none"
      stroke="#3B6FA8"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <Path
      d="M 30 85 Q 40 90, 50 90 Q 60 90, 70 85"
      fill="none"
      stroke="#3B6FA8"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <Path
      d="M 15 30 Q 10 40, 10 50 Q 10 60, 15 70"
      fill="none"
      stroke="#3B6FA8"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <Path
      d="M 85 30 Q 90 40, 90 50 Q 90 60, 85 70"
      fill="none"
      stroke="#3B6FA8"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </Svg>
);

export function SportButtonSelector({ selectedSport, onSportChange }: SportButtonSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const sports = [
    { value: 'Volleyball', label: 'Volleyball', icon: VolleyballIcon },
  ];

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>Sport</ThemedText>
      <View style={styles.buttonRow}>
        {sports.map((sport) => {
          const isSelected = selectedSport === sport.value;
          const IconComponent = sport.icon;
          
          return (
            <TouchableOpacity
              key={sport.value}
              style={[
                styles.sportButton,
                {
                  backgroundColor: isSelected ? '#3B6FA8' : colors.background,
                  borderColor: isSelected ? '#3B6FA8' : colors.icon + '40',
                },
              ]}
              onPress={() => onSportChange(sport.value)}
              activeOpacity={0.7}
            >
              <IconComponent size={40} />
              <ThemedText
                style={[
                  styles.sportButtonText,
                  { color: isSelected ? '#FFFFFF' : colors.text },
                ]}
              >
                {sport.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
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
    marginBottom: 12,
    opacity: 0.8,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sportButton: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sportButtonText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
  },
});
