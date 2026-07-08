/**
 * The volleyball dictionary — every term, position, and formation the AI
 * needs so it sounds like it's been to practice. labelGeneration.js depends
 * on this to know a "kill" is a great spike, not a felony.
 */

/** the main skill buckets — think of them like character classes in an RPG */
export const SKILL_CATEGORIES = {
  SERVING: 'serving',
  PASSING: 'passing',
  SETTING: 'setting',
  ATTACKING: 'attacking',
  BLOCKING: 'blocking',
  DEFENSE: 'defense',
  TRANSITION: 'transition',
  COMMUNICATION: 'communication',
  POSITIONING: 'positioning',
  STRATEGY: 'strategy',
};

/** pretty-printed names so the UI doesn't scream UPPER_CASE at coaches */
export const SKILL_CATEGORY_LABELS = {
  [SKILL_CATEGORIES.SERVING]: 'Serving',
  [SKILL_CATEGORIES.PASSING]: 'Passing',
  [SKILL_CATEGORIES.SETTING]: 'Setting',
  [SKILL_CATEGORIES.ATTACKING]: 'Attacking',
  [SKILL_CATEGORIES.BLOCKING]: 'Blocking',
  [SKILL_CATEGORIES.DEFENSE]: 'Defense',
  [SKILL_CATEGORIES.TRANSITION]: 'Transition',
  [SKILL_CATEGORIES.COMMUNICATION]: 'Communication',
  [SKILL_CATEGORIES.POSITIONING]: 'Positioning',
  [SKILL_CATEGORIES.STRATEGY]: 'Strategy',
};

/** every court position — the volleyball version of job titles on LinkedIn */
export const POSITIONS = {
  SETTER: 'setter',
  OUTSIDE_HITTER: 'outside_hitter',
  MIDDLE_BLOCKER: 'middle_blocker',
  OPPOSITE: 'opposite',
  LIBERO: 'libero',
  DEFENSIVE_SPECIALIST: 'defensive_specialist',
  MULTIPLE_PLAYERS: 'multiple_players',
  ENTIRE_TEAM: 'entire_team',
};

export const POSITION_LABELS = {
  [POSITIONS.SETTER]: 'Setter',
  [POSITIONS.OUTSIDE_HITTER]: 'Outside Hitter',
  [POSITIONS.MIDDLE_BLOCKER]: 'Middle Blocker',
  [POSITIONS.OPPOSITE]: 'Opposite',
  [POSITIONS.LIBERO]: 'Libero',
  [POSITIONS.DEFENSIVE_SPECIALIST]: 'Defensive Specialist',
  [POSITIONS.MULTIPLE_PLAYERS]: 'Multiple Players',
  [POSITIONS.ENTIRE_TEAM]: 'Entire Team',
};

/** offensive formations — the playbooks coaches argue about at dinner */
export const FORMATIONS = {
  SIX_TWO: '6-2',
  FIVE_ONE: '5-1',
  FOUR_TWO: '4-2',
};

/** the six court zones — numbered like a weird clock that only goes to 6 */
export const COURT_ZONES = ['1', '2', '3', '4', '5', '6'];

/** flavors of coaching critique — like review categories but for athletes */
export const FEEDBACK_TYPES = {
  TECHNIQUE: 'technique',
  POSITIONING: 'positioning',
  DECISION_MAKING: 'decision_making',
  COMMUNICATION: 'communication',
  TIMING: 'timing',
  EFFORT: 'effort',
};

export const FEEDBACK_TYPE_LABELS = {
  [FEEDBACK_TYPES.TECHNIQUE]: 'Technique',
  [FEEDBACK_TYPES.POSITIONING]: 'Positioning',
  [FEEDBACK_TYPES.DECISION_MAKING]: 'Decision Making',
  [FEEDBACK_TYPES.COMMUNICATION]: 'Communication',
  [FEEDBACK_TYPES.TIMING]: 'Timing',
  [FEEDBACK_TYPES.EFFORT]: 'Effort',
};

