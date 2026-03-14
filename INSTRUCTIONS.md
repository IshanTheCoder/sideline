# Sideline App — Comprehensive Improvement Instructions

> A prioritized, file-specific engineering plan to make Sideline a polished, App Store-ready volleyball coaching app.

---

## Phase 0 — Security (Do Before Anything Else)

### 0.1 Move API Keys to a Server-Side Proxy

**Problem:** The Groq API key is bundled into the client via `EXPO_PUBLIC_GROQ_API_KEY` (`lib/transcription.js:5`, `lib/labelGeneration.js:9`). Any user can extract it from the JS bundle, exhaust your quota, or abuse it. Apple/Google reviewers may also flag it.

**Files to change:**
- `lib/transcription.js` — remove direct Groq fetch, call your own backend instead
- `lib/labelGeneration.js` — same
- Create a new Supabase Edge Function (e.g., `supabase/functions/transcribe/index.ts`) that:
  1. Accepts audio file or storage path from authenticated client
  2. Verifies the Supabase JWT (user is who they claim)
  3. Calls Groq Whisper / Llama on the server side
  4. Returns the result to the client
- Create a second Edge Function `supabase/functions/generate-label/index.ts` for label generation
- Store `GROQ_API_KEY` as a Supabase Edge Function secret (not in the client env)
- Remove `EXPO_PUBLIC_GROQ_API_KEY` from `.env` and `app.json`

**Why this matters:** This is the single most important change. A leaked API key can generate unlimited costs and is grounds for App Store rejection.

**Supabase anon key note:** The Supabase anon key (`EXPO_PUBLIC_SUPABASE_ANON_KEY` in `lib/supabase.js:9`) is designed to be public — it's restricted by Row Level Security. However, verify that RLS policies are enabled on all tables (`profiles`, `teams`, `game_sessions`, `players`, `recordings`). If RLS is not enabled, any user can read/write any other user's data.

---

## Phase 1 — Critical Data & Logic Fixes

### 1.1 Persist Active Session to Survive App Kills

**Problem:** `contexts/ActiveSessionContext.jsx` stores the game session in `useState` only. If iOS kills the app in the background (very common during a volleyball match when the coach locks their phone), the active session is lost — opponent name, game ID, set selections, everything.

**Files to change:**
- `contexts/ActiveSessionContext.jsx`

**Instructions:**
1. Import `AsyncStorage` from `@react-native-async-storage/async-storage`
2. On `setActiveSession`, also write to `AsyncStorage` under key `@sideline/activeSession`
3. On provider mount, read from `AsyncStorage` and rehydrate state
4. On `clearActiveSession`, remove the key from `AsyncStorage`
5. Serialize `Date` objects to ISO strings for storage, parse them back on rehydrate

**Implementation pattern:**
```js
useEffect(() => {
  AsyncStorage.getItem('@sideline/activeSession').then(raw => {
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.date = new Date(parsed.date);
      parsed.startedAt = new Date(parsed.startedAt);
      setActiveSession(parsed);
    }
  });
}, []);

// In setActiveSession wrapper:
const updateSession = (session) => {
  setActiveSession(session);
  if (session) {
    AsyncStorage.setItem('@sideline/activeSession', JSON.stringify(session));
  } else {
    AsyncStorage.removeItem('@sideline/activeSession');
  }
};
```

### 1.2 Fix the 10-Second setTimeout Race Condition

**Problem:** `app/(tabs)/record.jsx:414-436` waits 10 seconds before generating labels, hoping all transcriptions finish. They may not — transcription time is variable.

**Files to change:**
- `app/(tabs)/record.jsx` — remove the `setTimeout` block (lines 406-436)
- `lib/recordingProcessing.js` — `processRecording()` already generates labels per-recording at line 108. This is the correct behavior. The batch `generateLabelsForGameSession` call is redundant for recordings that processed successfully.

**Instructions:**
1. In `record.jsx`, remove the entire `setTimeout(() => { generateLabelsForGameSession(...) }, 10000)` block
2. The per-recording label generation in `processRecording()` (lines 103-123) already handles this correctly
3. Keep `generateMissingLabels()` available for the "Generate Labels" button on the game detail screen (for cases where processing failed)
4. After removing the setTimeout, the `handleDonePress` function should simply:
   - Stop any active recording
   - Clear the session
   - Navigate to the review screen
