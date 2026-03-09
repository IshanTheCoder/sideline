/**
 * Google Drive + Sheets API helpers for importing roster from a Google Sheet.
 *
 * By default uses Supabase Google OAuth (no GitHub redirect needed). Add Drive + Sheets scopes
 * in Supabase Dashboard → Authentication → Providers → Google → Additional Scopes:
 *   https://www.googleapis.com/auth/drive.readonly
 *   https://www.googleapis.com/auth/spreadsheets.readonly
 *
 * Optional: set EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI to an https URL to use direct Google OAuth
 * instead (e.g. GitHub Pages). Then add that URL in Google Cloud Console → Authorized redirect URIs.
 */

import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/** Storage keys for Sheets OAuth flow (callback stores token, roster reads it) */
export const GOOGLE_SHEETS_FLOW_KEY = 'google_sheets_flow';
export const GOOGLE_SHEETS_PENDING_TOKEN_KEY = 'google_sheets_pending_token';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
].join(' ');

function getSheetsRedirectUri() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') return `${window.location.origin}/callback`;
    return 'http://localhost:8081/callback';
  }
  return AuthSession.makeRedirectUri({ scheme: 'sideline', path: 'callback' });
}

/**
 * Request Google OAuth token for Drive + Sheets read access.
 * Always uses Supabase Google OAuth (redirect to app, no GitHub page needed).
 * @returns {Promise<{ accessToken: string }|{ error: Error }>}
 */
export async function requestGoogleSheetsAccess() {
  return requestGoogleSheetsAccessViaSupabase();
}

/**
 * Supabase-based flow: redirect goes to app (e.g. sideline://callback), no GitHub page needed.
 */
async function requestGoogleSheetsAccessViaSupabase() {
  const redirectUri = getSheetsRedirectUri();
  const scopes = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ].join(' ');

  try {
    await AsyncStorage.setItem(GOOGLE_SHEETS_FLOW_KEY, '1');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes,
        redirectTo: redirectUri,
      },
    });

    if (error) return { error };
    if (!data?.url) return { error: new Error('No OAuth URL returned') };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    if (result.type !== 'success' || !result.url) {
      await AsyncStorage.removeItem(GOOGLE_SHEETS_FLOW_KEY);
      return { error: new Error('Sign-in was cancelled or failed') };
    }

    const url = new URL(result.url);
    const params = url.searchParams;
    const hashParams = url.hash ? new URLSearchParams(url.hash.slice(1)) : null;
    const get = (key) => params.get(key) ?? hashParams?.get(key) ?? null;
    const accessToken = get('access_token');
    const refreshToken = get('refresh_token');
    const providerTokenFromUrl = get('provider_token');

    if (!accessToken || !refreshToken) {
      return { error: new Error('No tokens returned from Google') };
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) return { error: sessionError };

    const { data: { session } } = await supabase.auth.getSession();
    const providerToken =
      providerTokenFromUrl ??
      session?.provider_token ??
      session?.user?.user_metadata?.provider_token;
    if (!providerToken) {
      await AsyncStorage.removeItem(GOOGLE_SHEETS_FLOW_KEY);
      return {
        error: new Error(
          'Google Drive/Sheets scopes not granted. In Supabase Dashboard → Authentication → Providers → Google, add Additional Scopes: https://www.googleapis.com/auth/drive.readonly and https://www.googleapis.com/auth/spreadsheets.readonly'
        ),
      };
    }
    await AsyncStorage.removeItem(GOOGLE_SHEETS_FLOW_KEY);
    return { accessToken: providerToken };
  } catch (e) {
    await AsyncStorage.removeItem(GOOGLE_SHEETS_FLOW_KEY).catch(() => {});
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * Direct Google OAuth (requires EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI and a hosted redirect page, e.g. GitHub).
 */
async function requestGoogleSheetsAccessDirect(redirectUri) {
  console.log('[Google Sheets] Redirect URI for Google Cloud Console:', redirectUri);
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!clientId) {
    return {
      error: new Error(
        `Google client ID not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to .env. Add this redirect URI in Google Console: ${redirectUri}`
      ),
    };
  }

  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: SCOPES,
      prompt: 'consent',
    }).toString();

  try {
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    if (result.type !== 'success' || !result.url) {
      return { error: new Error('Sign-in was cancelled or failed') };
    }
    const url = new URL(result.url);
    const params = new URLSearchParams(url.hash.slice(1));
    const accessToken = params.get('access_token');
    if (!accessToken) return { error: new Error('No access token returned from Google') };
    return { accessToken };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * List spreadsheets from the user's Google Drive.
 * @param {string} accessToken
 * @returns {Promise<{ files: Array<{ id: string, name: string }>, error?: Error }>}
 */
export async function listSpreadsheets(accessToken) {
  try {
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/files?' +
        new URLSearchParams({
          q: "mimeType='application/vnd.google-apps.spreadsheet'",
          orderBy: 'modifiedTime desc',
          pageSize: '50',
          fields: 'files(id,name)',
        }).toString(),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res.ok) {
      const body = await res.text();
      return { files: [], error: new Error(body || `Drive API ${res.status}`) };
    }
    const data = await res.json();
    const files = (data.files || []).map((f) => ({ id: f.id, name: f.name || 'Untitled' }));
    return { files };
  } catch (e) {
    return { files: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * Get values from the first sheet (or specified range).
 * @param {string} accessToken
 * @param {string} spreadsheetId
 * @param {string} [range] - e.g. 'Sheet1' or 'Sheet1!A1:D100'. Defaults to first sheet.
 * @returns {Promise<{ values: string[][], error?: Error }>}
 */
export async function getSheetValues(accessToken, spreadsheetId, range = 'Sheet1') {
  try {
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/` +
      encodeURIComponent(range);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text();
      return { values: [], error: new Error(body || `Sheets API ${res.status}`) };
    }
    const data = await res.json();
    const values = data.values || [];
    return { values };
  } catch (e) {
    return { values: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}
