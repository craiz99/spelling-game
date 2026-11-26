import { getWordsByZone } from '../data/curriculum';
import { PARTNER_MOVES } from '../data/rewards';
import type {
  PartnerMoveDef,
  PartnerMoveId,
  WordEntry,
  WordMasteryRecord,
  ZoneId,
} from '../data/types';

export type BattlePhase = 'spelling' | 'blending' | 'move-animation' | 'victory';

export interface BattleWordResult {
  wordId: string;
  usedHelp: boolean;
  wrongAttempts: number;
  starsEarned: number;
}

export interface BattleState {
  zoneId: ZoneId;
  words: WordEntry[];
  currentWordIndex: number;
  phase: BattlePhase;
  /** Star Hearts filled so far (0..words.length) — zero harsh HP bars! */
  starHeartsFilled: number;
  targetStarHearts: number;
  totalStarsEarned: number;
  blendsCompleted: number;
  firstTryCount: number;
  usedHelpCount: number;
  caughtPokemonIds: number[];
  activeMove: PartnerMoveDef;
  wordResults: BattleWordResult[];
}

export const BATTLE_LENGTH = 3;

/**
 * Selects 3 words from the chosen zone, prioritizing new and learning words
 * before mastered review words, keeping Zone 1 continuant-first order gentle.
 */
export function selectBattleWords(
  zoneId: ZoneId,
  wordMastery: Record<string, WordMasteryRecord>,
  count: number = BATTLE_LENGTH,
  rng: () => number = Math.random,
): WordEntry[] {
  const pool = getWordsByZone(zoneId);
  if (pool.length <= count) return [...pool];

  const unmastered = pool.filter((w) => {
    const rec = wordMastery[w.id];
    return !rec || rec.status !== 'mastered';
  });
  const mastered = pool.filter((w) => wordMastery[w.id]?.status === 'mastered');

  // Keep Zone 1 unmastered words in pedagogical continuant-first order initially
  const orderedUnmastered =
    zoneId === 1
      ? unmastered
      : [...unmastered].sort(() => rng() - 0.5);
  const shuffledMastered = [...mastered].sort(() => rng() - 0.5);

  const selected = [...orderedUnmastered, ...shuffledMastered].slice(0, count);
  return selected;
}

export function resolvePartnerMove(moveId: PartnerMoveId): PartnerMoveDef {
  return PARTNER_MOVES.find((m) => m.id === moveId) ?? PARTNER_MOVES[0]!;
}

export function createBattleState(
  zoneId: ZoneId,
  wordMastery: Record<string, WordMasteryRecord>,
  selectedMoveId: PartnerMoveId,
  rng: () => number = Math.random,
): BattleState {
  const words = selectBattleWords(zoneId, wordMastery, BATTLE_LENGTH, rng);
  return {
    zoneId,
    words,
    currentWordIndex: 0,
    phase: 'spelling',
    starHeartsFilled: 0,
    targetStarHearts: words.length,
    totalStarsEarned: 0,
    blendsCompleted: 0,
    firstTryCount: 0,
    usedHelpCount: 0,
    caughtPokemonIds: [],
    activeMove: resolvePartnerMove(selectedMoveId),
    wordResults: [],
  };
}

export function getCurrentBattleWord(state: BattleState): WordEntry | null {
  return state.words[state.currentWordIndex] ?? null;
}

/**
 * Transitions from spelling Elkonin boxes into Paw-Slide Blending.
 */
export function completeBattleWordSpelling(
  state: BattleState,
  meta: { usedHelp: boolean; wrongAttempts: number },
): BattleState {
  if (state.phase !== 'spelling') return state;
  const word = getCurrentBattleWord(state);
  if (!word) return state;

  const isFirstTry = !meta.usedHelp && meta.wrongAttempts === 0;
  // Every finished word earns generous Star Stickers (bonus star on clean win, never 0!)
  const starsForWord = isFirstTry ? 3 : 2;

  return {
    ...state,
    phase: 'blending',
    firstTryCount: state.firstTryCount + (isFirstTry ? 1 : 0),
    usedHelpCount: state.usedHelpCount + (meta.usedHelp ? 1 : 0),
    wordResults: [
      ...state.wordResults,
      {
        wordId: word.id,
        usedHelp: meta.usedHelp,
        wrongAttempts: meta.wrongAttempts,
        starsEarned: starsForWord,
      },
    ],
  };
}

/**
 * Transitions from Paw-Slide Blending to Eevee's joyful Partner Move animation
 * and fills the next Star Heart!
 */
export function completeBattleWordBlending(state: BattleState): BattleState {
  if (state.phase !== 'blending') return state;
  const word = getCurrentBattleWord(state);
  const lastResult = state.wordResults[state.wordResults.length - 1];
  const starsGain = lastResult ? lastResult.starsEarned : 2;

  const caught =
    word && !state.caughtPokemonIds.includes(word.pokemonId)
      ? [...state.caughtPokemonIds, word.pokemonId]
      : state.caughtPokemonIds;

  return {
    ...state,
    phase: 'move-animation',
    starHeartsFilled: Math.min(state.targetStarHearts, state.starHeartsFilled + 1),
    totalStarsEarned: state.totalStarsEarned + starsGain,
    blendsCompleted: state.blendsCompleted + 1,
    caughtPokemonIds: caught,
  };
}

/**
 * Advances to the next word in the encounter or enters the Victory Celebration!
 * Zero Game Over screens — every battle ends in joy and progress.
 */
export function finishBattleMoveAnimation(state: BattleState): BattleState {
  if (state.phase !== 'move-animation') return state;
  const nextIndex = state.currentWordIndex + 1;
  if (nextIndex >= state.words.length) {
    return {
      ...state,
      phase: 'victory',
    };
  }
  return {
    ...state,
    currentWordIndex: nextIndex,
    phase: 'spelling',
  };
}
