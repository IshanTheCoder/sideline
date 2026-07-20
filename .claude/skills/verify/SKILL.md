---
name: verify
description: How to run and visually verify the Sideline web app (marketing site + app shell) on this Windows machine.
---

# Verifying Sideline web changes

The app lives in `sideline/` (repo has a nested `sideline/sideline`-looking path: repo root contains a `sideline/` Expo project).

## Launch

```bash
cd sideline
npx expo start --web --port 8081 --offline   # run in background; ~1 min to first bundle
```

Wait for `curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/` to return 200.

IMPORTANT: use port 8081, not an arbitrary port. Supabase's OAuth redirect
allow-list controls where Google sign-in lands; unlisted origins get bounced to
the Site URL (https://tapsideline.com — the deployed production app), which
looks like "my local changes aren't showing". localhost:8081 is the historical
dev port (see the fallback in lib/googleAuth.js). Email+password login works on
any port since it involves no redirect.

## Drive — macOS (this machine)

Use the in-app Browser pane instead of headless Chrome: `preview_start` with the
`sideline-web` config from `.claude/launch.json` (or reuse an already-running
server on port 8081 — check with curl first). Resize to the mobile preset
(375×812) before screenshotting; the app is a centered 440px mobile column.
Signed-in screens require the user to log in themselves in the preview pane.
Note: the pane's synthetic clicks sometimes don't register with React Native
Web's Pressability — if a click seems ignored, dispatch pointerdown/pointerup/
click via javascript_tool instead.

## Drive — Windows (legacy notes; no Playwright installed; use system Chrome headless)

Pages are client-rendered by Metro, so plain curl only returns the shell.
Headless Chrome with a virtual time budget renders the React content:

```bash
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
"$CHROME" --headless=new --disable-gpu --no-sandbox --user-data-dir="$SCRATCH/profileN" \
  --virtual-time-budget=60000 --timeout=120000 \
  --dump-dom http://localhost:8090/ > page.html          # rendered DOM for grepping copy
"$CHROME" ... --window-size=1440,5200 --screenshot=out.png http://localhost:8090/   # visual
```

Use a fresh `--user-data-dir` per invocation (profile lock otherwise).

## Gotchas

- Bash tool's `$TMPDIR` is empty on this machine; use the session scratchpad path explicitly for logs.
- The shell's cwd persists between calls; `cd sideline` fails if you're already inside it.
- Marketing pages: `/` and `/about` (files in `sideline/app/(marketing)/`).
- Known pre-existing issue: horizontal overflow at ~390px width (nav button, hero h1, notecard clip at the right edge). Reproduces on production (https://tapsideline.com), so don't attribute it to new changes.
- Stop the server afterward: `Get-NetTCPConnection -LocalPort 8090 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`.
