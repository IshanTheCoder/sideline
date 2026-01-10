import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'anchor',
  path: 'auth/callback',
});

export async function signInWithGoogle() {
  try {
    // Get the Supabase URL from environment
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Missing Supabase URL');
    }

    // Create the OAuth URL
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
      },
    });

    if (error) {
      throw error;
    }

    if (data?.url) {
      // Open the OAuth URL in browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === 'success') {
        // Extract the URL from the result
        const url = result.url;
        if (url) {
          // Parse the URL to extract the access token
          const urlObj = new URL(url);
          const accessToken = urlObj.searchParams.get('access_token');
          const refreshToken = urlObj.searchParams.get('refresh_token');

          if (accessToken && refreshToken) {
            // Set the session
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              throw sessionError;
            }

            return { data: sessionData, error: null };
          }
        }
      }

      return { data: null, error: new Error('Authentication cancelled') };
    }

    return { data: null, error: new Error('No OAuth URL returned') };
  } catch (error: any) {
    return { data: null, error };
  }
}
