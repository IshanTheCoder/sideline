# TODOs

## Deferred

- **Per-player consent granularity** — track consent per individual player (join table: player_id, consented, consented_at) so a coach can exclude a specific non-consented player's data from notes/exports. Team-level consent covers the first 10 coaches; build this when a parent actually opts a kid out. Depends on: team-level consent screen shipping first.
- **usage_events read path** — the observation pipeline (when built) only writes events; there's no query layer to answer "did coaches use this unassisted." Start with a documented SQL query, graduate to an admin view when volume justifies it. Depends on: write path shipping and accumulating real data.
- **Marketing copy vs. reality: transcription engine** — the site/pitch says "Deepgram Nova-3 with volleyball keyterm prompting" but the code uses Groq Whisper (`lib/transcription.js`, now `whisper-large-v3` with a volleyball+roster prompt). Either update the marketing copy or actually migrate to Deepgram (Nova-3 keyterm prompting is a real API feature and may beat Whisper in loud gyms — worth a bake-off with real game audio).

- **Parent-facing self-serve data export/delete** — ship in week 2 of the 10-coach outreach push. Manual (email/text) export/delete requests cover the first cohort in the interim. See `~/.gstack/projects/IshanTheCoder-sideline/ceo-plans/2026-07-08-consent-and-observation.md` for the full scope decision record.
- **Repo hygiene: `.npm-cache` is tracked in git** — 34 files under `sideline/.npm-cache/_cacache/` are committed. No `.gitignore` exists in the repo. Add one (at minimum `node_modules/`, `.npm-cache/`, `.expo/`) and `git rm -r --cached sideline/.npm-cache` in a separate cleanup commit — not bundled with feature work.
