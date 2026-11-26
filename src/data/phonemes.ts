export interface PhonemeInfo {
  key: string;
  /** Pure schwa-minimal TTS speech cue */
  ttsCue: string;
  /** Smooth connected-phonation cue for blending */
  blendingCue: string;
  /** Friendly human-readable phoneme notation for parents/UI */
  displaySound: string;
  /** Everyday real-world keyword anchor (e.g., "map", "sun") */
  keyword: string;
  /** True for vowels and stretchable continuant consonants (m, s, f, n, r, l, v, z, sh, th) */
  isContinuous: boolean;
}

/**
 * Carefully tuned schwa-minimal phoneme pronunciation map.
 * Avoids TTS acronym spelling (e.g., avoids 3 identical letters that engines spell out)
 * and minimizes intrusive /uh/ schwas on stop consonants.
 */
export const PHONEME_MAP: Record<string, PhonemeInfo> = {
  // Continuant consonants (easiest for 5-year-olds to stretch & blend!)
  m: { key: 'm', ttsCue: 'mmm', blendingCue: 'mmmm', displaySound: '/m/', keyword: 'map', isContinuous: true },
  s: { key: 's', ttsCue: 'sss', blendingCue: 'ssss', displaySound: '/s/', keyword: 'sun', isContinuous: true },
  f: { key: 'f', ttsCue: 'fff', blendingCue: 'ffff', displaySound: '/f/', keyword: 'fan', isContinuous: true },
  n: { key: 'n', ttsCue: 'nnn', blendingCue: 'nnnn', displaySound: '/n/', keyword: 'net', isContinuous: true },
  r: { key: 'r', ttsCue: 'rrr', blendingCue: 'rrrr', displaySound: '/r/', keyword: 'run', isContinuous: true },
  l: { key: 'l', ttsCue: 'lll', blendingCue: 'llll', displaySound: '/l/', keyword: 'leaf', isContinuous: true },
  v: { key: 'v', ttsCue: 'vvv', blendingCue: 'vvvv', displaySound: '/v/', keyword: 'vine', isContinuous: true },
  z: { key: 'z', ttsCue: 'zzz', blendingCue: 'zzzz', displaySound: '/z/', keyword: 'zip', isContinuous: true },
  sh: { key: 'sh', ttsCue: 'shhh', blendingCue: 'shhhh', displaySound: '/sh/', keyword: 'shop', isContinuous: true },
  th_voiced: { key: 'th_voiced', ttsCue: 'thh', blendingCue: 'thhh', displaySound: '/th/', keyword: 'the', isContinuous: true },
  th: { key: 'th', ttsCue: 'thhh', blendingCue: 'thhhh', displaySound: '/th/', keyword: 'thin', isContinuous: true },
  h: { key: 'h', ttsCue: 'hhh', blendingCue: 'hh', displaySound: '/h/', keyword: 'hat', isContinuous: true },
  w: { key: 'w', ttsCue: 'wuh', blendingCue: 'ww', displaySound: '/w/', keyword: 'win', isContinuous: true },
  wh: { key: 'wh', ttsCue: 'wuh', blendingCue: 'ww', displaySound: '/w/', keyword: 'whip', isContinuous: true },
  y_cons: { key: 'y_cons', ttsCue: 'yuh', blendingCue: 'yy', displaySound: '/y/', keyword: 'yes', isContinuous: true },

  // Stop & affricate consonants (clipped cues to minimize schwa)
  b: { key: 'b', ttsCue: 'buh', blendingCue: 'b', displaySound: '/b/', keyword: 'bag', isContinuous: false },
  c: { key: 'c', ttsCue: 'kuh', blendingCue: 'k', displaySound: '/k/', keyword: 'cat', isContinuous: false },
  k: { key: 'k', ttsCue: 'kuh', blendingCue: 'k', displaySound: '/k/', keyword: 'kid', isContinuous: false },
  ck: { key: 'ck', ttsCue: 'kuh', blendingCue: 'k', displaySound: '/k/', keyword: 'duck', isContinuous: false },
  d: { key: 'd', ttsCue: 'duh', blendingCue: 'd', displaySound: '/d/', keyword: 'dog', isContinuous: false },
  g: { key: 'g', ttsCue: 'guh', blendingCue: 'g', displaySound: '/g/', keyword: 'go', isContinuous: false },
  j: { key: 'j', ttsCue: 'juh', blendingCue: 'j', displaySound: '/j/', keyword: 'jump', isContinuous: false },
  p: { key: 'p', ttsCue: 'puh', blendingCue: 'p', displaySound: '/p/', keyword: 'pet', isContinuous: false },
  t: { key: 't', ttsCue: 'tuh', blendingCue: 't', displaySound: '/t/', keyword: 'top', isContinuous: false },
  ch: { key: 'ch', ttsCue: 'chuh', blendingCue: 'ch', displaySound: '/ch/', keyword: 'chat', isContinuous: false },
  tch: { key: 'tch', ttsCue: 'chuh', blendingCue: 'ch', displaySound: '/ch/', keyword: 'catch', isContinuous: false },
  qu: { key: 'qu', ttsCue: 'kwuh', blendingCue: 'kw', displaySound: '/kw/', keyword: 'quick', isContinuous: false },
  x: { key: 'x', ttsCue: 'ks', blendingCue: 'ks', displaySound: '/ks/', keyword: 'box', isContinuous: false },

  // Double-letter & silent-e consonant endings
  ll: { key: 'll', ttsCue: 'lll', blendingCue: 'llll', displaySound: '/l/', keyword: 'ball', isContinuous: true },
  ff: { key: 'ff', ttsCue: 'fff', blendingCue: 'ffff', displaySound: '/f/', keyword: 'puff', isContinuous: true },
  ss: { key: 'ss', ttsCue: 'sss', blendingCue: 'ssss', displaySound: '/s/', keyword: 'grass', isContinuous: true },
  zz: { key: 'zz', ttsCue: 'zzz', blendingCue: 'zzzz', displaySound: '/z/', keyword: 'buzz', isContinuous: true },
  ve: { key: 've', ttsCue: 'vvv', blendingCue: 'vvvv', displaySound: '/v/', keyword: 'save', isContinuous: true },
  ke: { key: 'ke', ttsCue: 'kuh', blendingCue: 'k', displaySound: '/k/', keyword: 'wake', isContinuous: false },
  te: { key: 'te', ttsCue: 'tuh', blendingCue: 't', displaySound: '/t/', keyword: 'bite', isContinuous: false },
  ce: { key: 'ce', ttsCue: 'sss', blendingCue: 'ssss', displaySound: '/s/', keyword: 'ice', isContinuous: true },
  le: { key: 'le', ttsCue: 'ull', blendingCue: 'ul', displaySound: '/ul/', keyword: 'tackle', isContinuous: true },
  re: { key: 're', ttsCue: 'rrr', blendingCue: 'rrr', displaySound: '/r/', keyword: 'fire', isContinuous: true },

  // Short vowels
  a_short: { key: 'a_short', ttsCue: 'aah', blendingCue: 'aaaa', displaySound: '/ă/', keyword: 'apple', isContinuous: true },
  e_short: { key: 'e_short', ttsCue: 'eh', blendingCue: 'eeee', displaySound: '/ĕ/', keyword: 'egg', isContinuous: true },
  i_short: { key: 'i_short', ttsCue: 'ih', blendingCue: 'iiii', displaySound: '/ĭ/', keyword: 'in', isContinuous: true },
  o_short: { key: 'o_short', ttsCue: 'ahh', blendingCue: 'oooo', displaySound: '/ŏ/', keyword: 'on', isContinuous: true },
  u_short: { key: 'u_short', ttsCue: 'uhh', blendingCue: 'uuuu', displaySound: '/ŭ/', keyword: 'up', isContinuous: true },

  // Long vowels & vowel teams
  a_long: { key: 'a_long', ttsCue: 'ay', blendingCue: 'ayyy', displaySound: '/ā/', keyword: 'save', isContinuous: true },
  e_long: { key: 'e_long', ttsCue: 'eee', blendingCue: 'eeee', displaySound: '/ē/', keyword: 'me', isContinuous: true },
  i_long: { key: 'i_long', ttsCue: 'eye', blendingCue: 'eyee', displaySound: '/ī/', keyword: 'ice', isContinuous: true },
  o_long: { key: 'o_long', ttsCue: 'oh', blendingCue: 'ohhh', displaySound: '/ō/', keyword: 'go', isContinuous: true },
  u_long: { key: 'u_long', ttsCue: 'ooo', blendingCue: 'oooo', displaySound: '/oo/', keyword: 'you', isContinuous: true },
  ea: { key: 'ea', ttsCue: 'eee', blendingCue: 'eeee', displaySound: '/ē/', keyword: 'heal', isContinuous: true },
  ee: { key: 'ee', ttsCue: 'eee', blendingCue: 'eeee', displaySound: '/ē/', keyword: 'seel', isContinuous: true },
  ay: { key: 'ay', ttsCue: 'ay', blendingCue: 'ayyy', displaySound: '/ā/', keyword: 'play', isContinuous: true },
  ai: { key: 'ai', ttsCue: 'ay', blendingCue: 'ayyy', displaySound: '/ā/', keyword: 'tail', isContinuous: true },
  ow_long: { key: 'ow_long', ttsCue: 'oh', blendingCue: 'ohhh', displaySound: '/ō/', keyword: 'grow', isContinuous: true },
  oo_short: { key: 'oo_short', ttsCue: 'uh', blendingCue: 'uuu', displaySound: '/oo/', keyword: 'good', isContinuous: true },
  y_vowel: { key: 'y_vowel', ttsCue: 'eee', blendingCue: 'eeee', displaySound: '/ē/', keyword: 'candy', isContinuous: true },
  igh: { key: 'igh', ttsCue: 'eye', blendingCue: 'eyee', displaySound: '/ī/', keyword: 'fight', isContinuous: true },
  uy: { key: 'uy', ttsCue: 'eye', blendingCue: 'eyee', displaySound: '/ī/', keyword: 'buy', isContinuous: true },
  a_aw: { key: 'a_aw', ttsCue: 'aww', blendingCue: 'awww', displaySound: '/aw/', keyword: 'ball', isContinuous: true },
  schwa: { key: 'schwa', ttsCue: 'uh', blendingCue: 'uh', displaySound: '/ə/', keyword: 'the', isContinuous: true },
  ie_short: { key: 'ie_short', ttsCue: 'eh', blendingCue: 'ehh', displaySound: '/ĕ/', keyword: 'friend', isContinuous: true },

  // R-controlled & special word chunks
  ar: { key: 'ar', ttsCue: 'ar', blendingCue: 'arrr', displaySound: '/ar/', keyword: 'star', isContinuous: true },
  er: { key: 'er', ttsCue: 'er', blendingCue: 'errr', displaySound: '/er/', keyword: 'water', isContinuous: true },
  ur: { key: 'ur', ttsCue: 'er', blendingCue: 'errr', displaySound: '/er/', keyword: 'burn', isContinuous: true },
  tion: { key: 'tion', ttsCue: 'shun', blendingCue: 'shun', displaySound: '/shun/', keyword: 'potion', isContinuous: true },
};

