import { areMirrorConfusable, getPhonemeInfo } from '../data/phonemes';
import type {
  PhonemeUnit,
  ScaffoldMode,
  TileMode,
  WordEntry,
  WordMasteryRecord,
} from '../data/types';

export type EffectiveScaffoldLevel = 'starter' | 'builder' | 'explorer';

export interface ActiveBoxUnit extends PhonemeUnit {
  /** Shared teamGroupId links 2+ single-letter boxes that form a digraph/vowel team (e.g. S + H) */
  teamGroupId?: number;
}

export interface TileOption {
  id: string;
  letters: string;
  phonemeKey: string;
  used: boolean;
}

export interface WordChallengeState {
  word: WordEntry;
  /** Effective box units (1-letter decomposed in 'single-letters' mode, or phoneme units in 'digraph-teams' mode) */
  units: ActiveBoxUnit[];
  tileMode: TileMode;
  scaffoldLevel: EffectiveScaffoldLevel;
  /** Which box indices are currently filled */
  filledMask: boolean[];
  /** Index of the currently active blank Elkonin box, or null if complete */
  activeIndex: number | null;
  tiles: TileOption[];
  wrongAttemptsOnActive: number;
  totalWrongAttempts: number;
  usedHelp: boolean;
  /** Tier-2 safety net: golden sparkle beacon on the correct tile */
  showBeacon: boolean;
  /** Tier-2 safety net: soft ghost letter inside the active Elkonin box */
  showGhostLetter: boolean;
  isComplete: boolean;
}

export interface TileSelectionOutcome {
  state: WordChallengeState;
  result: 'correct' | 'wrong-tier-1' | 'wrong-tier-2' | 'auto-assist-tier-3' | 'ignored';
  chosenTile: TileOption | null;
  expectedUnit: ActiveBoxUnit | null;
  autoPlacedTileId?: string;
}

const SINGLE_LETTER_PHONEME: Record<string, string> = {
  A: 'a_short',
  B: 'b',
  C: 'c',
  D: 'd',
  E: 'e_short',
  F: 'f',
  G: 'g',
  H: 'h',
  I: 'i_short',
  J: 'j',
  K: 'k',
  L: 'l',
  M: 'm',
  N: 'n',
  O: 'o_short',
  P: 'p',
  Q: 'qu',
  R: 'r',
  S: 's',
  T: 't',
  U: 'u_short',
  V: 'v',
  W: 'w',
  X: 'x',
  Y: 'y_cons',
  Z: 'z',
};

const SINGLE_CONSONANT_POOL: readonly { letters: string; phonemeKey: string }[] = [
  { letters: 'M', phonemeKey: 'm' },
  { letters: 'S', phonemeKey: 's' },
  { letters: 'F', phonemeKey: 'f' },
  { letters: 'N', phonemeKey: 'n' },
  { letters: 'R', phonemeKey: 'r' },
  { letters: 'L', phonemeKey: 'l' },
  { letters: 'T', phonemeKey: 't' },
  { letters: 'P', phonemeKey: 'p' },
  { letters: 'B', phonemeKey: 'b' },
  { letters: 'C', phonemeKey: 'c' },
  { letters: 'G', phonemeKey: 'g' },
  { letters: 'H', phonemeKey: 'h' },
  { letters: 'D', phonemeKey: 'd' },
  { letters: 'W', phonemeKey: 'w' },
  { letters: 'K', phonemeKey: 'k' },
  { letters: 'V', phonemeKey: 'v' },
  { letters: 'J', phonemeKey: 'j' },
  { letters: 'Z', phonemeKey: 'z' },
];

const VOWEL_POOL: readonly { letters: string; phonemeKey: string }[] = [
  { letters: 'A', phonemeKey: 'a_short' },
  { letters: 'E', phonemeKey: 'e_short' },
  { letters: 'I', phonemeKey: 'i_short' },
  { letters: 'O', phonemeKey: 'o_short' },
  { letters: 'U', phonemeKey: 'u_short' },
];

const DIGRAPH_POOL: readonly { letters: string; phonemeKey: string }[] = [
  { letters: 'SH', phonemeKey: 'sh' },
  { letters: 'CH', phonemeKey: 'ch' },
  { letters: 'CK', phonemeKey: 'ck' },
  { letters: 'EA', phonemeKey: 'ea' },
  { letters: 'EE', phonemeKey: 'ee' },
  { letters: 'AY', phonemeKey: 'ay' },
  { letters: 'AR', phonemeKey: 'ar' },
  { letters: 'UR', phonemeKey: 'ur' },
  { letters: 'LL', phonemeKey: 'll' },
  { letters: 'FF', phonemeKey: 'ff' },
  { letters: 'TH', phonemeKey: 'th' },
  { letters: 'WH', phonemeKey: 'wh' },
  { letters: 'AI', phonemeKey: 'ai' },
  { letters: 'OO', phonemeKey: 'oo_short' },
];