/** keyword → skill category lookup — so the AI knows "ace" means serving, not poker */
export const SKILL_TERMS = {
  [SKILL_CATEGORIES.SERVING]: [
    'serve', 'serving', 'float serve', 'jump serve', 'topspin', 'ace',
    'service error', 'toss', 'follow-through',
  ],
  [SKILL_CATEGORIES.PASSING]: [
    'pass', 'passing', 'forearm pass', 'bump', 'overhead pass', 'serve receive',
    'reception', 'platform', 'passing angle',
  ],
  [SKILL_CATEGORIES.SETTING]: [
    'set', 'setting', 'front set', 'back set', 'jump set', 'setter',
    'hands', 'release', 'tempo',
  ],
  [SKILL_CATEGORIES.ATTACKING]: [
    'attack', 'spike', 'hit', 'kill', 'tip', 'roll shot', 'approach',
    'arm swing', 'follow-through', 'line shot', 'line', 'angle', 'cross court',
  ],
  [SKILL_CATEGORIES.BLOCKING]: [
    'block', 'blocking', 'solo block', 'double block', 'triple block',
    'roof', 'penetration', 'blocking footwork', 'hands over net',
  ],
  [SKILL_CATEGORIES.DEFENSE]: [
    'dig', 'digging', 'pancake', 'sprawl', 'defense', 'reading',
    'defensive position', 'ball control',
  ],
  [SKILL_CATEGORIES.TRANSITION]: [
    'transition', 'offense to defense', 'defense to offense', 'cover',
    'coverage', 'run-through',
  ],
  [SKILL_CATEGORIES.COMMUNICATION]: [
    'call', 'calling', 'mine', 'got it', 'coverage', 'communication',
    'talking', 'eye contact',
  ],
  [SKILL_CATEGORIES.POSITIONING]: [
    'rotation', 'rotations', 'formation', 'base', 'read', 'position',
    'zone', 'front row', 'back row', 'pin', 'middle',
  ],
  [SKILL_CATEGORIES.STRATEGY]: [
    'play', 'tempo', 'quick', 'slide', 'shoot', 'game plan',
    'strategy', 'adjustment', 'rotation', 'sub',
  ],
};

/** aliases for each position — coaches say "OH" and expect everyone to just know */
export const POSITION_TERMS = {
  [POSITIONS.SETTER]: ['setter', 'setters', 'S', '1'],
  [POSITIONS.OUTSIDE_HITTER]: ['outside', 'OH', 'left side', 'pin hitter', 'outside hitter'],
  [POSITIONS.MIDDLE_BLOCKER]: ['middle', 'MB', 'middle blocker', 'middle hitter'],
  [POSITIONS.OPPOSITE]: ['opposite', 'right side', 'RS', 'right side hitter'],
  [POSITIONS.LIBERO]: ['libero', 'lib', 'L', 'libero'],
  [POSITIONS.DEFENSIVE_SPECIALIST]: ['DS', 'defensive specialist', 'defensive sub'],
  [POSITIONS.MULTIPLE_PLAYERS]: ['multiple players', 'both', 'two players', 'several players'],
  [POSITIONS.ENTIRE_TEAM]: ['entire team', 'whole team', 'team', 'everyone', 'all players', 'full team'],
};

/** terms that hint at a specific play or formation being called */
export const PLAY_PATTERN_TERMS = [
  '6-2', '5-1', '4-2', 'six-two', 'five-one', 'four-two',
  'rotation one', 'rotation two', 'rotation three', 'rotation four', 'rotation five', 'rotation six',
  'serve receive', 'free ball', 'down ball', 'out of system',
];

/**
 * Autocorrect for volleyball — speech-to-text loves mangling our jargon.
 * Each entry is [regex to catch the mistake, what it should actually say].
 * Applied in order so by the time we store the text, it sounds literate.
 */
