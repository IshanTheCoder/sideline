# Google Sheets sign-in: Use Supabase (no GitHub)

**Recommended:** Use Supabase for “Import from Google Sheets” so you don’t need to host a redirect page.

## 1. Supabase Dashboard

1. **Supabase** → your project → **Authentication** → **Providers** → **Google** (enable if needed).
2. Under **Additional Scopes** (or **Scopes**), add:
   ```text
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/spreadsheets.readonly
   ```
   Save.

3. **Authentication** → **URL Configuration** → **Redirect URLs**. Ensure your app’s redirect is allowed, e.g.:
   - Mobile: `sideline://callback` (or the exact value your app uses; check logs for “Redirect URI”).
   - Web: your site origin + `/callback` (e.g. `https://yoursite.com/callback`).

## 2. Your app

- **Do not set** `EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI` in `.env` (or remove it).  
  With it unset, the app uses Supabase and redirects back to the app (e.g. `sideline://callback`), not GitHub.

- Restart the app and use **Import from Google Sheets** again. You’ll sign in with Google and return to the app; no GitHub page involved.

---

# Optional: Host a redirect page (e.g. GitHub)

Only if you prefer **direct** Google OAuth (e.g. you don’t want to add scopes in Supabase):

## GitHub Pages (~2 minutes)

1. **Create a new repo** on [github.com](https://github.com/new) (e.g. name: `sideline-oaut`). Public, no README needed.

2. **Add the redirect page:**  
   Upload `oauth-redirect.html` from this project, **renamed to `index.html`**, then commit.

3. **Turn on GitHub Pages:**  
   Repo → **Settings** → **Pages** → Source: **Deploy from a branch** → Branch: `main`, folder **/ (root)** → Save.

4. **Your redirect URL** (after a minute or two):
   ```text
   https://YOUR_GITHUB_USERNAME.github.io/sideline-oaut/
   ```

5. **In your app’s `.env`:**
   ```env
   EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI=https://YOUR_GITHUB_USERNAME.github.io/sideline-oaut/
   ```

6. **Google Cloud Console** → your OAuth client → **Authorized redirect URIs** → add that **exact** URL (no trailing slash) → Save.

7. Restart the app and try “Sign in with Google” again.

---

**Other hosts:** Netlify or Cloudflare Pages – deploy a folder containing `index.html` (same file, renamed), then put that URL in `.env` and in Google Console.
