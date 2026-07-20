/**
 * App shell — the redesign has no tab bar: Home is the hub and every screen
 * is reached through its header icon buttons (Schedule / Roster / Settings)
 * or in-app cards. The Tabs navigator stays only for routing/state, with the
 * bar itself hidden.
 */
import { Tabs } from 'expo-router';
import React from 'react';

export const unstable_settings = {
  initialRouteName: 'app',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      {/* home — the main landing screen (lives at /app; / belongs to the marketing site) */}
      <Tabs.Screen name="app" options={{ title: 'Home' }} />
      <Tabs.Screen name="record" options={{ title: 'Record' }} />
      <Tabs.Screen name="review" options={{ title: 'Recordings' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      <Tabs.Screen name="roster" options={{ title: 'Roster' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
    </Tabs>
  );
}
