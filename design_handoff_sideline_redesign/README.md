# Handoff: Sideline — Coach Voice-Notes App Redesign

## Overview
Sideline is a mobile web app coaches use **during a game** to capture voice notes about players in under three seconds, then review an auto-generated **Game Analysis** afterward. This package is a full redesign of the app: a modern, single-brand (forest-green on cream) iOS-style experience covering auth, home, live capture, schedule, game detail, note review, game analysis, roster, and settings.

The goal of this handoff is to **update the existing gstack app so it looks and behaves like this prototype.**

## About the Design Files
The file in this bundle (`Sidelines.dc.html`) is a **design reference created in HTML** — a working prototype showing the intended look, layout, copy, and interactions. It is **not production code to copy directly.**

It is authored in a proprietary "Design Component" (DC) format: markup inside `<x-dc>` with a `class Component extends DCLogic` logic block (a thin React-like layer). **Do not try to run or port the DC runtime.** Read it as a spec: the template shows structure + exact inline styles, and the logic class shows state, navigation, and mock data.

**Your task:** recreate these screens in the gstack codebase using its existing framework, component patterns, routing, and state management. Match the visual design pixel-closely; adapt the implementation to the app's real conventions and data layer.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and interactions are final. Recreate the UI faithfully. The only things that are mock/illustrative are the sample data (rosters, notes, opponents) and the simulated AI (transcription, roster/schedule scanning) — wire those to real services.

## Design Tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| Brand green | `#40613A` | Primary buttons, active states, accents, avatars |
| Brand green (hover) | `#34502F` | Button hover |
| Green tint bg | `#EAEFE4` | Avatar/chip backgrounds, date chips |
| Green tint bg (today) | `#D8E6CC` | "Today" date chip |
| Green light ink | `#8CA97D` | Secondary green accents |
| Green pale | `#A9C39B` | On-dark labels |
| Green link | `#6FA76A` | Links on dark (auth screen) |
| Ink / near-black | `#16181D` | Primary text, dark hero cards |
| Muted text | `#8A8F94` | Secondary text |
| Faint text | `#B0B4B8` | Tertiary text |
| App background | `#F2F1EC` | Screen background (cream) |
| Card white | `#FFFFFF` | Cards, sheets |
| Hover cream | `#FBFAF7` | Card hover |
| Hairline | `#F0EFEA` | Row dividers |
| Border | `#E7E5DF` / `#E3E1DB` | Card/input borders |
| Record red | `#FF453A` | Active recording state |
| Danger | `#C24545` | Sign out |
| Auth background | `#000000` | Auth screen only |

Analysis-chart accents: `#40613A`, `#8CA97D`, `#C8B26B` (donut); `#40613A` bars.

### Typography
- **Font family:** system stack — `-apple-system, BlinkMacSystemFont, "SF Pro Text"/"SF Pro Display", "Segoe UI", sans-serif`.
- **Scale (px / weight):** screen title 22/800; hero opponent 24/800; big numerals 20–28/800; body 15–16/600–700; secondary 13–14/500–600; labels 12/700 with `letter-spacing:.12em` uppercase; section eyebrows same.
- **Letter-spacing:** titles `-.3px` to `-.5px`; uppercase labels `.12em`.

### Spacing / shape
- Screen padding: `0 20px 40px` with a **sticky 62px top spacer** (`background:#F2F1EC; margin:0 -20px`) that keeps content clear of the iOS status bar while scrolling.
- Card radius: 18–24px. Sheet radius: 28px top corners. Button radius: 16–18px. Chip radius: 10–14px.
- Card shadow: `0 1px 3px rgba(0,0,0,.05)`; button glow (record): `0 12px 40px rgba(64,97,58,.4)`.
- Gaps: use flex/grid `gap` (8–22px), not margins.

### Motion
- `fadeIn` .25s on screen enter; `sheetIn` .3s `cubic-bezier(.2,.9,.3,1)` for bottom sheets; `toastIn` .35s for capture confirmation; `wave` bar animation while recording; `pulse` ring on the record button; `spin` for processing spinners.

