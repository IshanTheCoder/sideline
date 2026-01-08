# Anchor MVP Development Tasks

## Current Status: 🔄 In Progress - Phase 1: Project Setup & Authentication

---

## Phase 1: Project Setup & Configuration

### 1.1 Project Initialization
- [x] Initialize Expo project with TypeScript
- [x] Set up Expo Router navigation
- [x] Configure basic project structure
- [x] Install core dependencies (Supabase, Expo packages)

### 1.2 Supabase Setup
- [ ] Create Supabase project
- [ ] Configure environment variables (.env file)
- [ ] Set up Supabase client configuration
- [ ] Create database schema (profiles table)
- [ ] Configure authentication settings in Supabase dashboard
- [ ] Set up storage bucket for audio files

**Estimated Time:** 2-3 hours

---

## Phase 2: Authentication & Onboarding ⬅️ CURRENT PHASE

### 2.1 Supabase Client Setup
- [ ] Create `lib/supabase.ts` - Supabase client configuration
- [ ] Create `lib/auth.ts` - Authentication utility functions
- [ ] Set up environment variable handling

**Estimated Time:** 1 hour

### 2.2 Auth Context & State Management
- [ ] Create `contexts/AuthContext.tsx` - Auth state management
- [ ] Implement session persistence
- [ ] Handle auth state changes
- [ ] Create auth methods (signup, login, logout)

**Estimated Time:** 2 hours

### 2.3 Welcome Screen
- [ ] Create `app/(auth)/welcome.tsx`
- [ ] Design welcome screen UI
- [ ] Add "Get Started" button
- [ ] Implement navigation to signup
- [ ] Add auth state check (redirect if logged in)

**Estimated Time:** 1-2 hours

### 2.4 Signup Screen
- [ ] Create `app/(auth)/signup.tsx`
- [ ] Design signup form UI
- [ ] Add form fields (username, email, password, sport)
- [ ] Implement form validation
- [ ] Add error handling and display
- [ ] Connect to Supabase signup
- [ ] Create user profile in database
- [ ] Add navigation to login screen
- [ ] Handle success flow (navigate to main app)

**Estimated Time:** 3-4 hours

### 2.5 Login Screen
- [ ] Create `app/(auth)/login.tsx`
- [ ] Design login form UI
- [ ] Add form fields (email, password)
- [ ] Implement form validation
- [ ] Add error handling and display
- [ ] Connect to Supabase login
- [ ] Add navigation to signup screen
- [ ] Handle success flow (navigate to main app)

**Estimated Time:** 2-3 hours

### 2.6 Auth Navigation Setup
- [ ] Create `app/(auth)/_layout.tsx` - Auth stack layout
- [ ] Configure auth route structure
- [ ] Update `app/_layout.tsx` to handle auth routing
- [ ] Implement auth state-based navigation
- [ ] Add protected route logic

**Estimated Time:** 2 hours

### 2.7 Testing & Refinement
- [ ] Test signup flow end-to-end
- [ ] Test login flow end-to-end
- [ ] Test session persistence
- [ ] Test error handling scenarios
- [ ] Test navigation flows
- [ ] Fix any bugs or edge cases

**Estimated Time:** 2-3 hours

**Phase 2 Total Estimated Time:** 13-17 hours

---

## Phase 3: Core Recording Features

### 3.1 Audio Recording Setup
- [ ] Install and configure audio recording library (expo-av or react-native-audio-recorder)
- [ ] Request microphone permissions
- [ ] Create recording service/utilities
- [ ] Test basic recording functionality

**Estimated Time:** 3-4 hours

### 3.2 Recording UI
- [ ] Create recording screen/component
- [ ] Design large record button
- [ ] Add recording indicator (pulsing red dot, timer)
- [ ] Implement start/stop recording controls
- [ ] Add visual feedback during recording
- [ ] Test background recording capability

**Estimated Time:** 4-5 hours

### 3.3 Audio Storage
- [ ] Set up Supabase Storage bucket configuration
- [ ] Implement audio file upload to Supabase
- [ ] Create audio file naming convention
- [ ] Add upload progress indicators
- [ ] Handle upload errors

**Estimated Time:** 3-4 hours

### 3.4 Recording Metadata
- [ ] Create recordings table schema in Supabase
- [ ] Save recording metadata (timestamp, duration, file URL)
- [ ] Associate recordings with game sessions
- [ ] Implement auto-save on recording stop

**Estimated Time:** 2-3 hours

**Phase 3 Total Estimated Time:** 12-16 hours

---

## Phase 4: Player Management

### 4.1 Player Data Model
- [ ] Create players table schema in Supabase
- [ ] Define player data structure (name, jersey number, position)
- [ ] Set up relationships (players → teams → users)

**Estimated Time:** 1-2 hours

### 4.2 Player CRUD Operations
- [ ] Create player service/utilities
- [ ] Implement add player functionality
- [ ] Implement edit player functionality
- [ ] Implement delete player functionality
- [ ] Implement list players functionality

**Estimated Time:** 3-4 hours

### 4.3 Player Management UI
- [ ] Create player list screen
- [ ] Design player card/item component
- [ ] Create add/edit player form
- [ ] Add player search/filter functionality
- [ ] Implement player selection for tagging

**Estimated Time:** 4-5 hours

### 4.4 Player Tagging Integration
- [ ] Add player tagging to recording flow
- [ ] Implement multi-player selection
- [ ] Save player tags with recordings
- [ ] Display tagged players in recording list

