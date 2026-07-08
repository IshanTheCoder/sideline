---
name: verify
description: How to run and visually verify the Sideline web app (marketing site + app shell) on this Windows machine.
---

# Verifying Sideline web changes

The app lives in `sideline/` (repo has a nested `sideline/sideline`-looking path: repo root contains a `sideline/` Expo project).

## Launch

```bash
cd sideline
npx expo start --web --port 8090 --offline   # run in background; ~1 min to first bundle
```

Wait for `curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/` to return 200.

## Drive (no Playwright installed; use system Chrome headless)

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
- Known pre-existing issue: horizontal overflow at ~390px width (nav button, hero h1, notecard clip at the right edge). Reproduces on production (https://sideline-ai.pages.dev), so don't attribute it to new changes.
- Stop the server afterward: `Get-NetTCPConnection -LocalPort 8090 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`.