/**
 * Resolves effective scaffold level.
 * New words always begin in Starter mode under Auto-Adaptive so a 5-year-old
 * sees Picture + First Letter and builds immediate confidence.
 */
export function resolveEffectiveScaffold(
  mode: ScaffoldMode,
  mastery?: WordMasteryRecord,
): EffectiveScaffoldLevel {
  if (mode === 'extra-help') return 'starter';
  if (mode === 'builder') return 'builder';
  if (mode === 'explorer') return 'explorer';

  if (!mastery || mastery.cleanWins === 0) return 'starter';
  if (mastery.cleanWins === 1) return 'builder';
  return 'explorer';
}

/**
 * Converts a word's phoneme units into active Elkonin box units.
 * - In 'single-letters' mode (V4 default): every box is strictly ONE single letter,
 *   while multi-letter digraphs/vowel teams share a teamGroupId so the UI draws
 *   a gentle connector bracket underneath them!
 * - In 'digraph-teams' mode: keeps true 2-letter digraphs/vowel teams intact while
 *   still splitting 3+ letter chunks (like TION, TCH, IGH) so no giant blobs appear.
 */
export function expandUnitsForTileMode(
  units: readonly PhonemeUnit[],
  tileMode: TileMode = 'single-letters',
): ActiveBoxUnit[] {
  const result: ActiveBoxUnit[] = [];
  let nextTeamId = 1;

  for (const unit of units) {
    const clean = unit.letters.toUpperCase();
    const shouldSplit =
      tileMode === 'single-letters'
        ? clean.length > 1
        : clean.length > 2;

    if (!shouldSplit) {
      result.push({ ...unit, letters: clean });
      continue;
    }

    const groupId = nextTeamId++;
    for (let i = 0; i < clean.length; i += 1) {
      const ch = clean[i]!;
      result.push({
        letters: ch,
        phonemeKey: SINGLE_LETTER_PHONEME[ch] ?? unit.phonemeKey,
        isHeartWord: i === 0 ? unit.isHeartWord : undefined,
        heartHint: i === 0 ? unit.heartHint : undefined,
        teamGroupId: groupId,
      });
    }
  }

  return result;
}

function deterministicShuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

function isVowelUnit(unit: PhonemeUnit): boolean {
  const vowels = new Set([
    'A', 'E', 'I', 'O', 'U', 'EA', 'EE', 'AY', 'AI', 'OO', 'OU', 'IE', 'UY', 'IGH', 'AR', 'ER', 'UR', 'OW',
  ]);
  return vowels.has(unit.letters.toUpperCase());
}

/**
 * Picks which box indices start blank.
 * V4 First-Letter Guarantee:
 * - In 'starter' mode: ALWAYS keeps index 0 (the first letter!) pre-filled so the child
 *   gets Picture + First Letter together! Blanks 1 letter for short words (2–4 boxes)
 *   or 2 letters for longer curative/multi-syllable words (5+ boxes).
 * - In 'builder' mode: keeps index 0 visible when possible (count >= 3) and blanks 2–3 boxes.
 * - In 'explorer' mode: blanks every box for full independent spelling!
 */
export function pickMissingIndices(
  units: readonly PhonemeUnit[],
  scaffoldLevel: EffectiveScaffoldLevel,
  rng: () => number = Math.random,
): number[] {
  const count = units.length;
  if (count <= 1) return [0];

  if (scaffoldLevel === 'explorer') {
    return units.map((_, i) => i);
  }

  // Non-initial indices (index 0 is ALWAYS anchored in starter & 3+ builder!)
  const nonInitial = units.map((_, idx) => idx).filter((idx) => idx > 0);

  if (scaffoldLevel === 'starter') {
    const regularNonInitial = nonInitial.filter((idx) => !units[idx]?.isHeartWord);
    const pool = regularNonInitial.length > 0 ? regularNonInitial : nonInitial;
    const desiredBlanks = count >= 6 ? 2 : 1;
    const shuffled = deterministicShuffle(pool, rng);
    return shuffled.slice(0, Math.min(desiredBlanks, pool.length)).sort((a, b) => a - b);
  }

  // Builder mode: 2 blanks (or 3 for 6+ letter curatives), keeping first letter visible when count >= 3
  const desiredBlanks = count >= 6 ? 3 : Math.min(2, count);
  const candidatePool = count >= desiredBlanks + 1 ? nonInitial : units.map((_, idx) => idx);
  const shuffled = deterministicShuffle(candidatePool, rng);
  return shuffled.slice(0, Math.min(desiredBlanks, candidatePool.length)).sort((a, b) => a - b);
}

