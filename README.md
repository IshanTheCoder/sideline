# Sideline: https://tapsideline.com
Sideline is an AI-powered coaching assistant built for sports teams, starting with volleyball. It helps coaches capture in-game observations through voice notes, then automatically transcribes, organizes, and summarizes them into actionable post-game feedback.

## Links
- **Website:** https://tapsideline.com — marketing site and [about page](https://tapsideline.com/about)
- **Web app:** https://tapsideline.com/app — opens the app (signed-in users go straight to their home tab)

## The Problem
During games, coaches notice dozens of important details:
- poor positioning  
- late block timing  
- serve receive issues  
- communication issues  

Unfortunately, most of these observations are forgotten in the chaos of live play.
Traditional note-taking methods (i.e., clipboards, phone notes) are slow and distracting.

## Solution
Sideline allows coaches to:
1. **Record voice notes instantly during games**
2. **Automatically transcribe audio**
3. **Generate AI summaries**
4. **Organize feedback by player, skill, or game**
5. **Use insights for film review and player development**

## Example Use Cases
A coach says:
- "Libero drifting too deep in serve receive"
- "Block closing late on the outside"
- "Setter tempo too fast, talk later"

Sideline converts this into structured post-game notes.

## Features

### Current
- 🎙️ One-tap voice recording, works with the screen locked
- 📝 Speech-to-text transcription (Groq-hosted Whisper), primed with the team roster and volleyball vocabulary for accuracy
- 🤖 AI-generated recording labels (skill, feedback type, mentioned players, urgency) and post-game summaries (key takeaways, match-flow paragraph, per-player blurbs, opponent scouting report)
- 🏐 Game-based note organization, with a persistent active-session so recording survives app restarts
- 👤 Player-specific feedback, with fuzzy name/number correction against the roster
- 📋 Roster management — manual entry, CSV import, Google Sheets import, or AI-powered import from a roster screenshot
- 🏷️ Custom coach-defined categories ("buckets") for skills, positions, and feedback types, with AI-generated descriptions
- 🔐 Email/password auth and Google OAuth sign-in (Supabase Auth)
- 🌓 Light/dark theme support

### Planned Features
- Multi-game trends and analytics
- Team dashboards
- Export to PDF/email
- Clip syncing with game film
- Support for soccer, basketball, and more sports (UI groundwork exists; only volleyball is wired up today)

## Tech Stack
### Frontend
- React Native / Expo (expo-router) — one codebase for iOS, Android, and web

### Backend/Database
- Supabase — auth, Postgres database, storage

### AI
- Groq API for everything AI-related:
  - Whisper (`whisper-large-v3`) for transcription
  - Llama/GPT-OSS models for label generation and post-game summary synthesis
  - Llama vision models for AI roster import from screenshots

### Testing
- Vitest

### Hosting
- Cloudflare Pages (static web export, deployed automatically on push to `main`)
- EAS (Expo Application Services) for native iOS/Android builds (see `eas.json`)

## Repo Layout
- `sideline/` — the Expo app
  - `sideline/app/(tabs)/` — the app itself (home tab lives at `/home` on web)
  - `sideline/app/(auth)/` — welcome, login, signup, OAuth callback, password reset
  - `sideline/app/(marketing)/` — the public marketing site (`/`, `/about`), plain HTML/CSS pages statically rendered for SEO
  - `sideline/app/app.jsx` — `/app`, the stable "open the web app" entry URL
  - `sideline/lib/` — Supabase client, Groq client, transcription, label generation, summary synthesis, roster management (CSV/Sheets/screenshot import), custom buckets, volleyball rules/vocabulary
  - `sideline/contexts/` — auth, active recording session, and theme state
  - `sideline/public/` — `robots.txt`, `sitemap.xml`, and static assets
  - `sideline/supabase-migrations/` — incremental SQL migrations (roster tables, etc.)

To build the web bundle locally: `cd sideline && npx expo export --platform web` (output in `sideline/dist/`).

## Why We Built This
We noticed coaches process huge amounts of information in real time, but most of it gets lost after the match.
Sideline helps preserve those insights and turn them into meaningful improvements.

## Contributors
Ishan Sarda, Sidhant Damarapati

## Feedback
If you're a coach, athlete, developer, or just someone with an idea, we'd love to hear from you.

## License
MIT License