5. Optionally show a brief toast: "Processing recordings in background..." instead of the misleading "Waiting for transcriptions to complete" alert

### 1.3 Deduplicate `getOrCreateDefaultTeam`

**Problem:** Identical implementations exist in `lib/recording.js:152-195` and `lib/gameSessions.js:4-41`.

**Instructions:**
1. Remove the `getOrCreateDefaultTeam` function from `lib/recording.js`
2. Import it from `lib/gameSessions.js` instead:
   ```js
   import { getOrCreateDefaultTeam } from './gameSessions';
   ```
3. Update `getOrCreateDefaultGameSession` in `lib/recording.js` to use the imported version

### 1.4 Store `matchType` in the Database

**Problem:** `record-details.jsx:29,58-61,84-88` collects matchType but `createGameSession()` in `gameSessions.js:44` never saves it.

**Instructions:**
1. Add a `match_type` column to the `game_sessions` table via Supabase migration:
   ```sql
   ALTER TABLE game_sessions ADD COLUMN match_type TEXT;
   ```
2. Update `createGameSession` in `lib/gameSessions.js` to accept and insert `matchType`:
   ```js
   export const createGameSession = async ({ userId, opponentName, date, location, matchType }) => {
     // ...
     const { data, error } = await supabase
       .from('game_sessions')
       .insert({
         team_id: teamId,
         opponent_name: opponentName,
         date: date.toISOString().split('T')[0],
         location: location ?? null,
         match_type: matchType ?? null,
       })
       .select('id')
       .single();
   ```
3. Update `record-details.jsx` to pass `matchType` to `createGameSession`:
   ```js
   const { id, error } = await createGameSession({
     userId: user.id,
     opponentName: trimmedOpponent,
     date: gameDate,
     matchType,
   });
   ```
4. Display `match_type` on the game review screens

### 1.5 Fix `deleteGameForUser` to Also Delete the Game Session Row

**Problem:** `lib/recording.js:708-729` deletes recordings but leaves the `game_sessions` row orphaned.

**Instructions:**
After the recording deletion loop, add:
```js
// Delete the game session itself
if (gameSessionId !== 'unassigned') {
  await supabase.from('game_sessions').delete().eq('id', gameSessionId);
}
```

---

## Phase 2 — Navigation & UX Overhaul

### 2.1 Replace Hamburger Menu + Explore Tab with a Proper Tab Bar

**Problem:** The app has 2 visible tabs (Home, Explore) with 5 hidden screens behind a hamburger menu. This violates iOS HIG, hides core features, and the Explore tab is unmodified Expo boilerplate.

**Files to change:**
- `app/(tabs)/_layout.jsx` — redesign tab configuration
- `components/HamburgerMenu.jsx` — delete this file
- `app/(tabs)/explore.jsx` — delete this file
- `app/(tabs)/index.jsx` — remove hamburger menu references

**New tab bar configuration (`_layout.jsx`):**
```jsx
<Tabs screenOptions={{
  tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
  headerShown: false,
  tabBarButton: HapticTab,
}}>
  <Tabs.Screen name="index" options={{
    title: 'Home',
    tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
  }} />
  <Tabs.Screen name="record-details" options={{
    title: 'Record',
    tabBarIcon: ({ color }) => <IconSymbol size={24} name="mic.fill" color={color} />,
  }} />
  <Tabs.Screen name="review/index" options={{
    title: 'Games',
    tabBarIcon: ({ color }) => <IconSymbol size={24} name="list.bullet" color={color} />,
  }} />
  <Tabs.Screen name="roster" options={{
    title: 'Roster',
    tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.2.fill" color={color} />,
  }} />
  <Tabs.Screen name="settings" options={{
    title: 'Settings',
    tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} />,
  }} />
  {/* Hide the recording screen itself - it's accessed from record-details */}
  <Tabs.Screen name="record" options={{ href: null }} />
</Tabs>
```

**Home screen cleanup (`index.jsx`):**
1. Remove `HamburgerMenu` import and component
2. Remove `menuVisible` state
3. Remove the hamburger button from the header
4. Keep the settings gear icon in header (or remove if settings is now a tab)

**Delete these files:**
- `components/HamburgerMenu.jsx`
- `app/(tabs)/explore.jsx`
- `components/parallax-scroll-view.jsx` (only used by explore)
- `components/hello-wave.jsx` (Expo boilerplate, unused)