export const TRANSCRIPTION_CORRECTIONS = [
  // STT confuses "serve receive" with "server" constantly
  [/\bServer\s+C\b/gi, 'serve receive'],
  [/\bserver\s+receive\b/gi, 'serve receive'],
  [/\bserver\s+see\b/gi, 'serve receive'],
  [/\bserver\s+seed\b/gi, 'serve receive'],
  [/\bserve\s+receive\b/gi, 'serve receive'],
  // more greatest hits of "things Siri thinks you said"
  [/\bset\s+her\b/gi, 'setter'], // "set her" ≠ a command — it's the position
  [/\bfree\s+fall\b/gi, 'free ball'],
  [/\bdown\s+ball\b/gi, 'down ball'], // just normalizing spacing
  [/\bout\s+of\s+system\b/gi, 'out of system'],
  [/\bmiddle\s+block\s+her\b/gi, 'middle blocker'],
  [/\boutside\s+hitter\b/gi, 'outside hitter'],
  [/\bright\s+side\b/gi, 'right side'],
  [/\bleft\s+side\b/gi, 'left side'],
  // attacking directions — Whisper hears "Lon" for "line", "Engel" for "angle"
  [/\bLon\b/g, 'line'],
  [/\bEngel\b/g, 'angle'],
  [/\bAngel\b/g, 'angle'],
  // more common Whisper mishearings in volleyball contexts
  [/\blie\s*bero\b/gi, 'libero'],
  [/\bLibero\b/g, 'libero'],        // normalise capitalisation for matching
  [/\bpan\s*cake\b/gi, 'pancake'],
  [/\broll\s+shot\b/gi, 'roll shot'],
  [/\bjump\s+serve\b/gi, 'jump serve'],
  [/\bfloat\s+serve\b/gi, 'float serve'],
  // loud-gym greatest hits — crowd noise turns these into word salad
  [/\bside\s*out\b/gi, 'side out'],
  [/\bover\s*pass\b/gi, 'overpass'],
  [/\bshank(ed)?\s+it\b/gi, 'shanked it'],
  [/\bjoust\b/gi, 'joust'],
  [/\btooled?\s+the\s+block\b/gi, 'tooled the block'],
  [/\bsee?m\s+read\b/gi, 'seam read'],
  [/\bquick\s+said\b/gi, 'quick set'],
  [/\bback\s+said\b/gi, 'back set'],
  [/\btight\s+said\b/gi, 'tight set'],
];

/**
 * Runs the raw transcription through our volleyball spell-check.
 * Fixes STT blunders (e.g. "Server C" → "serve receive") and optionally
 * patches mangled player names ("Malikal" → "Maliekal") if you pass a roster.
 * @param {string} text - raw transcription straight from the speech engine
 * @param {Array<{ from: string, to: string }>} [nameCorrections] - optional name fix-ups from the roster
 * @returns {string} cleaned-up transcription that actually makes sense
 */
