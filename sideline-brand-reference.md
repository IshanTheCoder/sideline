# Sideline Brand Reference

*v1 — 2026-08-02*
*Source of truth: `constants/brand.js` (mirrored in `marketing.css`)*

Sideline's system is a forest-green-on-cream palette — the "thoughtful coach's notebook" look introduced in the 2026 redesign. One palette, no dark mode: the product is meant to read like a well-kept paper notebook on the sideline, not a screen that adapts to its surroundings.

---

## Color Palette

### Surfaces & Ink

| Name | Hex | Usage |
|---|---|---|
| Cream | `#F2F1EC` | Screen/page background |
| Card | `#FFFFFF` | Cards, sheets, surfaces |
| Ink | `#16181D` | Primary text, dark hero cards |
| Ink Soft | `#2B2E33` | Long-form body (transcripts, insights) |
| Muted | `#8A8F94` | Secondary text |
| Faint | `#B0B4B8` | Tertiary text |
| Border | `#E7E5DF` | Card borders |
| Hairline | `#F0EFEA` | Row dividers, neutral chips |

### Greens — the brand color

| Name | Hex | Usage |
|---|---|---|
| Green (primary) | `#40613A` | Buttons, CTAs, active states, avatars, wordmark |
| Green Hover | `#34502F` | Button hover/pressed |
| Sage (accent) | `#75975E` | Eyebrows, small accent marks |
| Green Light Ink | `#8CA97D` | Secondary green accents |
| Green Tint | `#EAEFE4` | Avatar/chip backgrounds, date chips |
| Green Tint — Today | `#D8E6CC` | "Today" date chip |
| Green Pale | `#A9C39B` | On-dark labels (dark hero-card eyebrows) |
| Green Drill Bg | `#F0F5EC` | Drill suggestion pill background |

### Accent & Status

| Name | Hex | Usage |
|---|---|---|
| Terracotta | `#C4785B` | Editorial underline accent (the one warm note) |
| Record Red | `#FF453A` | Active recording state |
| Danger | `#C24545` | Sign out, form errors |
| Success Check | `#34C77B` | Toast checkmark |

### Data & Roster Accents

| Name | Hex | Usage |
|---|---|---|
| Chart — gold | `#C8B26B` | Donut chart third slice |
| Chart — violet | `#7A4FC0` | Focus-area bars / player chip |
| Chart — teal | `#2380A0` | Focus-area bars / player chip |
| Chart — amber | `#B06A1F` | Focus-area bars / player chip |
| Chart — mint | `#1E8A5A` | Focus-area bars / player chip |

Each roster player gets a stable chip color keyed to roster position (green → mint → amber → purple → red → teal), so the same player reads the same color everywhere.

---

## Typography

- **Display:** Source Serif 4 (fallback: Georgia, Times New Roman, serif)
- **Body/UI:** DM Sans (fallback: -apple-system, Segoe UI, Helvetica, Arial, sans-serif)
- **Eyebrow labels:** Sans, 700 weight, 12px, +1.4 letter-spacing, uppercase, colored `#8A8F94` (muted) or `#75975E` (sage)

---

## Voice & Tone

- **Fast** — coach is standing, one-handed, mid-play; copy gets out of the way
- **Minimal** — say the useful thing once, no filler or hedging
- **Reliable** — concrete claims a coach can trust mid-timeout, not marketing puffery
- **Coach-first** — written from the sideline, not the boardroom

**Reads like:** Hudl, Linear, Notion, Stripe.
**Not:** a student project, a hackathon demo, a flashy startup landing page.

### Real copy examples

| Role | Copy |
|---|---|
| Eyebrow | "Voice-first coaching notes" |
| Headline | "Remember everything you noticed during the game." |
| CTA | "Start recording" |
| CTA note | "No clipboard. No typing. Just say what you saw." |
| Proof point | "Already used by a top-five team in New Jersey." |

---

## Shape & Spacing Tokens

**Corner radius:** Card 20px · Hero 24px · Sheet 28px · Button 18px · Small button 16px · Chip 10px

**Spacing scale:** xxs 4px · xs 8px · sm 12px · md 16px · lg 20px · xl 24px

---

*Known inconsistency: `components/SidelineLogo.jsx` (whistle icon) still uses an older green (`#5A8A6D`) that predates this palette — not yet updated to `#40613A`.*
