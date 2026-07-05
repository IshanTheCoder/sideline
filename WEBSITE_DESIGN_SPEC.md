# Sideline AI — Website Design Specification

## Who this is for

Volleyball coaches at the high school, youth/rec, and club/travel level. Ages 25-55. Most are part-time coaches with day jobs. They use their phones constantly during practice and games. They're practical, time-strapped, and allergic to anything that feels like a sales pitch or a tech demo.

## What the site needs to accomplish

1. Explain what Sideline AI does in under 5 seconds
2. Show the product working (voice → structured note)
3. Make the coach feel like this was built by people who understand their world
4. Drive them to try the app (CTA to the app)
5. Rank for search terms volleyball coaches actually Google

## Competitive positioning

Most volleyball coaching apps (TeamSnap, SkillShark, SportEasy, Volleyball Rotations) have generic SaaS designs — blue gradients, stock photos, cluttered feature lists. Hudl is the only polished player but targets college/pro programs. None of them solve the specific problem of capturing in-game voice observations. If Sideline's site feels crafted and human, it immediately reads as more trustworthy than anything else in this space.

---

## CRITICAL: What this site must NOT look like

Do NOT produce any of these patterns. They are the hallmarks of AI-generated web design and will immediately make the site feel cheap and fake:

- **No dark mode hero sections with gradient blobs or glowing orbs.** No purple-to-orange gradients. No bokeh effects. No floating circles. No "aurora" backgrounds.
- **No neon accent colors** on dark backgrounds (no bright orange buttons on near-black, no glowing green, no electric blue).
- **No generic SaaS headlines** like "We help coaches shine" or "Supercharge your coaching" or "Unlock your team's potential" or anything with "unlock," "supercharge," "revolutionize," "game-changing," or "next-level."
- **No 01 / 02 / 03 numbered step markers** unless the content is genuinely sequential. These are massively overused in AI-generated sites.
- **No glassmorphism** (frosted glass cards). No "bento grid" layouts. No floating phone mockups with drop shadows.
- **No hero sections with centered text, a gradient background, and two side-by-side buttons** (one filled, one outline). This is the single most common AI-generated layout pattern.
- **No animations on every scroll.** One or two subtle motions maximum. Movement should be earned.
- **No generic logo placeholder text** in a "trusted by" bar. If we don't have real logos, don't fake it.

### The test for whether the design passes

Print the homepage on paper. If it could be any product's website with the name swapped out, it fails. The design should feel like it could only belong to a tool built for coaches standing on sidelines.

---

## Design direction

### Mood: "The thoughtful coach's notebook"

Light, warm, grounded. The feeling of a well-worn coaching notebook — organized, practical, personal. Think Slowburn (the candle brand) or Aesop — warm backgrounds, a display serif that has character, copy that sounds like a real person. Not a SaaS template. Not a startup pitch deck. A tool that feels like it was made by hand, for people who work with their hands.

### Color palette

| Role | Color | Hex | Notes |
|------|-------|-----|-------|
| Primary / Brand | Sage Green | `#75975e` | The anchor. Used for accents, icons, highlights, active states. Earthy, calm, trustworthy. |
| Gray / Secondary | Mid Gray | `#979797` | Borders, secondary text, dividers, muted UI elements |
| Dark Green (derived) | Deep Sage | `#4a6340` | Darker shade for CTA buttons, nav text on hover, emphasis. Must pass contrast on light backgrounds |
| Background | Warm Cream | `#F5F3EE` | NOT pure white. Warm, slightly yellow-toned off-white. Like good paper. |
| Surface / Cards | Soft White | `#FEFEFE` | Card backgrounds, slightly brighter than the page background |
| Text / Primary | Warm Black | `#1C1C1A` | Body text. Warm-toned, not blue-black |
| Text / Secondary | Dark Gray | `#6B6B6B` | Captions, timestamps, supporting copy |
| Text / Muted | Light Gray | `#A3A3A3` | Placeholder text, disabled states |
| Accent / Warm | Terracotta (sparing) | `#C4785B` | Use ONLY for one or two small accents — a link underline, a small badge. Not a primary color. Prevents the palette from feeling too monochrome. |

**Palette rule:** This is a quiet palette. No color should shout. The green is the only saturated color, and even it is muted. The site should feel like nature, not neon.

### Typography

**Display / Headlines:** A characterful serif. Options (in order of preference):
- **Source Serif 4** — modern serif with warmth, not stuffy
- **Libre Baskerville** — classic readability
- **Lora** — elegant but approachable

Use at large sizes (40-64px on desktop, 28-40px on mobile). Regular or medium weight — NOT bold. Let the size do the work. Slightly loose letter-spacing at large sizes.

**Body / UI:** A clean humanist sans-serif:
- **DM Sans** — friendly, slightly rounded, great at body sizes
- **Source Sans 3** — neutral but warm
- **Plus Jakarta Sans** — modern with personality

16px base on mobile, 18px on desktop. Line-height 1.65 for body text.

**Why serif display + sans body:** This is the Slowburn pattern. The serif headline gives the site character and warmth. It signals "this was designed by a person" in a way that Inter or Geist never can, because every AI-generated site uses those. The sans-serif body keeps everything readable and functional.

### Layout principles

- **Mobile-first, no exceptions.** 70%+ of coaches will see this on their phone.
- **Left-aligned hero text, not centered.** Centered hero text is the default AI layout. Left-aligned feels editorial and intentional.
- **Asymmetric layouts where it fits.** Text on the left, a visual on the right (or vice versa). Not everything centered in a column.
- **One signature visual moment.** A single animation or interaction that's worth remembering. Everything else is static and confident.
- **Real whitespace.** Sections need at least 80-120px of vertical padding on desktop. Let things breathe.
- **No more than 3 sections visible without scrolling on desktop.** Don't cram.

