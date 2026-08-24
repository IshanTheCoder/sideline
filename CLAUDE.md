# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Sideline

## Overview

Sideline is an AI-powered coaching assistant designed for live sports.

The core idea is simple:

During games, coaches notice dozens of small observations that are forgotten by the end of the match. Sideline allows coaches to quickly record short voice notes without looking away from the game. AI then transcribes, categorizes, organizes, and summarizes those observations for later review.

Our target users are high school, club, and college coaches.

The product is currently optimized for volleyball but is intentionally designed so it can eventually support any sport.

The landing page is at:

https://tapsideline.com

The application is separate from the marketing site.

---

# Current Stack

Frontend
- React Native
- Expo
- Expo Router

Backend
- Supabase
    - Authentication
    - PostgreSQL
    - Storage
    - Row Level Security

AI — all through Groq's API (`lib/groqClient.js`, hit directly from the client, no backend AI layer)
- `whisper-large-v3` for transcription
- Llama / GPT-OSS (`openai/gpt-oss-120b` with Llama fallbacks) for label generation and post-game summaries
- Llama vision models for reading rosters and schedules out of uploaded screenshots

Hosting
- Cloudflare Pages (web, static export)
- EAS (Expo Application Services) for iOS/Android builds

Languages
- JavaScript / JSX

Version Control
- Git + GitHub

---

# Development Commands

The Expo app lives in `sideline/` — run all commands from there, not the repo root.

- Install deps: `npm install`
- Start the dev server: `npm start` (or `npx expo start`), then pick a platform from the Expo CLI menu
- Run directly on one platform: `npm run ios` / `npm run android` / `npm run web`
- Lint: `npm run lint` (`expo lint` — ESLint via `eslint-config-expo`)
- Run all tests: `npm test` (Vitest, one-shot `vitest run`)
- Run a single test file: `npx vitest run lib/labelGeneration.test.js`
- Web production build (what Cloudflare Pages deploys): `npx expo export --platform web`

Required env vars (see `.env`): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GROQ_API_KEY`.

Tests live next to the module they cover (e.g. `lib/labelGeneration.test.js` beside `lib/labelGeneration.js`) — all current tests are under `lib/`, covering the AI pipeline, transcript correction, summary synthesis, and nav history.

---

# Codebase Architecture

### Routing (Expo Router, file-based, under `sideline/app/`)

Three disjoint route trees, plus a few root-level files:

- `(marketing)/` — the public, web-only marketing site at tapsideline.com (`index.jsx` = `/`, `about.jsx` = `/about`). Plain HTML tags styled with `marketing.css` (via react-native-web), not RN components — `marketing.css` mirrors `constants/brand.js`'s color tokens as CSS variables, so keep the two in sync when changing brand colors. `(marketing)/_layout.jsx` wraps `<Slot/>` with the shared nav and footer. On native this whole group immediately `<Redirect>`s to `/(auth)/welcome` — native users never see the marketing site.
- `(auth)/` — `welcome.jsx`, `login.jsx`, `signup.jsx`, `callback.jsx` (OAuth redirect target). Native RN screens, reached when signed out.
- `(tabs)/` — the signed-in app shell (bottom tab navigator): `app.jsx` (home), `record.jsx`, `roster.jsx`, `schedule.jsx`, `settings.jsx`, and `review/` (games list `index.jsx`, a game's recordings `review/game/[id].jsx`, and the AI-synthesized post-game summary `review/game/summary/[id].jsx`).
- Root-level files (`_layout.jsx`, `+not-found.jsx`, `modal.jsx`, `reset-password.jsx`, `privacy.jsx`) sit outside all three groups, for screens that must be reachable independent of the current route group or auth state (a password-reset deep link, the privacy policy linked from both the marketing footer and the native signup screen). The root `_layout.jsx`'s auth-redirect effect explicitly exempts `(marketing)`, `+not-found`, and `privacy` (`segments[0] === ...` checks) from the signed-out-redirect-to-`/welcome` behavior — any new public root-level route needs the same exemption added there.

`@/` is a path alias for the `sideline/` root (see `jsconfig.json`), used for most imports (`@/constants/brand`, `@/lib/supabase`, etc.).

### AI pipeline — entirely client-side, no backend orchestration

`supabase/functions/process-recording/` exists as a directory but is empty — not implemented. All AI processing happens in the RN client:

```
lib/recordingProcessing.js (processRecording)
  → lib/transcription.js    → lib/groqClient.js → Groq Whisper
  → lib/labelGeneration.js  → lib/groqClient.js → Groq chat model
  → recordings table (transcription, ai_labels, status columns)