**Estimated Time:** 2-3 hours

**Phase 4 Total Estimated Time:** 10-14 hours

---

## Phase 5: Game Session Management

### 5.1 Game Session Data Model
- [ ] Create game_sessions table schema
- [ ] Define session data structure (opponent, date, location)
- [ ] Set up relationships (sessions → recordings → users)

**Estimated Time:** 1-2 hours

### 5.2 Session CRUD Operations
- [ ] Create session service/utilities
- [ ] Implement create session functionality
- [ ] Implement edit session functionality
- [ ] Implement list sessions functionality
- [ ] Implement archive session functionality

**Estimated Time:** 3-4 hours

### 5.3 Session Management UI
- [ ] Create session list screen
- [ ] Design session card/item component
- [ ] Create new session form
- [ ] Add session details view
- [ ] Implement active session indicator

**Estimated Time:** 4-5 hours

### 5.4 Set Markers
- [ ] Add set marker functionality
- [ ] Create set marker UI component
- [ ] Save set markers with session
- [ ] Display set markers in session view

**Estimated Time:** 2-3 hours

### 5.5 Session-Recording Association
- [ ] Auto-associate recordings with active session
- [ ] Display recordings grouped by session
- [ ] Add session filter to recording list

**Estimated Time:** 2-3 hours

**Phase 5 Total Estimated Time:** 12-17 hours

---

## Phase 6: Post-Game Review Interface

### 6.1 Recording List/Dashboard
- [ ] Create recordings dashboard screen
- [ ] Display recordings chronologically
- [ ] Show basic recording info (timestamp, duration)
- [ ] Add loading states
- [ ] Implement pull-to-refresh

**Estimated Time:** 3-4 hours

### 6.2 Recording Detail View
- [ ] Create recording detail screen
- [ ] Add audio playback functionality
- [ ] Display recording metadata
- [ ] Show player tags
- [ ] Add manual notes section

**Estimated Time:** 4-5 hours

### 6.3 Filtering & Search
- [ ] Implement filter by player
- [ ] Implement filter by skill category
- [ ] Implement filter by feedback type
- [ ] Implement filter by set
- [ ] Add search functionality (keyword search)

**Estimated Time:** 4-5 hours

### 6.4 Recording Status Management
- [ ] Add status field to recordings (new/reviewed/addressed)
- [ ] Implement status update functionality
- [ ] Add status indicators in UI
- [ ] Create status filter

**Estimated Time:** 2-3 hours

**Phase 6 Total Estimated Time:** 13-17 hours

---

## Phase 7: AI Integration (Phase 2)

### 7.1 Transcription Setup
- [ ] Set up OpenAI Whisper API integration
- [ ] Create transcription service
- [ ] Implement audio-to-text conversion
- [ ] Handle transcription errors
- [ ] Save transcriptions to database

**Estimated Time:** 4-5 hours

### 7.2 AI Label Generation
- [ ] Set up OpenAI GPT-4 or Claude API integration
- [ ] Create AI analysis service
- [ ] Design prompt templates for label generation
- [ ] Implement skill category extraction
- [ ] Implement feedback type classification
- [ ] Implement player name extraction
- [ ] Implement urgency level detection
- [ ] Generate key phrase summaries

**Estimated Time:** 6-8 hours

### 7.3 AI Labels UI Integration
- [ ] Display AI labels in recording detail view
- [ ] Show labels in recording list (summary view)
- [ ] Add edit labels functionality
- [ ] Implement label validation/confirmation

**Estimated Time:** 3-4 hours

### 7.4 Searchable Transcription
- [ ] Make transcriptions searchable
- [ ] Highlight search matches
- [ ] Add transcription editing capability
- [ ] Save edited transcriptions

**Estimated Time:** 2-3 hours

**Phase 7 Total Estimated Time:** 15-20 hours

---

## Phase 8: Polish & Testing

### 8.1 Error Handling
- [ ] Add comprehensive error handling
- [ ] Create error boundary components
- [ ] Add user-friendly error messages
- [ ] Implement retry mechanisms

**Estimated Time:** 3-4 hours

### 8.2 Performance Optimization
- [ ] Optimize image/audio loading
- [ ] Implement pagination for lists
- [ ] Add caching where appropriate
- [ ] Optimize database queries

**Estimated Time:** 4-5 hours

### 8.3 UI/UX Refinement
- [ ] Polish UI components
- [ ] Add loading states everywhere
- [ ] Improve accessibility
- [ ] Add haptic feedback
- [ ] Test on multiple devices

**Estimated Time:** 5-6 hours

### 8.4 Testing
- [ ] Write unit tests for critical functions
- [ ] Test all user flows end-to-end
- [ ] Test error scenarios
- [ ] Performance testing
- [ ] User acceptance testing

**Estimated Time:** 6-8 hours

**Phase 8 Total Estimated Time:** 18-23 hours

---

## MVP Total Estimated Time: 93-124 hours (~12-16 weeks at 8 hours/week)

---

## Notes

- **Current Focus:** Phase 2 - Authentication & Onboarding
- **Next Phase:** Phase 3 - Core Recording Features
- **Dependencies:** Each phase builds on previous phases
- **Flexibility:** Tasks can be adjusted based on learnings and feedback

## Progress Tracking

- ✅ Completed
- 🔄 In Progress
- ⬜ Pending
