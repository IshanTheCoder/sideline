# CLAUDE.md

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

AI
- OpenAI Whisper (speech transcription)
- Groq (label generation + summaries)

Hosting
- Cloudflare Pages

Languages
- JavaScript / JSX

Version Control
- Git + GitHub

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