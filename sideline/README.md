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
- Auto-saves recordings to the current game session

### Game Session Management
- Create game sessions with opponent name, date, and location
- All recordings automatically associated with the active session
- View all past matches in a list, each titled by opponent name
- Click into any match to see all recordings and post-game summary

### AI-Generated Insights
- Automatic transcription of all voice memos
- AI extracts key information:
  - Skill categories (serving, passing, setting, hitting, blocking, defense)
  - Feedback types (positive reinforcement, correction needed, tactical adjustment)
  - Mentioned players
  - Urgency levels
  - Key phrases and summaries
- Searchable transcriptions for easy finding of specific observations

### Post-Game Review
- View all matches with opponent names as titles
- Click into any match to see all recordings from that game
- See AI-generated labels at a glance
- Filter recordings by skill or feedback type
- Search transcriptions for specific keywords
- Play audio recordings and review transcriptions
- Edit AI labels and add manual notes
- Post-game summary with key observations

## Technical Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (Authentication, Database, Storage)
- **AI Services**: OpenAI Whisper (transcription), GPT-4 (analysis)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Supabase (see `tasks.md` for detailed instructions)

3. Start the app:
   ```bash
   npx expo start
   ```

For detailed development instructions and setup, see `tasks.md` in the project root.

## Project Status

This project is in active development. The MVP focuses on core recording and review functionality for volleyball coaches.
