# Sideline

Sideline is a mobile coaching assistant designed to reduce cognitive overload for volleyball coaches during games. The app allows coaches to quickly capture voice memos during matches without breaking their focus, then review and organize these observations after the game with AI-generated labels and insights.

## The Problem

Coaches experience cognitive overload during games while trying to:
- Observe player performance in real-time
- Make tactical decisions
- Remember specific moments for post-game feedback
- Track multiple players simultaneously
- Maintain focus on the game flow

Traditional note-taking methods (pen and paper, phone notes) require coaches to break their focus, look away from the game, and manually organize observations later. This creates gaps in attention and makes it difficult to capture all important moments.

## The Solution

Sideline provides a simple, distraction-free way to capture observations during games:

1. **Quick Voice Capture**: One-tap recording with a large, easy-to-hit button that works even when the screen is locked
2. **AI-Powered Organization**: After the game, AI automatically transcribes recordings and generates helpful labels (skill categories, feedback types, key phrases)
3. **Organized Review**: Coaches can view all matches, click into any game session, and review all recordings with AI-generated insights

The entire capture process takes less than 5 seconds, allowing coaches to stay focused on the game while preserving important observations for later review.

## Key Features

### Quick Voice Recording
- Large, easy-to-tap record button designed for quick glances
- Works in the background even when screen is locked
- Visual feedback with timer and pulsing indicator
- Auto-saves recordings to the current game session, and the active session persists across app restarts

### Game Session Management
- Create game sessions with opponent name, date, and location
- All recordings automatically associated with the active session
- View all past matches in a list, each titled by opponent name
- Click into any match to see all recordings and post-game summary

### Roster Management
- Add players manually, or import a roster via CSV, a linked Google Sheet, or an AI-read screenshot
- Transcriptions get fuzzy-corrected against the roster (jersey numbers and names) so misheard audio still resolves to the right player
- Custom coach-defined "buckets" for skills, positions, and feedback types, each with an optional AI-written description, layered on top of the built-in volleyball vocabulary

### AI-Generated Insights
- Automatic transcription of all voice memos, primed with volleyball terminology and the team roster for better accuracy in a loud gym
- AI extracts key information per recording:
  - Skill categories (serving, passing, setting, hitting, blocking, defense)
  - Feedback types (positive reinforcement, correction needed, tactical adjustment)
  - Mentioned players
  - Urgency levels
  - Key phrases and summaries
- Searchable transcriptions for easy finding of specific observations

### Post-Game Review & Summaries
- View all matches with opponent names as titles
- Click into any match to see all recordings from that game
- See AI-generated labels at a glance; filter by skill or feedback type
- Search transcriptions for specific keywords
- Play audio recordings and review/edit transcriptions and labels, or add manual notes
- AI-synthesized post-game summary: top takeaways, a match-flow paragraph, short per-player blurbs, and an opponent scouting report

### Auth & Personalization
- Email/password sign-up and login, plus Google OAuth, via Supabase Auth
- Light/dark theme support

## Technical Stack

- **Frontend**: React Native with Expo (Expo Router), TypeScript/JavaScript, React 19 — one codebase for iOS, Android, and web
- **Backend**: Supabase (Authentication, Postgres database, Storage)
- **AI**: All AI features run through the [Groq](https://groq.com) API:
  - `whisper-large-v3` for audio transcription
  - Llama / GPT-OSS chat models (`openai/gpt-oss-120b` with Llama fallbacks) for label generation and post-game summary synthesis
  - Llama vision models for reading rosters out of screenshots
- **Testing**: Vitest (`npm test`)
- **Web hosting**: Cloudflare Pages, static export via `expo export --platform web`
- **Mobile builds**: EAS (Expo Application Services)

> Note: `package.json` still lists the `openai` npm package as a dependency, but it isn't used anywhere in the codebase — all AI calls go through Groq's API (some of which is OpenAI-compatible, e.g. the `/openai/v1/...` endpoint paths and the `openai/gpt-oss-120b` model it hosts). The unused `openai` dependency is safe to remove.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env` (see `.env` for the current values):
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
   - `EXPO_PUBLIC_GROQ_API_KEY` — Groq API key (transcription, label generation, summaries, roster screenshot import)

3. Start the app:
   ```bash
   npx expo start
   ```
   Or target a platform directly: `npm run ios`, `npm run android`, `npm run web`.

4. Run tests:
   ```bash
   npm test
   ```

## Project Status

This project is in active development. Volleyball is the only fully wired-up sport today (multi-sport UI groundwork exists but isn't backed by data yet). Core recording, transcription, labeling, roster management, and post-game review/summary functionality are implemented; see the root `README.md` for the current feature list and planned roadmap.
