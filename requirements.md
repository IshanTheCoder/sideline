# Anchor App - MVP Requirements

## App Overview

Anchor is a mobile coaching assistant designed to reduce cognitive overload for volleyball coaches during games. The app allows coaches to quickly capture voice memos during matches without breaking their focus, then review and organize these observations after the game with AI-generated labels and insights.

## Core Problem Statement

Coaches experience cognitive overload during games while trying to:
- Observe player performance in real-time
- Make tactical decisions
- Remember specific moments for post-game feedback
- Track multiple players simultaneously
- Maintain focus on the game flow

**Solution:** Quick voice capture during games + AI-powered organization for post-game review

---

## MVP Core Features

### 1. Quick Voice Memo Capture (During Game)
**Priority:** Critical - MVP Feature

**Requirements:**
- One-tap recording: Large, easy-to-hit record button
- Minimal UI: Designed for glancing, not staring
- Quick player tagging: Optional quick-select player before/after recording
- Background recording: App works even when screen is locked
- Visual feedback: Clear recording indicator (pulsing red dot, timer)
- Quick save: Auto-saves when recording stops

**Use Case:**
Coach sees a rotation error at 15 minutes into Set 2
- Taps record button
- Says: "Emma's footwork on that middle block was late, needs to watch the setter's hands"
- Taps stop
- Returns focus to game (3-5 seconds total)

---

### 2. AI-Generated Labels & Organization (Post-Game)
**Priority:** Critical - MVP Feature

After the game, AI analyzes each voice memo and automatically generates:

**A. Content Labels**
- Skill category: Serving, passing, setting, hitting, blocking, defense, transition
- Feedback type: Positive reinforcement, correction needed, tactical adjustment, injury concern
- Player(s) mentioned: Extracted from audio transcription
- Urgency level: Immediate attention, address in practice, general observation
- Key phrases: 3-5 word summary of the memo

**B. Timeline Context**
- Game timestamp (Set number, approximate score/time)
- Recording duration
- When recorded (date/time)

**C. Searchable Transcription**
- Full text transcription of the voice memo
- Searchable keywords
- Editable by coach

**Example AI Labels:**
```
Voice Memo #1 (0:23 seconds)
🏐 Skill: Blocking
👤 Players: Emma, Sarah
⚠️ Type: Correction Needed
📝 Summary: "Late block timing, watch setter"
🕐 Context: Set 2, ~15:00 mark
```

---

### 3. Player Management System
**Priority:** High - MVP Feature

**Requirements:**
- Team roster: Add/edit player names and numbers
- Player profiles: Basic info (name, position, jersey number)
- Quick access: Scrollable list for easy tagging
- Player filters: View all memos related to specific players
- Multi-player tagging: Tag multiple players in one recording

---

### 4. Game Session Management
**Priority:** High - MVP Feature

**Before Game:**
- Create new game session
- Add opponent name, date, location
- Select active roster

**During Game:**
- All recordings automatically associated with current game session
- Set markers (Set 1, Set 2, etc.)
- Quick notes option

**After Game:**
- Review all recordings from that session
- Add final notes/summary
- Share selected recordings with assistant coaches
- Archive game session

---

### 5. Post-Game Review Interface
**Priority:** High - MVP Feature

**Dashboard View:**
- All recordings from game organized chronologically
- AI-generated labels visible at a glance
- Filter by: Player, Skill, Feedback Type, Set
- Search function for keywords

**Individual Recording View:**
- Play/pause audio
- View full transcription
- Edit AI labels if needed
- Add manual notes
- Tag additional players
- Mark as "addressed" or "for next practice"

**Analysis Summary:**
- Most mentioned players
- Most common skill areas
- Positive vs. corrective feedback ratio
- Urgent items flagged

---

### 6. Authentication & Data Management
**Priority:** High - MVP Feature

**Coach Account:**
- Secure login (email/password)
- Profile management
- Team management

**Data Storage:**
- Cloud-based storage (Supabase)
- Voice recordings stored securely
- Automatic backup
- Data privacy compliance

---

## Technical Architecture

**Frontend:**
- React Native (iOS & Android)
- Expo Router for navigation
- TypeScript

**Backend:**
- Supabase (Authentication, Database, Storage)
- PostgreSQL (metadata)
- Supabase Storage (audio files)

**AI Services:**
- OpenAI Whisper API (transcription)
- OpenAI GPT-4 API or Claude API (analysis & labeling)

---

## Data Structure

```
User (Coach)
├── Profile
│   ├── id (uuid)
│   ├── username
│   ├── sport
│   └── created_at
├── Teams
│   ├── Team Name
│   ├── Players[]
│   │   ├── name
│   │   ├── jersey_number
│   │   └── position
│   └── Active Status
└── Game Sessions
    ├── Session Info (date, opponent, location)
    ├── Set Markers
    └── Recordings[]
        ├── Audio File URL
        ├── Timestamp
        ├── Duration
        ├── AI Labels
        │   ├── Skill Category
        │   ├── Feedback Type
        │   ├── Players Tagged
        │   ├── Urgency
        │   └── Key Phrases
        ├── Transcription
        ├── Manual Notes
        └── Status (new/reviewed/addressed)
```

---

## User Flows

### During Game:
1. Coach opens app → Auto-starts current game session
2. Sees play worth noting → Taps record button
3. Speaks observation (5-15 seconds)
4. Taps stop
5. Optional: Quick-tag player from visible list
6. Returns to watching game

### After Game:
1. Coach opens app review section
2. Sees all recordings with AI labels
3. Filters by player or skill category
4. Plays recording, reviews transcription
5. Edits labels if needed
6. Marks items for practice planning
7. Shares relevant clips with assistant coaches

---

## Success Metrics

- Time to capture observation: < 5 seconds
- Post-game review efficiency: 50% faster than traditional notes
- Coach satisfaction: Reduced cognitive load during games
- Accuracy: 90%+ AI label accuracy (validated by coach)

---

## Future Enhancements (Phase 2+)

**Practice Planning Integration:**
- Mark recordings as "drill needed"
- Create practice plan from selected recordings
- Group recordings by skill for drill planning
- Export practice notes

**Advanced Features:**
- Advanced filtering options
- Analytics dashboard
- Enhanced sharing capabilities
- Multi-team support
