import { areMirrorConfusable, getPhonemeInfo } from '../data/phonemes';
import type {
  PhonemeUnit,
  ScaffoldMode,
  WordEntry,
  WordMasteryRecord,
} from '../data/types';

export type EffectiveScaffoldLevel = 'starter' | 'builder' | 'explorer';

export interface TileOption {
  id: string;
  letters: string;
  phonemeKey: string;
  used: boolean;
}

export interface WordChallengeState {
  word: WordEntry;
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
  expectedUnit: PhonemeUnit | null;
  autoPlacedTileId?: string;
}

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
 * New words always begin in Starter mode (1 missing box) under Auto-Adaptive
 * so a 5-year-old builds immediate confidence and never faces a wall of blanks.
 */
export function resolveEffectiveScaffold(
  mode: ScaffoldMode,
  mastery?: WordMasteryRecord,
): EffectiveScaffoldLevel {
  if (mode === 'extra-help') return 'starter';
  if (mode === 'builder') return 'builder';
  if (mode === 'explorer') return 'explorer';

  // Auto-Adaptive: start gentle!
  if (!mastery || mastery.cleanWins === 0) return 'starter';
  if (mastery.cleanWins === 1) return 'builder';
  return 'explorer';
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
  const vowels = new Set(['A', 'E', 'I', 'O', 'U', 'EA', 'EE', 'AY', 'AI', 'OO', 'OU', 'IE', 'UY', 'IGH', 'AR', 'ER', 'UR', 'OW']);
  return vowels.has(unit.letters.toUpperCase());
}

/**
 * Picks indices that should start blank based on scaffold level.
 * Starter mode blanks 1 sound box (prioritizing medial vowel or initial/final focus).
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

  if (scaffoldLevel === 'starter') {
    // Prefer a regular sound box first; avoid leaving an irregular Heart-Word chunk as the only blank
    const regularIndices = units
      .map((u, idx) => ({ u, idx }))
      .filter(({ u }) => !u.isHeartWord)
      .map(({ idx }) => idx);
    const pool = regularIndices.length > 0 ? regularIndices : units.map((_, idx) => idx);
    const picked = pool[Math.floor(rng() * pool.length)] ?? 0;
    return [picked];
  }

  // Builder mode: 2 missing boxes (capped at units.length)
  const targetBlanks = Math.min(2, count);
  const allIndices = deterministicShuffle(
    units.map((_, idx) => idx),
    rng,
  );
  return allIndices.slice(0, targetBlanks).sort((a, b) => a - b);
}

/**
 * Generates choice tiles for the Elkonin board.
 * Enforces the mirror-confusion filter (B/D, P/Q, M/W, N/U, S/Z) in Zones 1–2.
 */
export function buildWordChallenge(
  word: WordEntry,
  scaffoldLevel: EffectiveScaffoldLevel,
  rng: () => number = Math.random,
): WordChallengeState {
  const missingIndices = pickMissingIndices(word.units, scaffoldLevel, rng);
  const missingSet = new Set(missingIndices);
  const filledMask = word.units.map((_, idx) => !missingSet.has(idx));
  const activeIndex = filledMask.findIndex((filled) => !filled);

  const requiredUnits = missingIndices.map((idx) => word.units[idx]!);
  const targetLettersSet = new Set(requiredUnits.map((u) => u.letters.toUpperCase()));
  const avoidMirrors = word.zoneId <= 2;

  const targetTileCount = Math.max(4, Math.min(6, requiredUnits.length + 3));
  const neededDistractors = Math.max(1, targetTileCount - requiredUnits.length);

  // Build candidate distractor pool tailored to missing tile types
  const primaryMissing = requiredUnits[0]!;
  const primaryPool =
    primaryMissing.letters.length > 1
      ? [...DIGRAPH_POOL, ...VOWEL_POOL, ...SINGLE_CONSONANT_POOL]
      : isVowelUnit(primaryMissing)
        ? [...VOWEL_POOL, ...SINGLE_CONSONANT_POOL]
        : [...SINGLE_CONSONANT_POOL, ...VOWEL_POOL];

  const validDistractors = deterministicShuffle(
    primaryPool.filter((cand) => {
      const upper = cand.letters.toUpperCase();
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

  // Deduplicate distractor letters
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
  const expected = state.word.units[state.activeIndex];
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
  const expectedUnit = state.word.units[state.activeIndex] ?? null;

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

  // Tier 3 (3rd wrong try): Eevee cheerfully places the letter so nothing is insurmountable!
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

/**
 * Triggered after a 6.5s idle pause: gently illuminates the golden sparkle beacon
 * and soft ghost letter inside the active Elkonin box.
 */
export function triggerIdleHint(state: WordChallengeState): WordChallengeState {
  if (state.isComplete || state.activeIndex === null) return state;
  return {
    ...state,
    showBeacon: true,
    showGhostLetter: true,
  };
}

/**
 * Triggered anytime the child taps "Eevee Help!": Eevee cheerfully places
 * the needed tile for the active Elkonin box.
 */
export function triggerEeveeHelp(state: WordChallengeState): {
  state: WordChallengeState;
  placedUnit: PhonemeUnit | null;
} {
  if (state.isComplete || state.activeIndex === null) {
    return { state, placedUnit: null };
  }
  const expectedUnit = state.word.units[state.activeIndex] ?? null;
  const correctTileId = findCorrectTileIdForActiveBox(state);
  if (!correctTileId || !expectedUnit) {
    return { state, placedUnit: null };
  }
  return {
    state: advanceBoxState(state, correctTileId, true),
    placedUnit: expectedUnit,
  };
}

/**
 * Finds an unused tile matching keyboard input (e.g. pressing "U" or "S").
 */
export function findTileIdByKey(state: WordChallengeState, key: string): string | null {
  const upper = key.toUpperCase();
  if (!/^[A-Z]$/.test(upper)) return null;

  // Prefer exact single-letter match first
  const exact = state.tiles.find((t) => !t.used && t.letters.toUpperCase() === upper);
  if (exact) return exact.id;

  // If the active expected unit starts with this letter (e.g. "SH" or "CK"), match it
  if (state.activeIndex !== null) {
    const expected = state.word.units[state.activeIndex];
    if (expected && expected.letters.toUpperCase().startsWith(upper)) {
      const startsMatch = state.tiles.find(
        (t) => !t.used && t.letters.toUpperCase() === expected.letters.toUpperCase(),
      );
      if (startsMatch) return startsMatch.id;
    }
  }

  return null;
}

/**
 * Builds a warm, point-of-error phonetic coaching line when the child taps a wrong tile.
 */
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
