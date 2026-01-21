import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Get environment variables from .env file
// Expo automatically loads EXPO_PUBLIC_* variables from .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.\n' +
    'Required: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Platform-specific storage adapter
// Use SecureStore for mobile (iOS/Android) and localStorage for web
const storageAdapter = Platform.OS === 'web'
  ? {
      // Web: Use localStorage
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
      // Mobile: Use SecureStore with error handling
      // SecureStore can fail in background contexts (e.g., during auto-refresh)
      // when user interaction is not allowed, so we handle this gracefully
      getItem: async (key) => {
        try {
          return await SecureStore.getItemAsync(key);
        } catch (error) {
          // Silently fail if SecureStore is unavailable (e.g., background refresh)
          // Supabase will handle this gracefully and retry later
          console.log('SecureStore getItem failed (likely background context):', error);
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          await SecureStore.setItemAsync(key, value);
        } catch (error) {
          // Silently fail if SecureStore is unavailable
          console.log('SecureStore setItem failed (likely background context):', error);
        }
      },
      removeItem: async (key) => {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          // Silently fail if SecureStore is unavailable
          console.log('SecureStore removeItem failed (likely background context):', error);
        }
      },
    };

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Enable for web to detect OAuth callbacks
    flowType: 'pkce', // Use PKCE flow for better security
  },
});

// Log when session changes
if (Platform.OS === 'web') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 Auth state changed:', event);
    console.log('👤 User:', session?.user?.email || 'No user');
  });
}
