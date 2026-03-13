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
        tabBarShowLabel: false,
        tabBarStyle: Platform.OS === 'web' ? {
          backgroundColor: colorScheme === 'dark' ? '#0D0D0D' : '#FAFAFA',
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#2A2A2A' : '#E8E8E8',
        } : undefined,
      }}>
      {/* home sweet home — the main landing tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      {/* hidden screens — reach these from the hamburger menu, not the tab bar */}
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          href: null, // not shown in the tab bar
        }}
      />
      <Tabs.Screen
        name="record-details"
        options={{
          title: 'Record Details',
          href: null, // not shown in the tab bar
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Recordings',
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          href: null, // not shown in the tab bar
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          title: 'Roster',
          href: null, // tucked away — get here through the hamburger menu
        }}
      />
      {/* explore tab — placeholder demo stuff, will swap in real features later */}
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
