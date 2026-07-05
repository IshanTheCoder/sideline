// App entry point (/app) — the stable "open the web app" URL now that the
// marketing site owns /. Sends signed-in users to the home tab and everyone
// else to the welcome screen. All marketing CTAs point here.
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AppEntry() {
  const { user, loading } = useAuth();

  // Root layout shows its loading screen while auth state resolves
  if (loading) return null;

  return <Redirect href={user ? '/(tabs)/home' : '/(auth)/welcome'} />;
}
