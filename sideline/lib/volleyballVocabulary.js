/**
 * Volleyball-specific vocabulary for AI label generation and categorization.
 * Used by labelGeneration.js to improve recognition of volleyball terms,
 * positions, formations, and coaching language.
 */

/** Volleyball skill categories for classification */
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

/** Human-readable labels for skill categories */
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

/** Player positions */
export const POSITIONS = {
  SETTER: 'setter',
  OUTSIDE_HITTER: 'outside_hitter',
  MIDDLE_BLOCKER: 'middle_blocker',
  OPPOSITE: 'opposite',
  LIBERO: 'libero',
  DEFENSIVE_SPECIALIST: 'defensive_specialist',
};

export const POSITION_LABELS = {
  [POSITIONS.SETTER]: 'Setter',
  [POSITIONS.OUTSIDE_HITTER]: 'Outside Hitter',
  [POSITIONS.MIDDLE_BLOCKER]: 'Middle Blocker',
  [POSITIONS.OPPOSITE]: 'Opposite',
  [POSITIONS.LIBERO]: 'Libero',
  [POSITIONS.DEFENSIVE_SPECIALIST]: 'Defensive Specialist',
};

/** Common formations (offensive systems) */
export const FORMATIONS = {
  SIX_TWO: '6-2',
  FIVE_ONE: '5-1',
  FOUR_TWO: '4-2',
};

/** Court zones (1–6) */
export const COURT_ZONES = ['1', '2', '3', '4', '5', '6'];

/** Volleyball-specific feedback types for coaching */
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

/** Terms that map to skill categories (for prompt and optional local mapping) */
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
    'arm swing', 'follow-through', 'line shot', 'cross court',
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

/** Position keywords for detection */
export const POSITION_TERMS = {
  [POSITIONS.SETTER]: ['setter', 'setters', 'S', '1'],
  [POSITIONS.OUTSIDE_HITTER]: ['outside', 'OH', 'left side', 'pin hitter', 'outside hitter'],
  [POSITIONS.MIDDLE_BLOCKER]: ['middle', 'MB', 'middle blocker', 'middle hitter'],
  [POSITIONS.OPPOSITE]: ['opposite', 'right side', 'RS', 'right side hitter'],
  [POSITIONS.LIBERO]: ['libero', 'lib', 'L', 'libero'],
  [POSITIONS.DEFENSIVE_SPECIALIST]: ['DS', 'defensive specialist', 'defensive sub'],
};

/** Play/formation keywords */
export const PLAY_PATTERN_TERMS = [
  '6-2', '5-1', '4-2', 'six-two', 'five-one', 'four-two',
  'rotation one', 'rotation two', 'rotation three', 'rotation four', 'rotation five', 'rotation six',
  'serve receive', 'free ball', 'down ball', 'out of system',
];

/**
 * Common speech-to-text mishearings of volleyball terms.
 * Each entry: [ regex or string to match (case-insensitive), replacement ].
 * Applied in order so the stored transcription and labels use correct volleyball wording.
 */
export const TRANSCRIPTION_CORRECTIONS = [
  // "Server C" / "server C" → serve receive
  [/\bServer\s+C\b/gi, 'serve receive'],
  [/\bserve\s+receive\b/gi, 'serve receive'], // normalize spacing/caps
  // Other common STT mishearings
  [/\bset\s+her\b/gi, 'setter'], // "set her" when meaning the position
  [/\bfree\s+fall\b/gi, 'free ball'],
  [/\bdown\s+ball\b/gi, 'down ball'], // normalize
  [/\bout\s+of\s+system\b/gi, 'out of system'],
  [/\bmiddle\s+block\s+her\b/gi, 'middle blocker'],
  [/\boutside\s+hitter\b/gi, 'outside hitter'],
  [/\bright\s+side\b/gi, 'right side'],
  [/\bleft\s+side\b/gi, 'left side'],
];

/**
 * Apply volleyball-specific corrections to raw transcription text.
 * Fixes common speech-to-text mishearings (e.g. "Server C" → "serve receive").
 * Optionally applies roster name corrections (e.g. "Malikal" → "Maliekal") when provided.
 * @param {string} text - Raw transcription from STT
 * @param {Array<{ from: string, to: string }>} [nameCorrections] - Optional list of { from, to } for player name spelling
 * @returns {string} Corrected transcription
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
 * Get all skill category values as a list (for prompts).
 * @returns {string[]}
 */
export function getSkillCategoryList() {
  return Object.values(SKILL_CATEGORIES);
}

/**
 * Get all position values as a list (for prompts).
 * @returns {string[]}
 */
export function getPositionList() {
  return Object.values(POSITIONS);
}

/**
 * Get all feedback type values (for prompts).
 * @returns {string[]}
 */
export function getFeedbackTypeList() {
  return Object.values(FEEDBACK_TYPES);
}

/**
 * Parse ai_labels from storage: can be legacy plain string or JSON with label + metadata.
 * @param {string|null} aiLabels - Value from recordings.ai_labels
 * @returns {{ displayLabel: string, skillCategory?: string, position?: string, playPattern?: string, feedbackType?: string, ruleNote?: string }}
 */
export function parseAiLabels(aiLabels) {
  if (!aiLabels || typeof aiLabels !== 'string') {
    return { displayLabel: '' };
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
      };
    } catch {
      return { displayLabel: trimmed };
    }
  }
  return { displayLabel: trimmed };
}

/**
 * Serialize label and optional volleyball metadata for storage in ai_labels.
 * @param {string} label - Short display label
 * @param {object} meta - Optional: skillCategory, position, playPattern, feedbackType
 * @returns {string}
 */
export function serializeAiLabels(label, meta = {}) {
  const hasMeta =
    meta.skillCategory ||
    meta.position ||
    meta.playPattern ||
    meta.feedbackType ||
    (typeof meta.ruleNote === 'string' && meta.ruleNote.trim()) ||
    (Array.isArray(meta.taggedPlayers) && meta.taggedPlayers.length > 0);
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
  });
}

/**
 * Aggregate volleyball metadata from an array of recordings for post-game summary.
 * @param {Array<{ ai_labels?: string | null }>} recordings - List of recording objects
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