### 2.2 Add First-Run Onboarding Flow

**Problem:** New users land on an empty dashboard with no guidance.

**Files to create:**
- `app/(tabs)/onboarding.jsx` (or a modal-based approach)

**Instructions:**
1. Add a `has_completed_onboarding` field to the `profiles` table (boolean, default false)
2. In `app/_layout.jsx`, after auth check, check if `profile.has_completed_onboarding === false`
3. If false, show the onboarding flow before the main app
4. Onboarding screens (can be a simple swipeable modal or a stack):
   - **Welcome:** "Welcome to Sideline! Record coaching notes during games and get AI-powered feedback."
   - **Sport confirmation:** Confirm volleyball (or future: pick sport). Pre-select based on signup data if available.
   - **Roster setup:** "Add your players so Sideline can recognize names in your recordings." Offer CSV import or manual add. Allow skip.
   - **Quick tutorial:** Show the Record → Review flow with 3 annotated screenshots or a simple animation.
5. On completion, update `profiles.has_completed_onboarding = true`

### 2.3 Remove the Back Button from Tab-Level Screens

**Problem:** `roster.jsx:215-217` and `settings.jsx` have back buttons, but as tab screens they should rely on tab navigation. Back buttons are only appropriate for pushed screens.

**Instructions:**
- Remove the back button and `router.back()` from `roster.jsx` header
- Same for `settings.jsx` if it has one
- Keep back buttons on screens that are pushed onto a stack (like `record.jsx`, `review/game/[id].jsx`)

---

## Phase 3 — Architecture & Code Quality

### 3.1 Break Up the 1,573-Line Game Detail Screen

**Problem:** `app/(tabs)/review/game/[id].jsx` is a massive monolith that handles recording list, audio playback, transcription display, note editing, label generation, volleyball stats, and multiple modals.

**Instructions — Extract these components:**

1. **`components/game/AudioPlayerControls.jsx`**
   - Props: `audioUrl`, `isPlaying`, `positionMs`, `durationMs`, `onPlayPause`, `onSeek`
   - Move all audio playback state and logic here
   - Use `expo-av` internally

2. **`components/game/RecordingCard.jsx`**
   - Props: `recording`, `isPlaying`, `onPlay`, `onOpenDetail`, `onDelete`
   - Renders one recording row: label, transcription preview, duration, play button

3. **`components/game/RecordingDetailModal.jsx`**
   - Props: `recording`, `visible`, `onClose`, `onSaveNotes`
   - Full transcription text, notes editing, audio player, set markers

4. **`components/game/VolleyballStatsPanel.jsx`**
   - Props: `stats` (from `aggregateVolleyballStats`)
   - Renders skill categories, positions, feedback types, player mentions

5. **`components/game/FilterBar.jsx`**
   - Props: `filters`, `onFilterChange`, `options`
   - Skill/player/feedback filter chips

**After extraction, `[id].jsx` should be ~200-300 lines:** just data fetching, state coordination, and layout composition.

### 3.2 Resolve the Theme Architecture Conflict

**Problem:** `contexts/ThemeContext.jsx` hard-codes dark mode, but components use `useColorScheme()` from `hooks/use-color-scheme.js` which reads the system preference. This creates visual conflicts.

**Option A — Commit to dark mode (simpler):**
1. In `hooks/use-color-scheme.js`, always return `'dark'`
2. Remove the conditional `colorScheme === 'dark' ? ... : ...` patterns — just use dark values
3. In `app/_layout.jsx`, keep `DarkTheme` for `NavigationThemeProvider`
4. Remove `ThemeContext.jsx` since it's now dead code, or repurpose it later

**Option B — Support both themes (better for users):**
1. In `ThemeContext.jsx`, read system `useColorScheme()` and allow user override
2. Store theme preference in `AsyncStorage`
3. Replace all `useColorScheme()` calls in components with `useTheme()` from your context
4. In `app/_layout.jsx`, use the context's theme to pick `DarkTheme` or `DefaultTheme`

**Recommendation:** Option A for now (ship faster), Option B as a future enhancement.

### 3.3 Commit to Volleyball or Build Sport Abstraction

**Problem:** Sport selection UI exists (`SportSelectionModal`, `SportPicker`, `SportButtonSelector`) but the entire AI pipeline is hardcoded for volleyball.