## Screens / Views

Navigation is a single-stack `screen` state. Entry screen = **Auth**.

### 1. Auth  (`screen: 'auth'`)
- Black background, light status bar.
- Top-left "‹ Back to site" link (green `#6FA76A`).
- Centered: whistle logo image (`assets/whistle.png`, ~220px wide), "SIDELINE" wordmark (56px/900, `#5C8A57`), "Welcome to Sideline" (30px/800 white), subtitle (16px `#A3A8AE`, max-width 300).
- Green **Get Started** button (full width, 60px, radius 16). Below: "Already have an account? **Login**".
- Back to site / Get Started / Login all enter the app → Home.

### 2. Home  (`screen: 'home'`)
- Header: "Coach Rajesh" (28/800, no-wrap) + date eyebrow; right side three round 44px icon buttons → Schedule (calendar), Roster (people), Settings (gear).
- **Game Day hero** (dark `#16181D` card, `flex:none` so it never shrinks): eyebrow "GAME DAY"/"NEXT GAME" with radial green glow, "vs. {opponent}", "{Today · time · venue}", green **Start Capture** button with mic icon → Live capture.
- **Schedule** section: "+ Add game" link; upcoming game rows (date chip + opponent + home/away tag).
- **Recent games** section: rows with initials tile, "vs. {opponent}", "{date} · {n} notes", chevron → Game detail. (No coverage ring, no player count here — removed intentionally.)

### 3. Live Capture  (`screen: 'live'`)
- Light theme (`#F2F1EC`). **The entire screen is the tap target** — tap anywhere to start recording, tap anywhere again to stop (a genuine hold also works walkie-talkie style). Capture mode is always tap-to-talk; there is no mode setting.
- Top row: "End game" (→ Game detail) + "LIVE · mm:ss" with red dot. Both End-game and the set chips call `stopPropagation` so they don't trigger recording.
- "vs. {opponent}" title. **Set switcher**: chips 1–5, active = green.
- Center: idle shows breathing hint text; recording shows animated red waveform bars. Big **300px circular record button** (purely visual, `pointer-events:none`) — green when idle ("Tap anywhere"), red + pulse when recording ("Tap anywhere to stop"), mic/stop icon.
- After stop: "Transcribing…" spinner (~1.2s simulated) → a toast card slides up showing the captured note (number, title, "player · tag · set", green check), auto-dismiss ~3.2s.
- **No bottom stats bar** (removed intentionally).

### 4. Schedule  (`screen: 'schedule'`)
- Back to Home. Title "Schedule" + "{n} games this season".
- **Month pills** derived dynamically from the months present in the schedule data (do NOT hardcode months). Each pill: month abbr + game count; selected = green fill.
- Game cards: 50×56 date chip (MON / day / weekday), "vs. {opponent}", "{date · time · venue}", home/away tag. "Today" chip uses `#D8E6CC`.
- Empty state card (calendar icon) when a month has no games.
- Green **Add game** button (+ icon) → Add Game sheet.

### 5. Game Detail  (`screen: 'game'`)
- Back to Home. "vs. {opponent}", "{date} · Regular season".
- Coverage summary card: ring showing % of roster with notes, "{n} notes · {x} of {total} players", hint.
- Dark **Game Analysis** button (bar-chart icon) → Analysis.
- Notes grouped by **SET**; each note row: play-triangle tile, title, player chip (green), tag chip, duration, chevron → Note sheet.

### 6. Note Sheet  (bottom sheet over Game Detail)
- Drag handle, title, close button. Player/tag/set chips.
- Audio row: green play/pause button, progress bar (animates during playback), "m:ss / total".
- TRANSCRIPT block (quoted, on `#F9F8F5`). MANUAL NOTES textarea.

