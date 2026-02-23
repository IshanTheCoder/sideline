/**
 * Volleyball rules context for AI knowledge and rule-violation detection.
 * Used to improve label generation and flag possible incorrect technique/rule mentions.
 */

/** Concise rules context for inclusion in AI system prompts */
export const VOLLEYBALL_RULES_CONTEXT = `
Volleyball rules (indoor, standard):
- Contact: Maximum 3 team contacts per side; double contact (two contacts by same player in one attempt) is a fault except on first team contact (hard-driven attack, or simultaneous contact). Lift/carry (catching or throwing the ball) is a fault.
- Net: Touching the net during play is a fault (except hair/clothing in some leagues). Crossing the center line under the net into opponent space is a fault if it interferes.
- Rotation: Players must be in correct rotation order at service contact. Overlap rules apply (front/back, left/right).
- Serving: One attempt; server must contact ball within 8 seconds of referee whistle. Foot fault (stepping on or over end line before contact) is a fault.
- Libero: Cannot serve in some rules; cannot attack from front zone if ball is above net height; replacement is unlimited but must follow substitution rules.
- Block: Block contact does not count as a team contact. Blockers may touch the ball beyond the net if the opponent has completed an attack.
- Attack: Back-row player may not attack from front zone if contact is above net height (attack from behind the 10-foot line is allowed).
`.trim();

/** Keywords that suggest a possible rule or technique topic (for detection) */
const RULE_VIOLATION_PATTERNS = [
  {
    id: 'double_contact',
    rule: 'Double contact',
    keywords: ['double', 'double contact', 'double hit', 'two contacts', 'carried', 'lift', 'lifted'],
    suggestion: 'Double contact is illegal except on first team contact (e.g. hard-driven attack).',
  },
  {
    id: 'net_violation',
    rule: 'Net violation',
    keywords: ['net', 'touched the net', 'net touch', 'hair', 'net fault'],
    suggestion: 'Net contact during play is a fault except sometimes hair/clothing in certain leagues.',
  },
  {
    id: 'lift_carry',
    rule: 'Lift / carry',
    keywords: ['lift', 'carry', 'carried', 'throw', 'thrown', 'catch', 'caught', 'held'],
    suggestion: 'The ball must be hit, not caught or thrown. Extended contact is a lift.',
  },
  {
    id: 'rotation',
    rule: 'Rotation / overlap',
    keywords: ['rotation', 'wrong rotation', 'out of rotation', 'overlap', 'illegal alignment'],
    suggestion: 'Players must be in correct rotation order at service contact; overlap rules apply.',
  },
  {
    id: 'foot_fault',
    rule: 'Foot fault (serve)',
    keywords: ['foot fault', 'line', 'stepped on', 'serve fault', 'service fault'],
    suggestion: 'Server cannot step on or over the end line before contacting the ball.',
  },
  {
    id: 'back_row_attack',
    rule: 'Back-row attack',
    keywords: ['back row', 'back-row', '10 foot', 'attack from back', 'illegal attack'],
    suggestion: 'Back-row player may not attack from front zone when the ball is above net height.',
  },
  {
    id: 'libero',
    rule: 'Libero restrictions',
    keywords: ['libero', 'liberos', 'cannot serve', 'cannot attack', 'overhand set'],
    suggestion: 'Libero has restrictions on serving (in some rules) and attacking from front zone.',
  },
  {
    id: 'four_hits',
    rule: 'Four hits',
    keywords: ['four hits', 'four contacts', 'too many contacts'],
    suggestion: 'Maximum three team contacts per side before the ball crosses the net.',
  },
];

/**
 * Detect possible rule/technique mentions in transcription and return suggestions.
 * Does not verify whether a violation actually occurred—only flags likely rule-related discussion.
 * @param {string} transcription - Full transcription text
 * @returns {Array<{ rule: string, snippet: string, suggestion: string }>}
 */
export function detectPossibleRuleViolations(transcription) {
  if (!transcription || typeof transcription !== 'string') return [];

  const text = transcription.toLowerCase();
  const results = [];

  for (const { rule, keywords, suggestion } of RULE_VIOLATION_PATTERNS) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        const idx = text.indexOf(kw.toLowerCase());
        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + kw.length + 40);
        const snippet = transcription.slice(start, end).trim();
        results.push({
          rule,
          snippet: snippet.length > 80 ? snippet.slice(0, 77) + '...' : snippet,
          suggestion,
        });
        break; // one match per rule type
      }
    }
  }

  return results;
}

/**
 * Get rules context string for injection into prompts.
 * @returns {string}
 */
export function getVolleyballRulesContext() {
  return VOLLEYBALL_RULES_CONTEXT;
}