export function applyVolleyballTranscriptionCorrections(text, nameCorrections = []) {
  if (!text || typeof text !== 'string') return text;
  let result = text;
  for (const [pattern, replacement] of TRANSCRIPTION_CORRECTIONS) {
    result = result.replace(pattern, replacement);
  }
  for (const { from: fromStr, to: toStr } of nameCorrections) {
    if (fromStr && toStr && fromStr !== toStr) {
      const re = new RegExp(`\\b${escapeRegex(fromStr)}\\b`, 'gi');
      result = result.replace(re, toStr);
    }
  }
  return result;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Dumps all skill categories into a flat array — handy for stuffing into prompts.
 * @returns {string[]}
 */
export function getSkillCategoryList() {
  return Object.values(SKILL_CATEGORIES);
}

/**
 * Same deal but for positions — gives the AI a menu of who's who on the court.
 * @returns {string[]}
 */
export function getPositionList() {
  return Object.values(POSITIONS);
}

/**
 * Every feedback type as a flat list — so prompts know what critique styles exist.
 * @returns {string[]}
 */
export function getFeedbackTypeList() {
  return Object.values(FEEDBACK_TYPES);
}

/**
 * Cracks open the ai_labels field — could be a plain string (old-school) or a JSON
 * blob packed with metadata. Either way you get a tidy object back, like a loot box.
 * @param {string|null} aiLabels - whatever's sitting in recordings.ai_labels
 * @returns {{ displayLabel: string, skillCategory?: string, position?: string, playPattern?: string, feedbackType?: string, ruleNote?: string }}
 */
export function parseAiLabels(aiLabels) {
  if (!aiLabels || typeof aiLabels !== 'string') {
    return { displayLabel: '', isOpponentNote: false };
  }
  const trimmed = aiLabels.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const displayLabel = typeof parsed.label === 'string' ? parsed.label : trimmed;
      return {
        displayLabel,
        skillCategory: parsed.skillCategory ?? undefined,
        position: parsed.position ?? undefined,
        playPattern: parsed.playPattern ?? undefined,
        feedbackType: parsed.feedbackType ?? undefined,
        ruleNote: typeof parsed.ruleNote === 'string' && parsed.ruleNote.trim() ? parsed.ruleNote.trim() : undefined,
        taggedPlayers: Array.isArray(parsed.taggedPlayers) ? parsed.taggedPlayers : undefined,
        isOpponentNote: parsed.isOpponentNote === true,
      };
    } catch {
      return { displayLabel: trimmed, isOpponentNote: false };
    }
  }
  return { displayLabel: trimmed, isOpponentNote: false };
}

/**
 * Packs a label + any volleyball metadata into a string for storage.
 * If there's no extra metadata, just returns the plain label — no JSON bloat.
 * @param {string} label - the short display label coaches see
 * @param {object} meta - optional extras: skillCategory, position, playPattern, feedbackType
 * @returns {string}
 */
export function serializeAiLabels(label, meta = {}) {
  const hasMeta =
    meta.skillCategory ||
    meta.position ||
    meta.playPattern ||
    meta.feedbackType ||
    (typeof meta.ruleNote === 'string' && meta.ruleNote.trim()) ||
    (Array.isArray(meta.taggedPlayers) && meta.taggedPlayers.length > 0) ||
    meta.isOpponentNote === true;
  if (!hasMeta) {
    return label;
  }
  return JSON.stringify({
    label: label || '',
    skillCategory: meta.skillCategory ?? null,
    position: meta.position ?? null,
    playPattern: meta.playPattern ?? null,
    feedbackType: meta.feedbackType ?? null,
    ruleNote: typeof meta.ruleNote === 'string' && meta.ruleNote.trim() ? meta.ruleNote.trim() : null,
    taggedPlayers: Array.isArray(meta.taggedPlayers) ? meta.taggedPlayers : null,
    isOpponentNote: meta.isOpponentNote === true,
  });
}

/**
 * Tallies up volleyball metadata across recordings — basically builds the
 * post-game stat sheet (by skill, by position, by feedback type).
 * @param {Array<{ ai_labels?: string | null }>} recordings - the full pile of recording objects
 * @returns {{ bySkill: Record<string, number>, byPosition: Record<string, number>, byFeedback: Record<string, number>, totalWithMeta: number }}
 */
export function aggregateVolleyballStats(recordings) {
  const bySkill = {};
  const byPosition = {};
  const byFeedback = {};
  let totalWithMeta = 0;

  for (const rec of recordings || []) {
    const parsed = parseAiLabels(rec.ai_labels ?? null);
    const hasMeta = parsed.skillCategory || parsed.position || parsed.feedbackType;
    if (hasMeta) totalWithMeta++;

    if (parsed.skillCategory) {
      bySkill[parsed.skillCategory] = (bySkill[parsed.skillCategory] ?? 0) + 1;
    }
    if (parsed.position) {
      byPosition[parsed.position] = (byPosition[parsed.position] ?? 0) + 1;
    }
    if (parsed.feedbackType) {
      byFeedback[parsed.feedbackType] = (byFeedback[parsed.feedbackType] ?? 0) + 1;
    }
  }

  return { bySkill, byPosition, byFeedback, totalWithMeta };
}
