import { Stack } from 'expo-router';

export const unstable_settings = {
  // Landing straight on /login or /signup (bookmark, emailed link, OAuth
  // bounce) puts Welcome underneath, so the back arrow is never a dead end.
  initialRouteName: 'welcome',
};

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="login" />
      <Stack.Screen name="callback" />
    </Stack>
  );
}
