# Host the OAuth redirect page (free, no Vercel)

Google needs an **https** URL for “Import from Google Sheets.” Easiest free option:

## GitHub Pages (recommended, ~2 minutes)

1. **Create a new repo** on [github.com](https://github.com/new) (e.g. name: `sideline-oauth`). Public, no need to add README.

2. **Add the redirect page:**
   - In the repo, click **“uploading an existing file”** (or Add file → Upload files).
   - Upload `oauth-redirect.html` from this project.
   - **Rename it to `index.html`** so the URL is shorter.
   - Commit.

3. **Turn on GitHub Pages:**
   - Repo → **Settings** → **Pages** (left sidebar).
   - Under “Build and deployment”, **Source**: “Deploy from a branch”.
   - **Branch**: `main`, folder **/ (root)** → Save.

4. **Your redirect URL** (after a minute or two):
   ```text
   https://YOUR_GITHUB_USERNAME.github.io/sideline-oauth/
   ```
   Replace `YOUR_GITHUB_USERNAME` and `sideline-oauth` if you used different names.

5. **In your app’s `.env`:**
   ```env
   EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI=https://YOUR_GITHUB_USERNAME.github.io/sideline-oauth/
   ```

6. **In Google Cloud Console** → your OAuth client → **Authorized redirect URIs** → add that **exact** URL → Save.

7. Restart the app and try “Sign in with Google” again.

---

**Other free options:** Netlify ([netlify.com](https://app.netlify.com/drop)) or Cloudflare Pages – drag a folder containing `index.html` (same file, renamed) to deploy. Then use the URL they give you in `.env` and in Google Console.
