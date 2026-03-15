import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

// dismiss any lingering OAuth browser popups — nobody likes leftover tabs
WebBrowser.maybeCompleteAuthSession();

// figure out where Google should send the user after they log in
function getRedirectUri() {
  if (Platform.OS === 'web') {
    // web: tack /callback onto wherever we're hosted — simple math
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/callback`;
    }
    return 'http://localhost:8081/callback';
  }
  
  // mobile: deep link via sideline:// so the phone knows to bounce back to our app
  return AuthSession.makeRedirectUri({
    scheme: 'sideline',
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
      // Web: let Supabase handle the whole Google OAuth dance — redirect, tokens, everything
      // we literally just kick it off and Supabase does the rest
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        throw error;
      }

      console.log('✅ OAuth initiated, redirecting to Google...');
      
      // full page redirect flow: us → Google login → back to us
      // Supabase picks up the tokens on re-entry and builds the session
      // nothing left for us to do here
      return { data, error: null };
    } else {
      // Native: pop open an in-app browser for the Google sign-in flow
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
        // launch the auth browser pointing at Google — one-way ticket to sign-in town
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === 'success') {
          // grab the callback URL that Google sent us back with
          const url = result.url;
          if (url) {
            // dig through the URL params to find our precious access & refresh tokens
            const urlObj = new URL(url);
            const accessToken = urlObj.searchParams.get('access_token');
            const refreshToken = urlObj.searchParams.get('refresh_token');

            if (accessToken && refreshToken) {
              // hand the tokens to Supabase so it can officially log us in
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
