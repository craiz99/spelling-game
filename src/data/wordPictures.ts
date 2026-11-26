import type { WordEntry } from './types';

/**
 * Exact set of painted 240x240 Word Picture Cards stored in public/assets/words/{slug}.jpg.
 */
export const PAINTED_WORD_SLUGS: ReadonlySet<string> = new Set([
  'ant', 'apple', 'back', 'bag', 'ball', 'bed', 'bite', 'box', 'bug', 'bulb',
  'buy', 'cat', 'catch', 'chat', 'cold', 'dog', 'duck', 'egg', 'fan', 'fast',
  'fight', 'fire', 'fish', 'friend', 'fun', 'go', 'good', 'grow', 'hat', 'heal',
  'help', 'hop', 'hug', 'ice', 'in', 'jump', 'kite', 'lion', 'man', 'map',
  'mat', 'me', 'mop', 'mug', 'net', 'no', 'on', 'owl', 'pet', 'pig',
  'pit', 'play', 'pop', 'puff', 'queen', 'quick', 'red', 'rest', 'run', 'sand',
  'save', 'sell', 'ship', 'shop', 'sit', 'star', 'sun', 'swim', 'tail', 'the',
  'top', 'up', 'van', 'water', 'whale', 'whip', 'win', 'yes', 'you', 'zebra',
]);

/**
 * Explicit slug overrides for focus-chunked words and Blending Dojo word-chain steps
 * whose painted picture uses a closely matched visual card.
 */
const WORD_SLUG_OVERRIDES: Record<string, string> = {
  'z4-ice-heal': 'ice',
  'z4-paralyze-heal': 'heal',
  'z4-antidote': 'ant',
  'z5-sand': 'sand',
  'z5-quick': 'quick',
  'z5-tail': 'tail',
  'z5-whip': 'whip',
  'z5-water': 'water',
  'z5-grow': 'grow',
  'z6-psyduck': 'duck',
  'z6-jigglypuff': 'puff',
  'z6-bulbasaur': 'bulb',
  // Blending Dojo word chain steps
  SET: 'go',
  MET: 'friend',
  SAT: 'sit',
  FIT: 'good',
  HIT: 'catch',
  BIT: 'bite',
};

export function getWordPictureUrl(slug: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}assets/words/${slug}.jpg`;
}

/**
 * Resolves a painted picture card slug for any WordEntry (or null if it should display
 * its official PokéAPI item sprite or Pokémon official artwork instead).
 */
export function resolveWordPictureSlug(word: WordEntry): string | null {
  if (word.pictureSlug && PAINTED_WORD_SLUGS.has(word.pictureSlug)) {
    return word.pictureSlug;
  }
  const byId = WORD_SLUG_OVERRIDES[word.id];
  if (byId && PAINTED_WORD_SLUGS.has(byId)) {
    return byId;
  }
  const lowerFocus = word.focusWord.toLowerCase();
  if (PAINTED_WORD_SLUGS.has(lowerFocus)) {
    return lowerFocus;
  }
  const lowerDisplay = word.displayWord.toLowerCase();
  if (PAINTED_WORD_SLUGS.has(lowerDisplay)) {
    return lowerDisplay;
  }
  return null;
}

/**
 * Resolves a painted picture card slug for a raw uppercase word (e.g., Blending Dojo).
 */
export function resolveRawWordPictureSlug(rawWord: string): string | null {
  const upper = rawWord.toUpperCase();
  const override = WORD_SLUG_OVERRIDES[upper];
  if (override && PAINTED_WORD_SLUGS.has(override)) {
    return override;
  }
  const lower = rawWord.toLowerCase();
  if (PAINTED_WORD_SLUGS.has(lower)) {
    return lower;
  }
  return null;
}
