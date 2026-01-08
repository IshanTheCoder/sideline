# Anchor App - Requirements Document

## Table of Contents

1. [App Overview](#app-overview)
2. [Core Problem Statement](#core-problem-statement)
3. [MVP Features](#mvp-features)
4. [Future Features](#future-features)
5. [Technical Architecture](#technical-architecture)
6. [User Flows](#user-flows)
7. [Data Structure](#data-structure)
8. [AI Capabilities](#ai-capabilities)
9. [Success Metrics](#success-metrics)

---

## App Overview

**Anchor** is a mobile coaching assistant designed to reduce cognitive overload for volleyball coaches during games. The app allows coaches to quickly capture voice memos during matches without breaking their focus, then review and organize these observations after the game with AI-generated labels and insights.

**Target Platform**: iOS (primary), Android (future)  
**Target Users**: High school volleyball coaches  
**MVP Scope**: Core voice capture and organization features

---

## Core Problem Statement

### The Challenge

Coaches experience cognitive overload during games while trying to:
- Observe player performance in real-time
- Make tactical decisions
- Remember specific moments for post-game feedback
- Track multiple players simultaneously
- Maintain focus on the game flow

### The Solution

**Quick voice capture during games + AI-powered organization for post-game review**

---

## MVP Features

### 1. Quick Voice Memo Capture (During Game)
**Priority**: Critical - MVP Feature

**Key Capabilities**:
- One-tap recording: Large, easy-to-hit record button
- Minimal UI: Designed for glancing, not staring
- Quick player tagging: Optional quick-select player before/after recording
- Background recording: App works even when screen is locked
- Visual feedback: Clear recording indicator (pulsing red dot, timer)
- Quick save: Auto-saves when recording stops

**Use Case Example**:
1. Coach sees a rotation error at 15 minutes into Set 2
2. Taps record button
3. Says: "Emma's footwork on that middle block was late, needs to watch the setter's hands"
4. Taps stop
5. Returns focus to game (3-5 seconds total)

---

### 2. AI-Generated Labels & Organization (Post-Game)
**Priority**: Critical - MVP Feature

After the game, AI analyzes each voice memo and automatically generates:

#### A. Content Labels
- **Skill category**: Serving, passing, setting, hitting, blocking, defense, transition
- **Feedback type**: Positive reinforcement, correction needed, tactical adjustment, injury concern
- **Player(s) mentioned**: Extracted from audio transcription
- **Urgency level**: Immediate attention, address in practice, general observation
- **Key phrases**: 3-5 word summary of the memo

#### B. Timeline Context
- Game timestamp (Set number, approximate score/time)
- Recording duration
- When recorded (date/time)

#### C. Searchable Transcription
- Full text transcription of the voice memo
- Searchable keywords
- Editable by coach

**Example AI Labels**:
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
**Priority**: High - MVP Feature

**Features**:
- Team roster: Add/edit player names and numbers
- Player profiles: Basic info (name, position, jersey number)
- Quick access: Scrollable list for easy tagging
- Player filters: View all memos related to specific players
- Multi-player tagging: Tag multiple players in one recording

---

### 4. Game Session Management
**Priority**: High - MVP Feature

#### Before Game
- Create new game session
- Add opponent name, date, location
- Select active roster

#### During Game
- All recordings automatically associated with current game session
- Set markers (Set 1, Set 2, etc.)
- Quick notes option

#### After Game
- Review all recordings from that session
- Add final notes/summary
- Share selected recordings with assistant coaches
- Archive game session

---

### 5. Post-Game Review Interface
**Priority**: High - MVP Feature

#### Dashboard View
- All recordings from game organized chronologically
- AI-generated labels visible at a glance
- Filter by: Player, Skill, Feedback Type, Set
- Search function for keywords

#### Individual Recording View
- Play/pause audio
- View full transcription
- Edit AI labels if needed
- Add manual notes
- Tag additional players
- Mark as "addressed" or "for next practice"

#### Analysis Summary
- Most mentioned players
- Most common skill areas
- Positive vs. corrective feedback ratio
- Urgent items flagged

---

### 6. Authentication & Data Management
**Priority**: High - MVP Feature

#### Coach Account
- Secure login (email/password or username/password)
- Profile management
- Team management
- Sport selection (Volleyball for MVP)

#### Data Storage
- Cloud-based storage (Firebase/Supabase)
- Voice recordings stored securely
- Automatic backup
- Data privacy compliance

---

## Future Features

### Practice Planning Integration
**Priority**: Medium - Phase 2

- Mark recordings as "drill needed"
- Create practice plan from selected recordings
- Group recordings by skill for drill planning
- Export practice notes

---

## Technical Architecture

### Frontend
- **Framework**: React Native with Expo
- **Platform**: iOS (primary), Android (future)
- **Navigation**: Expo Router

### Backend
- **Authentication**: Supabase (recommended) or Firebase
- **Database**: Cloud Firestore/PostgreSQL (metadata)
- **Storage**: Cloud Storage (audio files)

### AI Services
- **Transcription**: OpenAI Whisper API, Google Speech-to-Text
- **Analysis**: OpenAI GPT-4 API, Claude API
- **Custom volleyball vocabulary** for better accuracy

---

## User Flows

### During Game Flow
1. Coach opens app → Auto-starts current game session
2. Sees play worth noting → Taps record button
3. Speaks observation (5-15 seconds)
4. Taps stop
5. Optional: Quick-tag player from visible list
6. Returns to watching game

### After Game Flow
1. Coach opens app review section
2. Sees all recordings with AI labels
3. Filters by player or skill category
4. Plays recording, reviews transcription
5. Edits labels if needed
6. Marks items for practice planning
7. Shares relevant clips with assistant coaches

---

## Data Structure

```
User (Coach)
├── Profile
│   ├── Username/Email
│   ├── Sport (Volleyball)
│   └── Preferences
├── Teams
│   ├── Team Name
│   ├── Players[]
│   │   ├── Name
│   │   ├── Position
│   │   └── Jersey Number
│   └── Active Status
└── Game Sessions
    ├── Session Info
    │   ├── Date
    │   ├── Opponent
    │   └── Location
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

## AI Capabilities

### Voice-to-Text Transcription
- Real-time or post-recording transcription
- Sports terminology recognition (volleyball-specific)
- Speaker identification (coach's voice)

### Natural Language Processing
- Extract player names from speech
- Identify skill categories from context
- Classify feedback sentiment (positive/corrective)
- Determine urgency from tone and keywords

### Smart Categorization
- Pattern recognition across multiple recordings
- Automatic skill tagging
- Context-aware labeling

---

## MVP Feature Priority

### Phase 1 - MVP (Weeks 1-4)
- ✅ Voice recording capture
- ✅ Basic player management
- ✅ Game session creation
- ✅ Audio playback
- ✅ Cloud storage setup
- ✅ Coach authentication

### Phase 2 - AI Integration (Weeks 5-6)
- ✅ Voice-to-text transcription
- ✅ AI label generation
- ✅ Smart categorization
- ✅ Search functionality

### Phase 3 - Enhancement (Weeks 7-8)
- ✅ Advanced filtering
- ✅ Practice planning tools
- ✅ Sharing capabilities
- ✅ Analytics dashboard

---

## Success Metrics

- **Time to capture observation**: < 5 seconds
- **Post-game review efficiency**: 50% faster than traditional notes
- **Coach satisfaction**: Reduced cognitive load during games
- **Accuracy**: 90%+ AI label accuracy (validated by coach)
