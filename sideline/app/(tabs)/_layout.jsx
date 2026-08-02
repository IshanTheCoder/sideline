/**
 * App shell — the redesign has no tab bar: Home is the hub and every screen
 * is reached through its header icon buttons (Schedule / Roster / Settings)
 * or in-app cards.
 *
 * This is a Stack, not a Tabs navigator, and that matters for back navigation.
 * A Tabs navigator keeps each tab's state alive across switches, so pushing
 * two different games (Home -> game A -> Home -> game B) stacked them both
 * inside the same tab and "back" popped to game A instead of Home. A Stack
 * gives the linear "back returns to the screen you came from" history the
 * header back arrow (and the browser back button on web) both expect.
 */
import { Stack } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

export const unstable_settings = {
  // Deep links land with Home underneath, so back always has somewhere to go.
  initialRouteName: 'app',
};

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Instant transitions on web keep the browser back button feeling
        // native; native platforms keep their normal push animation.
        animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
      }}
    >
      {/* Titles drive the browser tab title on web — the header itself stays hidden. */}
      <Stack.Screen name="app" options={{ title: 'Home' }} />
      <Stack.Screen name="record" options={{ title: 'Record' }} />
      <Stack.Screen name="review/index" options={{ title: 'Games' }} />
      <Stack.Screen name="review/game/[id]" options={{ title: 'Game' }} />
      <Stack.Screen name="review/game/summary/[id]" options={{ title: 'Game Analysis' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="roster" options={{ title: 'Roster' }} />
      <Stack.Screen name="schedule" options={{ title: 'Schedule' }} />
    </Stack>
  );
}
