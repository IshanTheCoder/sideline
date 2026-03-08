/**
 * Google Drive + Sheets API helpers for importing roster from a Google Sheet.
 * Requires EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env (Google Cloud OAuth 2.0 Web client ID).
 * Enable Drive API and Google Sheets API in the Google Cloud project.
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
].join(' ');

/**
 * Request Google OAuth token for Drive + Sheets read access.
 * @returns {Promise<{ accessToken: string }|{ error: Error }>}
 */
export async function requestGoogleSheetsAccess() {
  // Google Web application clients only accept https (or http) redirect URIs, not exp:// or sideline://.
  // Set EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI to an https URL (e.g. a page you host on Vercel/Netlify).
  // Add the same URL in Google Cloud Console → Credentials → Authorized redirect URIs.
  const envRedirect = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI?.trim();
  const redirectUri =
    envRedirect && (envRedirect.startsWith('https://') || envRedirect.startsWith('http://localhost'))
      ? envRedirect.replace(/\/$/, '')
      : AuthSession.makeRedirectUri({ path: 'google-sheets-callback' });

  console.log('[Google Sheets] Redirect URI for Google Cloud Console:', redirectUri);

  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!clientId) {
    return {
      error: new Error(
        `Google client ID not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to .env. Add this redirect URI in Google Console: ${redirectUri}`
      ),
    };
  }

  if (!redirectUri.startsWith('https://') && !redirectUri.startsWith('http://localhost')) {
    return {
      error: new Error(
        `Redirect URI must be https (Google does not accept exp://). Set EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI in .env to an https URL and add it in Google Console. See project file oauth-redirect.html for a page you can host.`
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
    const hash = url.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    if (!accessToken) {
      return { error: new Error('No access token returned from Google') };
    }
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
