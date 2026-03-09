import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.OS === 'web' ? {
          backgroundColor: colorScheme === 'dark' ? '#0D0D0D' : '#FAFAFA',
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#2A2A2A' : '#E8E8E8',
        } : undefined,
        tabBarLabelStyle: Platform.OS === 'web' ? { fontSize: 12, fontWeight: '600' } : undefined,
      }}>
      {/* Home tab - Main navigation hub */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      {/* Hidden screens - accessed via hamburger menu */}
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="record-details"
        options={{
          title: 'Record Details',
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="review/index"
        options={{
          title: 'Recordings',
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          title: 'Roster',
          href: null, // Hide from tab bar - access via hamburger menu
        }}
      />
      {/* Explore tab - Temporary demo content (will be replaced with app features) */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
