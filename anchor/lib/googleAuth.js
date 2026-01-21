import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// Get the appropriate redirect URI based on platform
function getRedirectUri() {
  if (Platform.OS === 'web') {
    // For web, use the current origin + callback path
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/callback`;
    }
    return 'http://localhost:8081/callback';
  }
  
  // For native, use the deep link scheme
  return AuthSession.makeRedirectUri({
    scheme: 'anchor',
    path: 'callback',
  });
}

const redirectUri = getRedirectUri();
console.log('📍 OAuth Redirect URI:', redirectUri);
console.log('📱 Platform:', Platform.OS);

export async function signInWithGoogle() {
  try {
    console.log('🔐 Starting Google sign-in');
    console.log('📱 Platform:', Platform.OS);
    console.log('🔗 Redirect URI:', redirectUri);

    if (Platform.OS === 'web') {
      // Web platform: Use Supabase's built-in OAuth handling
      // For web, Supabase will automatically redirect back to the current page
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Don't specify redirectTo for web - let Supabase use default
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        throw error;
      }

      console.log('✅ OAuth initiated, redirecting to Google...');
      
      // On web, Supabase handles the redirect automatically
      // User will be redirected to Google, then back to the app
      // Supabase will handle the session automatically
      return { data, error: null };
    } else {
      // Native platform: Use expo-web-browser for OAuth flow
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
        // Open the OAuth URL in an in-app browser
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
    }
  } catch (error) {
    console.error('❌ Google sign-in error:', error);
    return { data: null, error };
  }
}
