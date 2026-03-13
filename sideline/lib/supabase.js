import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// grab our Supabase keys from .env — these are basically the password to our entire backend
// Expo auto-injects any EXPO_PUBLIC_* vars at build time, we literally just use them
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.\n' +
    'Required: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// different platforms have different opinions on secure storage — tale as old as time
// mobile gets a legit encrypted vault (SecureStore), web gets localStorage (a glorified notepad)
const storageAdapter = Platform.OS === 'web'
  ? {
      // Web: localStorage — the junk drawer of browser storage, but hey it works
      getItem: async (key) => {
        if (typeof window !== 'undefined') {
          return window.localStorage.getItem(key);
        }
        return null;
      },
      setItem: async (key, value) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
      },
      removeItem: async (key) => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
      },
    }
  : {
      // Mobile: SecureStore = encrypted storage that locks up when the app is backgrounded
      // (no foreground activity = no access), so wrapping everything in try/catch
      // because a random crash would be embarrassing
      getItem: async (key) => {
        try {
          return await SecureStore.getItemAsync(key);
        } catch (error) {
          // SecureStore said "nah"? that's fine, we'll survive
          // Supabase retries automatically so we don't have to stress
          console.log('SecureStore getItem failed (likely background context):', error);
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          await SecureStore.setItemAsync(key, value);
        } catch (error) {
          // save failed? it happens — SecureStore can be dramatic sometimes
          console.log('SecureStore setItem failed (likely background context):', error);
        }
      },
      removeItem: async (key) => {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          // delete failed too? whatever, we tried — not worth losing sleep over
          console.log('SecureStore removeItem failed (likely background context):', error);
        }
      },
    };

// fire up the Supabase client — our single source of truth for everything backend
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // web needs this for catching the OAuth redirect back from Google
    flowType: 'pkce', // PKCE = extra security layer, like two-factor but for the auth flow itself
  },
});

// watch auth state changes on web — handy for debugging login shenanigans
if (Platform.OS === 'web') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 Auth state changed:', event);
    console.log('👤 User:', session?.user?.email || 'No user');
  });
}