```

- `lib/groqClient.js` calls `api.groq.com` directly with `EXPO_PUBLIC_GROQ_API_KEY`; both transcription and label generation fall back through a chain of models if one fails/rate-limits.
- The team roster is fetched before transcription (`lib/roster.js`) and used twice: to prime the Whisper prompt with player names/numbers, and afterward to fuzzy-correct the transcript (`lib/volleyballVocabulary.js`'s correction helpers — "number four" → the matching roster name).
- `lib/labelGeneration.js` also classifies each note as `isOpponentNote`; this drives the summary screen's split between the coach's own team and an opponent-scouting section (`lib/summarySynthesis.js`).
- The same client-side Groq-vision pattern is reused for `lib/rosterScreenshotImport.js` and `lib/scheduleScreenshotImport.js` (reading a roster or schedule out of an uploaded screenshot) via `lib/visionImport.js`.
- Custom coach-defined skill/position/feedback "buckets" (`lib/customBuckets.js`) layer on top of the built-in volleyball vocabulary and get folded into the label-generation prompt.

### Data model (Postgres via Supabase, `supabase-setup.sql` + `supabase-migrations/*.sql`)

`profiles` (1:1 with `auth.users`) → `teams` (`coach_id`) → `game_sessions` (`team_id`) → `players` and `recordings` (`recordings.game_session_id`, also carries its own `user_id`). Row Level Security scopes every table back to `teams.coach_id = auth.uid()`, so a coach only ever sees their own teams' data. `recordings.ai_labels` is a JSON string (not JSONB) with a shape defined by `lib/volleyballVocabulary.js`'s `serializeAiLabels`/`parseAiLabels`.

### Design tokens

`constants/brand.js` is the single source of truth for colors/spacing/shape (`Brand`, `Spacing`, `Shape`) — screens import from here, not the older `constants/theme.js` (superseded, light/dark `Colors` map, kept only for legacy references). There's no shared Button/Screen/Header component library; each screen hand-rolls its own `StyleSheet.create` referencing `Brand`/`Spacing`/`Shape`, so match that per-screen-local-styles convention rather than introducing shared UI components.

---

# Current Features

Authentication
- Email/password
- Google OAuth

Recording
- Record short voice notes
- Upload recordings
- Store recordings in Supabase Storage

Processing
- Whisper transcription
- AI-generated labels
- Skill categorization
- Player tagging
- Game summaries
- Timeline organization

Games
- Create game sessions
- Set markers
- Review recordings by game

Roster
- Player management
- Jersey numbers
- Grade
- Position

Analytics
- Skill distribution
- Trends across sets
- Charts
- Player insights

Landing Page
- Marketing site
- About page
- Coach-focused messaging

---

# Product Philosophy

Sideline is NOT trying to replace film review.

It captures observations that coaches would otherwise forget.

The product must always feel:

- Fast
- Minimal
- Reliable
- Coach-first

Avoid unnecessary complexity.

Every screen should answer:

"What does the coach need immediately?"

---

# Important User Feedback

Real coaches have already used Sideline during varsity playoff matches.

One unexpected discovery:

We originally thought coaches would mainly review notes AFTER games.

Instead, coaches frequently referenced observations during timeouts.

This means in-game usability is even more important than post-game analysis.

Another major discovery:

Many observations are about the opposing team rather than the coach's own players.

Future product decisions should consider:

- opponent scouting
- opponent tendencies
- tactical observations
- matchup tracking

---

# Current State

This is an MVP.

The goal is NOT to build a billion-dollar startup overnight.

The goal is to:

- solve a real coaching problem
- iterate quickly
- ship often
- learn from real users

We prefer shipping a simple feature over building a perfect one.

---

# Code Philosophy

Write code like a senior engineer.

Prioritize:

- readability
- maintainability
- modularity
- simplicity

Avoid clever code.

Avoid premature optimization.

Prefer explicit code over magic.

Favor reusable components.

Small functions are preferred over giant files.

If something becomes duplicated more than twice, suggest abstraction.

---

# Architecture Guidelines

Before writing code:

1. Understand the existing architecture.
2. Reuse existing components whenever possible.
3. Avoid introducing new dependencies unless necessary.
4. Keep naming consistent.
5. Don't break existing behavior.

Always consider downstream effects before modifying shared components.

---

# Debugging

When debugging:

Do NOT guess.

Instead:

- identify the likely root cause
- explain why it is happening
- propose multiple possible fixes
- recommend the cleanest solution
- explain tradeoffs

If uncertain, inspect surrounding code before suggesting changes.

---

# UI Philosophy

The interface should feel like a professional sports product.

Think:

Hudl
Linear
Notion
Stripe

NOT:

Student project
Hackathon demo
Flashy startup landing page

Animations should communicate state, not decorate.

Prefer:

- skeleton loaders
- subtle transitions
- responsive feedback

Avoid excessive animations.

---

# AI Philosophy

AI should augment coaches, not replace them.

Outputs should always be:

- deterministic where possible
- concise
- useful
- trustworthy

Avoid generating unnecessary text.

A coach should be able to scan insights in seconds.

---

# UX Principles

Every interaction should minimize friction.

The coach is often:

- standing
- under time pressure
- watching live play
- using one hand

Optimize for speed over feature richness.

Every tap matters.

---

# Performance

Always look for opportunities to:

- reduce unnecessary renders
- reduce network requests
- optimize loading states
- cache appropriately
- improve perceived speed

---

# Security

Never expose:

- API keys
- service role keys
- secrets

Respect Supabase Row Level Security.

Always consider authentication and authorization.

---

# Future Direction

Potential future features include:

- Opponent scouting mode
- Team tendencies
- Practice planning
- Film integration
- Coach collaboration
- Live timeout dashboard
- Multi-sport support
- College team support

All new features should support this long-term vision without overcomplicating the current MVP.

---

# How Claude Should Help

When asked to implement a feature:

- Think through the architecture first.
- Point out potential edge cases.
- Suggest cleaner alternatives if appropriate.
- Prefer solutions that will scale.
- Explain important design decisions.
- Keep code production-quality.

When reviewing code:

Be honest.

Point out:

- bugs
- edge cases
- code smells
- unnecessary complexity
- security issues
- performance issues
- UI inconsistencies

Do not simply agree with the existing implementation.

Critique it like an experienced staff engineer.

---

# Goal

Every commit should leave the codebase:

- cleaner
- simpler
- more maintainable
- easier to understand

The product should evolve through many small, thoughtful improvements rather than large rewrites.