### 7. Game Analysis  (`screen: 'report'`)
- Back to Game Detail. Title "Game Analysis" + "vs. {opponent} · N notes → 3 priorities".
- Dark hero: "TUESDAY, DO ONE THING" + a single concrete drill + evidence sentence.
- **AT A GLANCE** charts row: (a) **donut** of notes by type (Corrections/Positioning/Praise) with rounded segment caps + small gaps, total count centered as big numeral with "NOTES" beneath, legend below; (b) **column chart** "Notes by set".
- **PLAYERS** cards (no priority/watch/praise badges — removed): avatar (green), name, "{pos} · {n} notes", insight paragraph, and a green "Drill: …" suggestion pill.
- **FOCUS AREAS** progress bars. **TUESDAY PRACTICE PLAN** numbered drill rows.

### 8. Roster  (`screen: 'roster'`)
- Back to Home. Title + "Names power transcription accuracy".
- Two buttons: green **+ Add player** (→ Add Player sheet), outline **Scan a roster** (→ Scan sheet).
- Player rows: **green** avatar (all the same green — not multicolored), name, "{position} · {class year}". Class year is **Freshman / Sophomore / Junior / Senior** (not Grade 9–12), so it works for college too. No per-player note count.

### 9. Add Player Sheet
- Fields: NAME (text), JERSEY # (numeric, 2 digits), POSITION (chips: Outside Hitter, Setter, Libero, Middle Blocker, Opposite, DS), CLASS YEAR (chips: Freshman/Sophomore/Junior/Senior).
- Green save button, disabled (gray) until name + number present; label "Add {firstName}".

### 10. Scan Roster Sheet
- Pick state: dashed drop card (camera icon) + **Take photo** and **Upload screenshot** buttons.
- Processing spinner (~1.6s simulated) → Review list where each detected player row toggles include/exclude (green check ↔ gray ring). Confirm "Add N players".

### 11. Add Game Sheet
- Segmented toggle: **Enter manually** vs **Scan schedule**.
- Manual: OPPONENT, DATE, TIME inputs; LOCATION chips (Home/Away); green "Add {opponent}".
- Scan: same photo/upload → processing → review/exclude → "Add N games". New games' months auto-create pills on the Schedule screen.

### 12. Settings  (`screen: 'settings'`)
- Back to Home. Profile card (initials avatar, name, email).
- **MY TEAMS**: list of teams (a coach can have several — new season teams, club teams), active one has a green filled check + green avatar; tap to switch. "Add a team" row appends and activates a new team. Below, an "{ACTIVE TEAM NAME}" section shows Sport + Roster (→ Roster).
- **ACCOUNT**: Change email (shows current email), Change password — both chevron rows.
- Red **Sign out** button → returns to Auth.
- (CAPTURE section with Capture mode + Auto set detection was **removed**.)

## Interactions & Behavior
- **Live capture** is the core interaction: whole-screen tap target, tap→record→tap→stop, simulated transcribe delay, then a confirmation toast. Replace the mock queue/transcription with the real speech-to-text + attribution pipeline.
- **Set switcher** is manual (no auto-set detection).
- **Scanning** (roster + schedule) is simulated with timeouts; wire to a real OCR/vision extraction step returning a reviewable list.
- **Playback** progress bar is a 1s-interval timer against the note duration; replace with real audio element.
- **Team switching** changes the active team; roster/schedule/games should scope to it in the real app.

## State Management
Key state: `screen` (router), `activeGameId`, `activeNoteId`, live capture (`liveSec`, `liveSet`, `recording`, `processing`, `liveNotes`, `toast`), `scheduleMonthIdx`, audio (`playing`, `playSec`), schedule building (`extraGames`, add-game form fields, scan stage), roster building (`extraPlayers`, add-player form fields, scan stage), `teams` + `activeTeam`. Recreate with the app's real router + store; derive month pills and coverage from data, never hardcode.

## Assets
- `assets/whistle.png` — the Sideline whistle logo (green whistle + white lanyard on transparent), used on the Auth screen. Provided in this bundle. Use the app's real brand asset if a vector version exists.
- All icons are inline SVG (feather-style stroke icons) — reproduce with the codebase's icon set.

## Files
- `Sidelines.dc.html` — the full prototype (all screens, styles, mock data, interactions). Primary reference.
- `assets/whistle.png` — auth logo.
