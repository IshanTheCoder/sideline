# Sideline App - MVP Requirements

## App Overview

Sideline is a mobile coaching assistant designed to reduce cognitive overload for volleyball coaches during games. The app allows coaches to quickly capture voice memos during matches without breaking their focus, then review and organize these observations after the game with AI-generated labels and insights.

## Core Problem Statement

Coaches experience cognitive overload during games while trying to:
- Observe player performance in real-time
- Make tactical decisions
- Remember specific moments for post-game feedback
- Track multiple players simultaneously
- Maintain focus on the game flow

**Solution**: Quick voice capture during games + AI-powered organization for post-game review

## MVP Features

### 1. Authentication & User Management
**Priority**: Critical - MVP Feature

- Secure login/signup with email and password
- User profile creation and management
- Session persistence (stay logged in)
- Basic account settings

**React Native Components Needed**:
- `TextInput` for email/password fields
- `TouchableOpacity` for buttons
- `Picker` for sport selection (signup)
- Form validation logic

### 2. Quick Voice Memo Capture (During Game)
**Priority**: Critical - MVP Feature

- One-tap recording: Large, easy-to-hit record button
- Minimal UI: Designed for glancing, not staring
- Quick player tagging: Optional quick-select player before/after recording
- Background recording: App works even when screen is locked
- Visual feedback: Clear recording indicator (pulsing red dot, timer)
- Quick save: Auto-saves when recording stops

**Use Case**:
1. Coach sees a rotation error at 15 minutes into Set 2
2. Taps record button
3. Says: "Emma's footwork on that middle block was late, needs to watch the setter's hands"
4. Taps stop
5. Returns focus to game (3-5 seconds total)

**React Native Components Needed**:
- `expo-av` for audio recording
- Custom `RecordButton` component
- `Text` for timer display
- Background task handling

### 3. Game Session Management
**Priority**: Critical - MVP Feature

**Before Game**:
- Create new game session
- Add opponent name, date, location
- Select active roster

**During Game**:
- All recordings automatically associated with current game session
- Set markers (Set 1, Set 2, etc.)
- Quick notes option

**After Game**:
- View all matches in a list, each titled by opponent name (e.g., "vs. Lincoln High School")
- Click on any match to see all recordings from that game session
- View post-game summary with all observations
- Add final notes/summary
- Archive game session

**React Native Components Needed**:
- Form components for session creation
- `DatePicker` for date selection
- Session list view
- Navigation between sessions

### 5. AI-Generated Labels & Organization (Post-Game)
**Priority**: Critical - MVP Feature

After the game, AI analyzes each voice memo and automatically generates:

**A. Content Labels**:
- Skill category: Serving, passing, setting, hitting, blocking, defense, transition
- Feedback type: Positive reinforcement, correction needed, tactical adjustment, injury concern
- Player(s) mentioned: Extracted from audio transcription
- Urgency level: Immediate attention, address in practice, general observation
- Key phrases: 3-5 word summary of the memo

**B. Searchable Transcription**:
- Full text transcription of the voice memo
- Searchable keywords
- Editable by coach

**Example AI Labels**:
```
Team Needs To Better On Serve Receive (0:23 seconds)
🏐 Skill: Passing
👤 Players: Emma, Sarah
⚠️ Type: Correction Needed
📝 Summary: "Late block timing, watch setter"
```

**Technical Requirements**:
- Voice-to-text: OpenAI Whisper API or Google Speech-to-Text
- Analysis: OpenAI GPT-4 API or Claude API
- Custom volleyball vocabulary for better accuracy

### 6. Post-Game Review Interface
**Priority**: High - MVP Feature

**Match List View**:
- View all past matches, each titled by opponent name (e.g., "vs. Lincoln High School - Oct 15, 2024")
- Click on any match to view all recordings from that game session
- See post-game summary for each match

**Game Session View** (when clicking on a match):
- All recordings from that game organized chronologically
- AI-generated labels visible at a glance
- Filter by: Skill, Feedback Type
- Search function for keywords
- Post-game summary with key observations

**Individual Recording View**:
- Play/pause audio
- View full transcription
- Edit AI labels if needed
- Add manual notes
- Mark as "addressed" or "for next practice"

**React Native Components Needed**:
- `FlatList` for recording list
- Audio player component (`expo-av`)
- `TextInput` for editing transcription/notes
- Filter/search UI components

## User Flow

### During Game:
1. Coach opens app → Auto-starts current game session
2. Sees play worth noting → Taps record button
3. Speaks observation (5-15 seconds)
4. Taps stop
5. Optional: Quick-tag player from visible list
6. Returns to watching game

### After Game:
1. Coach opens app review section
2. Sees list of all matches, each titled by opponent name (e.g., "vs. Lincoln High School")
3. Clicks on a match to view all recordings from that game session
4. Sees all recordings with AI labels organized chronologically
5. Views post-game summary with key observations
6. Filters recordings by skill or feedback type
7. Searches transcriptions for specific keywords
8. Plays recording, reviews transcription
9. Edits labels if needed
10. Adds manual notes

## Technical Stack

### Frontend
- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API (for auth, sessions)
- **Storage**: Expo SecureStore (for auth tokens)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for audio files)
- **API**: Supabase REST API

### AI Services
- **Transcription**: OpenAI Whisper API
- **Analysis**: OpenAI GPT-4 API or Claude API

## Data Structure

```
User (Coach)
├── Profile
│   ├── id (UUID)
│   ├── username
│   ├── name
│   └── created_at
├── Teams[]
│   ├── id (UUID)
│   ├── coach_id (FK)
│   ├── name
│   ├── sport
│   └── created_at
│   └── Players[]
│       ├── id (UUID)
│       ├── team_id (FK)
│       ├── name
│       ├── jersey_number
│       ├── position
│       └── created_at
└── Game Sessions[]
    ├── id (UUID)
    ├── team_id (FK)
    ├── opponent_name
    ├── date
    ├── location
    ├── created_at
    └── Recordings[]
        ├── id (UUID)
        ├── game_session_id (FK)
        ├── audio_url (Supabase Storage)
        ├── duration (seconds)
        ├── timestamp (when recorded)
        ├── transcription (text)
        ├── ai_labels (JSON)
        │   ├── skill_category
        │   ├── feedback_type
        │   ├── players_tagged[]
        │   ├── urgency
        │   └── key_phrases
        ├── manual_notes (text)
        ├── status (new/reviewed/addressed)
        └── created_at
```

## Success Metrics

- Time to capture observation: < 5 seconds
- Post-game review efficiency: 50% faster than traditional notes
- Coach satisfaction: Reduced cognitive load during games
- Accuracy: 90%+ AI label accuracy (validated by coach)

### 4. Player & Team Management
**Priority**: Medium - Phase 2 Feature

- Team roster: Add/edit player names and numbers
- Player profiles: Basic info (name, position, jersey number)
- Quick access: Scrollable list for easy tagging
- Player filters: View all memos related to specific players
- Multi-player tagging: Tag multiple players in one recording

**Note**: This feature is deferred to Phase 2 to focus on core recording and review functionality first.

## Out of Scope for MVP

The following features are **NOT** included in the MVP and will be added in future phases:
- Player & Team Management (moved to Phase 2)
- Timeline Context (Set number, approximate score/time markers)
- Practice planning integration
- Sharing recordings with assistant coaches
- Advanced analytics dashboard
- Multiple sport support (MVP focuses on volleyball)
- Offline mode
- Export functionality