**Option A — Commit to volleyball (recommended for launch):**
1. Remove `components/SportSelectionModal.jsx`
2. Remove `components/SportPicker.jsx`
3. Remove `components/SportButtonSelector.jsx`
4. Remove sport selection from `settings.jsx`
5. Update app branding/description to emphasize volleyball
6. Remove the `sport` column from profiles or hard-set it to `'volleyball'`

**Option B — Build sport abstraction (future):**
1. Create `lib/sports/index.js` that exports sport-specific modules
2. Each sport module provides: `vocabulary`, `rules`, `systemPrompt`, `skillCategories`, `positions`
3. `labelGeneration.js` reads the user's sport preference and loads the appropriate module
4. Start with volleyball, add basketball/soccer later

### 3.4 Fix the Random Greeting Flicker

**Problem:** `app/(tabs)/index.jsx:167-176` — `getGreeting()` runs on every render, causing the greeting to change randomly.

**Fix:**
```js
// Replace getGreeting with a stable, time-based greeting
const greeting = useMemo(() => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}, []); // Only compute once per mount
```

---

## Phase 4 — Reliability & Performance

### 4.1 Add Offline Recording Queue

**Problem:** Recording upload requires network (`lib/recording.js:56`). Gyms often have poor connectivity.

**Instructions:**
1. Create `lib/offlineQueue.js`:
   - On `stopRecording`, if upload fails with a network error, save the recording metadata + local file URI to `AsyncStorage` under `@sideline/pendingUploads`
   - Show the user a badge/indicator: "1 recording pending upload"
2. Create a `useOfflineSync` hook:
   - On app foreground or network reconnect (`@react-native-community/netinfo`), check for pending uploads
   - Process the queue: upload audio, create DB record, start transcription
   - Remove from queue on success
3. In `record.jsx`, wrap the upload in a try/catch that falls back to the queue

### 4.2 Strip Console Logs for Production

**Problem:** Every file has extensive `console.log` with emoji-prefixed debug output, user emails, API URLs, and storage paths.

**Instructions:**
1. Install `babel-plugin-transform-remove-console` as a dev dependency
2. Add to `babel.config.js`:
   ```js
   module.exports = function(api) {
     api.cache(true);
     return {
       presets: ['babel-preset-expo'],
       plugins: [
         ...(process.env.NODE_ENV === 'production'
           ? ['transform-remove-console']
           : []),
       ],
     };
   };
   ```
3. This automatically strips all `console.*` calls from production builds

### 4.3 Add Proper Error Boundaries

**Instructions:**
1. Create `components/ErrorBoundary.jsx` using React's `componentDidCatch`
2. Wrap the main app in `app/_layout.jsx` with the error boundary
3. Show a friendly "Something went wrong" screen with a "Reload" button instead of a crash

---

## Phase 5 — Polish & App Store Readiness

### 5.1 Fix Hard-Coded Colors for Dark Mode

**Problem:** Many components have hard-coded light-mode colors that clash with the dark theme:
- `index.jsx:379` — `settingsButton` has `backgroundColor: '#FFFFFF'` (white circle on dark background)
- `index.jsx:412` — `startRecordingButton` has `backgroundColor: '#FFFFFF'`
- `index.jsx:435` — `startRecordingText` has `color: '#1A1A1A'`

**Instructions:**
Replace hard-coded colors with theme-aware values from `constants/theme.js` or inline conditionals. Go through every screen and check for `#FFFFFF`, `#1A1A1A`, `#F5F5F5` hard-coded values.

### 5.2 Add Loading/Progress States for Transcription

**Problem:** After recording, transcription happens silently in the background. Users on the game detail screen see "No transcription" with no indication that processing is underway.

**Instructions:**
1. Use the `status` field on recordings (`new` → `processing` → `complete`)
2. Actually update status to `'processing'` when transcription starts (currently not done in `processRecording`)
3. On the game detail screen, show a pulsing "Transcribing..." indicator for recordings with `status: 'processing'`
4. Auto-refresh recordings every 5-10 seconds while any recording has `status !== 'complete'`

### 5.3 Add Haptic Feedback to Key Interactions

**Instructions:**
- Record button press: medium impact haptic
- Recording stop: success notification haptic
- Set selector: light selection haptic
- Delete confirmations: warning notification haptic
- Use `expo-haptics` (already in the project via `haptic-tab.jsx`)

