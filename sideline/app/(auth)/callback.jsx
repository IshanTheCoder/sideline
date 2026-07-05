import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { GOOGLE_SHEETS_FLOW_KEY, GOOGLE_SHEETS_PENDING_TOKEN_KEY } from '@/lib/googleSheets';

export default function CallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      console.log('🔄 Callback handler started');
      console.log('📱 Platform:', Platform.OS);

      if (Platform.OS === 'web') {
        console.log('⏳ Waiting for Supabase to process OAuth callback...');

        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const oauthError = urlParams.get('error');
          const oauthErrorDescription = urlParams.get('error_description');

          if (oauthError) {
            console.error('OAuth error:', oauthError, oauthErrorDescription);
            router.replace({
              pathname: '/(auth)/login',
              params: { error: oauthErrorDescription || oauthError },
            });
            return;
          }

          const hasCode = urlParams.has('code'); // PKCE flow
          const hasHash = !!window.location.hash;  // implicit flow

          if (hasCode || hasHash) {
            console.log('🔍 Auth data detected — code:', hasCode, 'hash:', hasHash);

            // Poll for session — Supabase processes the code/hash asynchronously
            let session = null;
            for (let i = 0; i < 20; i++) {
              await new Promise(resolve => setTimeout(resolve, 500));
              const { data } = await supabase.auth.getSession();
              if (data?.session) {
                session = data.session;
                break;
              }
            }

            if (session) {
              console.log('✅ Session established for user:', session.user.email);
              router.replace('/(tabs)/home');
              return;
            } else {
              console.error('❌ No session after OAuth callback');
              router.replace({
                pathname: '/(auth)/login',
                params: { error: 'Failed to establish session' },
              });
              return;
            }
          }

          // No auth data — redirect to login
          console.log('ℹ️ No OAuth data found, redirecting to login');
          router.replace('/(auth)/login');
        }
      } else {
        // Native: Check query parameters
        console.log('📦 Checking URL params for native...');
        const accessToken = params.access_token;
        const refreshToken = params.refresh_token;
        const error = params.error;
        const errorDescription = params.error_description;

        if (error) {
          console.error('OAuth error:', error, errorDescription);
          router.replace({
            pathname: '/(auth)/login',
            params: { error: errorDescription || error },
          });
          return;
        }

        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            router.replace({
              pathname: '/(auth)/login',
              params: { error: 'Failed to establish session' },
            });
            return;
          }

          const isSheetsFlow = await AsyncStorage.getItem(GOOGLE_SHEETS_FLOW_KEY);
          if (isSheetsFlow === '1') {
            await AsyncStorage.removeItem(GOOGLE_SHEETS_FLOW_KEY);
            const { data: { session } } = await supabase.auth.getSession();
            const providerToken =
              session?.provider_token ?? session?.user?.user_metadata?.provider_token;
            if (providerToken) {
              await AsyncStorage.setItem(GOOGLE_SHEETS_PENDING_TOKEN_KEY, providerToken);
              router.replace('/(tabs)/roster?sheets_ready=1');
              return;
            }
          }

          console.log('✅ Session established for user:', data?.user?.email);
          router.replace('/(tabs)/home');
        } else {
          console.error('❌ No tokens found in callback');
          router.replace({
            pathname: '/(auth)/login',
            params: { error: 'Authentication failed - no tokens received' },
          });
        }
      }
    } catch (error) {
      console.error('💥 Callback error:', error);
      router.replace({
        pathname: '/(auth)/login',
        params: { error: error.message || 'An unexpected error occurred' },
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color="#3B6FA8" />
      <ThemedText style={styles.text}>Completing sign in...</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
});