/**
 * Mirror-confusion letter pairs avoided as distractors in Zones 1–2
 * so early readers aren't tripped up by b/d, p/q, m/w, n/u, s/z reversals.
 */
export const MIRROR_CONFUSION_PAIRS: readonly [string, string][] = [
  ['B', 'D'],
  ['P', 'Q'],
  ['M', 'W'],
  ['N', 'U'],
  ['S', 'Z'],
];

export function areMirrorConfusable(a: string, b: string): boolean {
  const upperA = a.toUpperCase();
  const upperB = b.toUpperCase();
  return MIRROR_CONFUSION_PAIRS.some(
    ([x, y]) => (upperA === x && upperB === y) || (upperA === y && upperB === x),
  );
}

export const LETTER_NAMES: Record<string, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
  F: 'F',
  G: 'G',
  H: 'H',
  I: 'I',
  J: 'J',
  K: 'K',
  L: 'L',
  M: 'M',
  N: 'N',
  O: 'O',
  P: 'P',
  Q: 'Q',
  R: 'R',
  S: 'S',
  T: 'T',
  U: 'U',
  V: 'V',
  W: 'W',
  X: 'X',
  Y: 'Y',
  Z: 'Z',
};

export function getPhonemeInfo(key: string): PhonemeInfo {
  const found = PHONEME_MAP[key];
  if (found) return found;
  return {
    key,
    ttsCue: key,
    blendingCue: key,
    displaySound: `/${key}/`,
    keyword: key,
    isContinuous: false,
  };
}