### 5.4 Add App Icon, Splash Screen, and Launch Branding

**Instructions:**
- Replace the default Expo splash screen and icon in `assets/`
- Update `app.json` with proper app icon, adaptive icon, and splash config
- Ensure the splash screen background matches the app's dark theme

### 5.5 Keyboard Avoidance on Forms

**Problem:** `record-details.jsx` and `roster.jsx` text inputs may be covered by the keyboard on smaller devices.

**Instructions:**
- Wrap form content in `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`
- Add `ScrollView` inside for scrollable forms

### 5.6 Accessibility

**Instructions:**
- Add `accessibilityLabel` and `accessibilityRole` to all interactive elements
- Ensure the record button has `accessibilityLabel="Record coaching note"` and `accessibilityHint="Double tap to start recording"`
- Test with VoiceOver (iOS) and TalkBack (Android)

---

## Phase 6 — Cleanup & Debt Paydown

### 6.1 Remove Unused Boilerplate Files

Delete these Expo template files that are not used by the app:
- `components/hello-wave.jsx`
- `components/parallax-scroll-view.jsx` (only used by `explore.jsx` which should be deleted)
- `components/external-link.jsx` (only used by `explore.jsx`)
- `components/ui/collapsible.jsx` (only used by `explore.jsx`)
- `scripts/reset-project.js`
- `lib/testSupabase.js`

### 6.2 Remove Test Functions from Production Libraries

**Files:**
- `lib/transcription.js:164-176` — `testTranscription()` — remove
- `lib/labelGeneration.js:208-222` — `testLabelGeneration()` — remove
- `lib/recordingProcessing.js:460-480` — `testProcessRecording()` — remove

These should live in a test file, not in production modules.

### 6.3 Remove Backward-Compatibility `user_id` Fallbacks

**Problem:** Throughout `lib/recording.js` and `lib/recordingProcessing.js`, there are fallback queries that retry without `user_id` if the column doesn't exist. This was a migration shim.

**Instructions:**
- If the `recordings` table now has a `user_id` column (confirm in Supabase dashboard), remove all `isMissingColumnError` checks and fallback queries
- If it doesn't, add the column and backfill it, then remove the fallbacks
- This removes ~100 lines of dead code and simplifies every database query

### 6.4 Add TypeScript

**Instructions:**
- Rename `.jsx` files to `.tsx` and `.js` to `.ts` incrementally
- Start with `lib/` files (data layer) where type safety provides the most value
- Define interfaces for `Recording`, `GameSession`, `Player`, `Profile`, `AiLabels`
- This prevents the class of bugs where fields are misspelled or missing

---

## Implementation Priority Order

| Week | Phase | Tasks | Impact |
|------|-------|-------|--------|
| 1 | 0 | Move API keys server-side | Security |
| 1 | 1.1 | Persist active session | Data integrity |
| 1 | 1.2 | Fix setTimeout race condition | Correctness |
| 1 | 2.1 | Tab bar + remove hamburger + delete Explore | First impression |
| 2 | 1.4 | Store matchType | User trust |
| 2 | 1.5 | Fix game deletion | Data integrity |
| 2 | 2.2 | Onboarding flow | Retention |
| 2 | 3.4 | Fix greeting flicker | Polish |
| 3 | 3.1 | Break up game detail screen | Maintainability |
| 3 | 3.2 | Resolve theme conflict | Visual consistency |
| 3 | 3.3 | Commit to volleyball branding | Clarity |
| 3 | 4.2 | Strip console logs | Performance + security |
| 4 | 4.1 | Offline recording queue | Reliability |
| 4 | 5.1-5.6 | Polish & accessibility | App Store readiness |
| 5 | 6.1-6.4 | Cleanup & TypeScript | Long-term health |

---

## Key Principle

Every change should be evaluated through the lens of a volleyball coach courtside during a match:
- **They have 30 seconds between plays.** The UI must be fast and obvious.
- **They're in a noisy gym.** Transcription errors need graceful handling.
- **Their phone might have weak signal.** Offline support is not optional.
- **They care about one sport.** Don't confuse them with multi-sport UI they can't use.
- **They'll evaluate the app in 60 seconds.** If they see Expo boilerplate or an empty dashboard, they'll delete it.