/**
 * Generates choice tiles for the Elkonin board.
 * Enforces the mirror-confusion filter (B/D, P/Q, M/W, N/U, S/Z) in Zones 1–2
 * and strictly uses single-letter tiles when tileMode === 'single-letters'.
 */
export function buildWordChallenge(
  word: WordEntry,
  scaffoldLevel: EffectiveScaffoldLevel,
  rng: () => number = Math.random,
  tileMode: TileMode = 'single-letters',
): WordChallengeState {
  const activeUnits = expandUnitsForTileMode(word.units, tileMode);
  const missingIndices = pickMissingIndices(activeUnits, scaffoldLevel, rng);
  const missingSet = new Set(missingIndices);
  const filledMask = activeUnits.map((_, idx) => !missingSet.has(idx));
  const activeIndex = filledMask.findIndex((filled) => !filled);

  const requiredUnits = missingIndices.map((idx) => activeUnits[idx]!);
  const targetLettersSet = new Set(requiredUnits.map((u) => u.letters.toUpperCase()));
  const avoidMirrors = word.zoneId <= 2;

  const targetTileCount = Math.max(4, Math.min(7, requiredUnits.length + 3));
  const neededDistractors = Math.max(1, targetTileCount - requiredUnits.length);

  const primaryMissing = requiredUnits[0]!;
  const primaryPool =
    tileMode === 'digraph-teams' && primaryMissing.letters.length > 1
      ? [...DIGRAPH_POOL, ...VOWEL_POOL, ...SINGLE_CONSONANT_POOL]
      : isVowelUnit(primaryMissing)
        ? [...VOWEL_POOL, ...SINGLE_CONSONANT_POOL]
        : [...SINGLE_CONSONANT_POOL, ...VOWEL_POOL];

  const validDistractors = deterministicShuffle(
    primaryPool.filter((cand) => {
      const upper = cand.letters.toUpperCase();
      if (tileMode === 'single-letters' && upper.length > 1) return false;
      if (targetLettersSet.has(upper)) return false;
      if (avoidMirrors) {
        for (const targetLetter of targetLettersSet) {
          if (areMirrorConfusable(upper, targetLetter)) {
            return false;
          }
        }
      }
      return true;
    }),
    rng,
  );

  const seenDistractors = new Set<string>();
  const chosenDistractors: { letters: string; phonemeKey: string }[] = [];
  for (const cand of validDistractors) {
    const key = cand.letters.toUpperCase();
    if (!seenDistractors.has(key)) {
      seenDistractors.add(key);
      chosenDistractors.push(cand);
      if (chosenDistractors.length >= neededDistractors) break;
    }
  }

  const rawTiles: TileOption[] = [
    ...requiredUnits.map((u, idx) => ({
      id: `req-${idx}-${u.letters}`,
      letters: u.letters,
      phonemeKey: u.phonemeKey,
      used: false,
    })),
    ...chosenDistractors.map((d, idx) => ({
      id: `dist-${idx}-${d.letters}`,
      letters: d.letters,
      phonemeKey: d.phonemeKey,
      used: false,
    })),
  ];

  return {
    word,
    units: activeUnits,
    tileMode,
    scaffoldLevel,
    filledMask,
    activeIndex: activeIndex === -1 ? null : activeIndex,
    tiles: deterministicShuffle(rawTiles, rng),
    wrongAttemptsOnActive: 0,
    totalWrongAttempts: 0,
    usedHelp: false,
    showBeacon: false,
    showGhostLetter: false,
    isComplete: activeIndex === -1,
  };
}

export function findCorrectTileIdForActiveBox(state: WordChallengeState): string | null {
  if (state.activeIndex === null) return null;
  const expected = state.units[state.activeIndex];
  if (!expected) return null;
  const match = state.tiles.find(
    (t) => !t.used && t.letters.toUpperCase() === expected.letters.toUpperCase(),
  );
  return match ? match.id : null;
}

function advanceBoxState(
  state: WordChallengeState,
  tileId: string,
  usedHelp: boolean,
): WordChallengeState {
  if (state.activeIndex === null) return state;
  const nextFilled = [...state.filledMask];
  nextFilled[state.activeIndex] = true;

  const nextTiles = state.tiles.map((t) =>
    t.id === tileId ? { ...t, used: true } : t,
  );

  const nextActive = nextFilled.findIndex((filled) => !filled);
  const isComplete = nextActive === -1;

  return {
    ...state,
    filledMask: nextFilled,
    activeIndex: isComplete ? null : nextActive,
    tiles: nextTiles,
    wrongAttemptsOnActive: 0,
    usedHelp: state.usedHelp || usedHelp,
    showBeacon: false,
    showGhostLetter: false,
    isComplete,
  };
}

