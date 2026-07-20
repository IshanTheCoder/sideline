/**
 * Sideline brand design tokens — the single-brand forest-green-on-cream palette
 * from the 2026 redesign. Redesigned screens import from here instead of the
 * old light/dark `Colors` map; there is intentionally no dark-mode branching.
 */

export const Brand = {
  // greens
  green: '#40613A', // primary buttons, active states, accents, avatars
  greenHover: '#34502F', // button hover / pressed
  greenTint: '#EAEFE4', // avatar/chip backgrounds, date chips
  greenTintToday: '#D8E6CC', // "Today" date chip
  greenLightInk: '#8CA97D', // secondary green accents
  greenPale: '#A9C39B', // on-dark labels (hero eyebrows)
  greenPaleSub: '#C8D8BC', // on-green secondary text (selected month pill sub)
  greenLink: '#6FA76A', // links on dark (auth screen)
  greenWordmark: '#5C8A57', // SIDELINE wordmark on black
  greenDrillBg: '#F0F5EC', // drill suggestion pill background

  // inks
  ink: '#16181D', // primary text, dark hero cards
  inkSoft: '#2B2E33', // long-form body text (transcripts, insights)
  inkHover: '#23262D', // dark button hover
  muted: '#8A8F94', // secondary text
  faint: '#B0B4B8', // tertiary text
  chip: '#6B7075', // neutral chip ink
  chevron: '#C4C7CB', // chevrons, disabled buttons

  // surfaces
  bg: '#F2F1EC', // screen background (cream)
  card: '#FFFFFF',
  cardHover: '#FBFAF7',
  hairline: '#F0EFEA', // row dividers, neutral chips
  border: '#E7E5DF', // card borders
  border2: '#E3E1DB', // input borders, sheet handles
  borderBtn: '#D8D6D0', // outline button borders
  dashed: '#C9C6BE', // dashed drop-zone borders
  transcriptBg: '#F9F8F5',

  // status
  recordRed: '#FF453A', // active recording state
  danger: '#C24545', // sign out
  successCheck: '#34C77B', // toast checkmark
  authBg: '#000000', // auth screen only

  // on-dark neutrals (auth + hero cards)
  onDarkMuted: '#A3A8AE',
};

// Analysis chart accents (donut + focus-area bars)
export const ChartAccents = {
  donut: ['#40613A', '#8CA97D', '#C8B26B'],
  focus: ['#40613A', '#7A4FC0', '#2380A0', '#B06A1F', '#1E8A5A', '#C24545'],
};

// Per-player accent pairs [chip background, ink] — the design gives each
// player a stable color keyed by their roster position (green, mint, amber,
// purple, red, teal) so chips/avatars identify players at a glance.
export const PlayerPalette = [
  ['#E7EEE0', '#40613A'],
  ['#E6F4EC', '#1E8A5A'],
  ['#F6EDE2', '#B06A1F'],
  ['#F0E8F8', '#7A4FC0'],
  ['#FAE8E8', '#C24545'],
  ['#E4F2F5', '#2380A0'],
];

// Accent for a player name (first-name match against the roster, like the
// design reference's pcolor). Unknown names fall back to the brand green pair.
export function playerAccent(roster, playerName) {
  const first = String(playerName ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  if (!first) return { bg: PlayerPalette[0][0], ink: PlayerPalette[0][1] };
  const i = (roster ?? []).findIndex((r) =>
    String(r?.name ?? '').toLowerCase().startsWith(first)
  );
  const [bg, ink] = PlayerPalette[(i < 0 ? 0 : i) % PlayerPalette.length];
  return { bg, ink };
}

// Shared shape tokens
export const Shape = {
  cardRadius: 20,
  heroRadius: 24,
  sheetRadius: 28,
  buttonRadius: 18,
  smallButtonRadius: 16,
  chipRadius: 10,
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
};

// Uppercase section eyebrow ("AT A GLANCE", "TRANSCRIPT", …)
export const eyebrowText = {
  fontSize: 12,
  fontWeight: '700',
  letterSpacing: 1.4,
  color: Brand.muted,
};