---

## Page structure

### Homepage (app route: `/` or `/marketing`)

**Nav bar:**
- Logo/wordmark "Sideline" on the left. Set in the serif display font.
- Links: How it works, About, Blog. Right-aligned.
- CTA button: "Try Sideline" — small, dark green (#4a6340), understated. NOT a large gradient button.

**Hero section:**
- Eyebrow text above the headline: "VOICE-FIRST COACHING NOTES" — small caps, spaced out, in the sage green
- Headline (serif, large): Something specific and human. Options:
  - "Remember everything you noticed during the game."
  - "Your coaching notes, captured in the moment."
  - "Every observation, saved before the next play."
- Subhead (sans-serif, muted): "Sideline records your voice notes and turns them into structured, searchable feedback — by player, by skill, by game." (One sentence. Real words. No buzzwords.)
- CTA: "Start recording" — dark green button. One button, not two.
- Visual: NOT a phone mockup. Instead, show a real example of what a structured note looks like — like a card component:
  ```
  🎙️ "Block closing late on the outside"
  ↓
  Player: #7 (Sarah K.)
  Skill: Blocking — timing
  Priority: High
  Game: vs. Ridge, Set 2
  ```
  This card should feel like part of the design, not a floating screenshot.

**"How it works" section:**
- NO numbered steps (01, 02, 03). Instead, use a simple horizontal or vertical flow with arrows or a subtle connecting line.
- Three moments, described in plain language:
  1. "Tap and talk." — During a timeout, between sets, on the bus home. Just say what you noticed.
  2. "Sideline listens." — Your note is transcribed and organized by player, skill area, and priority. No typing, no tagging.
  3. "Review before practice." — Pull up your notes from last Tuesday's game. Know exactly what to work on.
- Each moment gets a small icon (hand-drawn style or simple line icon) and a real volleyball coaching example.

**"Built for the sideline" section:**
- Short paragraph: "You just noticed your setter's tempo is off, but the next rally is already starting. With Sideline, you tap, talk for five seconds, and get back to coaching. Your observation is saved, transcribed, and organized before the set ends."
- This section should feel editorial — like a paragraph in a well-designed blog post. Not a feature grid.

**Social proof (when available):**
- If you have pilot coaches, add their real quotes here. 
- If not yet, skip this section entirely. Do NOT add fake testimonials or "Trusted by 100+ coaches" if it's not true. An honest "We're two high school builders looking for our first 10 coaches to try this" is more compelling than fabricated proof.

**Founders section:**
- A warm, casual introduction. "We're Sid and Ishan — high school athletes from New Jersey. Sid teaches taekwondo. We built Sideline because we've watched coaches lose dozens of observations to the chaos of live games."
- Optional: a photo or illustration of both of you. NOT stock photos.

**Footer:**
- Simple. Links to the app, blog, about, contact email.
- "Made in New Jersey" or similar. Keep it human.
- No giant footer with 20 links. Clean and minimal.

### About page (`/about`)

- Longer version of the founder story
- What makes Sideline different from Hudl/TeamSnap (voice-first, AI-structured, built for in-game capture)
- Contact email for coach feedback

### Blog (`/blog`)

- Simple card layout: title, date, 2-line excerpt, "Read →" link
- Categories: Coaching Tips, Product Updates
- Style the blog posts like Medium articles — wide reading column, generous line-height, good paragraph spacing

### First blog posts

1. "How to Take Better Coaching Notes During Practice" (~900 words, targeting volleyball coaches)
2. "Why Every Coach Needs a System for Practice Notes" (~800 words)
- Both naturally mention Sideline once in the middle and once at the end, not as a pitch but as "here's what we built to solve this"

---

## SEO requirements

- Semantic HTML (h1/h2/h3 hierarchy, main, article, section, nav, footer)
- Meta title and description on every page
- Open Graph tags for link previews
- Twitter card meta tags
- sitemap.xml at root
- robots.txt at root
- Schema.org structured data (SoftwareApplication) on homepage
- Alt text on all images/SVGs
- Canonical URLs
- Page load under 2 seconds

---

## Technical approach

**Same repo as the app.** The marketing pages are routes inside the existing Next.js project at github.com/IshanTheCoder/sideline. This means:

- Marketing pages live under `app/(marketing)/` or similar route group
- They share the same deployment on Cloudflare Pages
- They can use a separate layout from the app (different nav, different footer)
- Blog posts can be markdown files rendered at build time

**Existing stack:** React/Next.js, Supabase, Whisper, Groq API, Cloudflare Pages, JavaScript.

---

## Reference — the quality bar

**DO reference (tone and craft, not layout):**
- Slowburn candles site — warm palette, serif headlines, copy with personality, understated CTAs
- Aesop (aesop.com) — earthy, refined, minimal
- Linear (linear.app) — the standard for clean tech product sites, but too cold for Sideline's vibe. Borrow the whitespace discipline, not the aesthetic.

**DO NOT reference:**
- Any dark-mode SaaS template with gradient blobs
- Generic "We Make Brands Shine" sites with bokeh backgrounds
- Dribbble "concept" landing pages that prioritize flashiness over clarity

---

## What "done" looks like

A volleyball coach in West Windsor finds the site, reads "Remember everything you noticed during the game," thinks "that's exactly my problem," sees the example structured note and understands what it does, and taps "Start recording" — all on her phone in under 20 seconds. The site feels warm, real, and like it was made by people who get coaching. It does not look like it was generated by AI in 2026.