/**
 * Evaluates a child tapping/typing a tile with the 3-Tier Anti-Frustration Safety Net:
 * - Wrong try 1: warm coaching + gentle wooden chime
 * - Wrong try 2: golden sparkle beacon + soft ghost letter
 * - Wrong try 3: Eevee cheerfully places the right tile automatically!
 */
export function evaluateTileSelection(
  state: WordChallengeState,
  tileId: string,
): TileSelectionOutcome {
  if (state.isComplete || state.activeIndex === null) {
    return { state, result: 'ignored', chosenTile: null, expectedUnit: null };
  }

  const chosenTile = state.tiles.find((t) => t.id === tileId && !t.used) ?? null;
  const expectedUnit = state.units[state.activeIndex] ?? null;

  if (!chosenTile || !expectedUnit) {
    return { state, result: 'ignored', chosenTile: null, expectedUnit };
  }

  if (chosenTile.letters.toUpperCase() === expectedUnit.letters.toUpperCase()) {
    return {
      state: advanceBoxState(state, chosenTile.id, false),
      result: 'correct',
      chosenTile,
      expectedUnit,
    };
  }

  const nextWrongOnActive = state.wrongAttemptsOnActive + 1;
  const nextTotalWrong = state.totalWrongAttempts + 1;

  if (nextWrongOnActive === 1) {
    return {
      state: {
        ...state,
        wrongAttemptsOnActive: nextWrongOnActive,
        totalWrongAttempts: nextTotalWrong,
      },
      result: 'wrong-tier-1',
      chosenTile,
      expectedUnit,
    };
  }

  if (nextWrongOnActive === 2) {
    return {
      state: {
        ...state,
        wrongAttemptsOnActive: nextWrongOnActive,
        totalWrongAttempts: nextTotalWrong,
        showBeacon: true,
        showGhostLetter: true,
      },
      result: 'wrong-tier-2',
      chosenTile,
      expectedUnit,
    };
  }

  const correctTileId = findCorrectTileIdForActiveBox(state);
  if (!correctTileId) {
    return { state, result: 'ignored', chosenTile, expectedUnit };
  }

  const assistedState = advanceBoxState(
    {
      ...state,
      wrongAttemptsOnActive: nextWrongOnActive,
      totalWrongAttempts: nextTotalWrong,
    },
    correctTileId,
    true,
  );

  return {
    state: assistedState,
    result: 'auto-assist-tier-3',
    chosenTile,
    expectedUnit,
    autoPlacedTileId: correctTileId,
  };
}

export function triggerIdleHint(state: WordChallengeState): WordChallengeState {
  if (state.isComplete || state.activeIndex === null) return state;
  return {
    ...state,
    showBeacon: true,
    showGhostLetter: true,
  };
}

export function triggerEeveeHelp(state: WordChallengeState): {
  state: WordChallengeState;
  placedUnit: ActiveBoxUnit | null;
} {
  if (state.isComplete || state.activeIndex === null) {
    return { state, placedUnit: null };
  }
  const expectedUnit = state.units[state.activeIndex] ?? null;
  const correctTileId = findCorrectTileIdForActiveBox(state);
  if (!correctTileId || !expectedUnit) {
    return { state, placedUnit: null };
  }
  return {
    state: advanceBoxState(state, correctTileId, true),
    placedUnit: expectedUnit,
  };
}

export function findTileIdByKey(state: WordChallengeState, key: string): string | null {
  const upper = key.toUpperCase();
  if (!/^[A-Z]$/.test(upper)) return null;

  const exact = state.tiles.find((t) => !t.used && t.letters.toUpperCase() === upper);
  if (exact) return exact.id;

  if (state.activeIndex !== null) {
    const expected = state.units[state.activeIndex];
    if (expected && expected.letters.toUpperCase().startsWith(upper)) {
      const startsMatch = state.tiles.find(
        (t) => !t.used && t.letters.toUpperCase() === expected.letters.toUpperCase(),
      );
      if (startsMatch) return startsMatch.id;
    }
  }

  return null;
}

export function getPointOfErrorHint(
  chosenTile: TileOption,
  expectedUnit: PhonemeUnit,
  focusWord: string,
  tier: 1 | 2,
): string {
  const chosenInfo = getPhonemeInfo(chosenTile.phonemeKey);
  const expectedInfo = getPhonemeInfo(expectedUnit.phonemeKey);

  if (tier === 1) {
    return `That tile says ${chosenInfo.ttsCue} like ${chosenInfo.keyword}! Listen closely to ${focusWord}. We need the ${expectedInfo.ttsCue} sound like ${expectedInfo.keyword}!`;
  }
  return `Look for the glowing tile! We need ${expectedInfo.ttsCue} like ${expectedInfo.keyword} to spell ${focusWord}!`;
}
