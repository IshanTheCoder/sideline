# Sideline: https://tapsideline.com
Sideline is an AI-powered coaching assistant built for sports teams, starting with volleyball. It helps coaches capture in-game observations through voice notes, then automatically transcribes, organizes, and summarizes them into actionable post-game feedback.

## Links
- **Website:** https://tapsideline.com — marketing site, [about page](https://tapsideline.com/about), and [blog](https://tapsideline.com/blog)
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

### Current MVP
- 🎙️ One-tap voice recording
- 📝 Speech-to-text transcription
- 🤖 AI-generated summaries
- 🏐 Game-based note organization
- 👤 Player-specific feedback

### Planned Features
- Multi-game trends and analytics
- Team dashboards
- Export to PDF/email
- Clip syncing with game film
- Support for soccer, basketball, and more sports

## Tech Stack
### Frontend
- React Native / Expo (expo-router) — one codebase for iOS, Android, and web

### Backend/Database
- Supabase

### AI
- Whisper (transcription)
- Groq API (summaries/LLM processing)

### Hosting
- Cloudflare Pages (static web export, deployed automatically on push to `main`)

## Repo Layout
- `sideline/` — the Expo app
  - `sideline/app/(tabs)/` — the app itself (home tab lives at `/home` on web)
  - `sideline/app/(auth)/` — welcome, login, signup
  - `sideline/app/(marketing)/` — the public marketing site (`/`, `/about`, `/blog`), plain HTML/CSS pages statically rendered for SEO
  - `sideline/app/app.jsx` — `/app`, the stable "open the web app" entry URL
  - `sideline/public/` — `robots.txt`, `sitemap.xml`, and static assets
- `WEBSITE_DESIGN_SPEC.md` — design spec the marketing site was built from

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
