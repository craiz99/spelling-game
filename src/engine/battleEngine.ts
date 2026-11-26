import { getWordsByZone } from '../data/curriculum';
import { MENU_CARDS } from '../data/menuDecks';
import { PARTNER_MOVES } from '../data/rewards';
import type {
  MenuCardItem,
  PartnerMoveDef,
  PartnerMoveId,
  StatusCondition,
  TownChallengeMode,
  WordEntry,
  WordMasteryRecord,
  ZoneId,
} from '../data/types';
import { getTownChallengeMode } from './overworldEngine';

export type BattlePhase =
  | 'clinic-pick'
  | 'spelling'
  | 'blending'
  | 'action-ready'
  | 'move-animation'
  | 'victory';

export interface ClinicPatientInfo {
  status: StatusCondition;
  prompt: string;
  targetCurative: MenuCardItem;
  choices: MenuCardItem[];
}

export interface BattleWordResult {
  wordId: string;
  usedHelp: boolean;
  wrongAttempts: number;
  starsEarned: number;
}

export interface BattleState {
  zoneId: ZoneId;
  challengeMode: TownChallengeMode;
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
  bagItemsEarned: number;
  caughtPokemonIds: number[];
  activeMove: PartnerMoveDef;
  wordResults: BattleWordResult[];
  clinicPatient: ClinicPatientInfo | null;
}

export const BATTLE_LENGTH = 3;

const MEDICINE_ITEMS = MENU_CARDS.filter((c) => c.deckId === 'medicine');

/**
 * Creates a friendly Nurse Joy Clinic diagnosis & 3-bottle curative tray
 * paired directly with the current Zone 4 word!
 */
export function createClinicPatientForWord(
  word: WordEntry,
  rng: () => number = Math.random,
): ClinicPatientInfo {
  const byDisplay = MEDICINE_ITEMS.find(
    (m) => m.label.toUpperCase() === word.displayWord.toUpperCase(),
  );
  const targetCurative =
    byDisplay ??
    MEDICINE_ITEMS.find((m) => m.itemSlug === word.itemSlug) ??
    MEDICINE_ITEMS[0]!;

  const distractors = MEDICINE_ITEMS.filter((m) => m.id !== targetCurative.id)
    .sort(() => rng() - 0.5)
    .slice(0, 2);

  const choices = [targetCurative, ...distractors].sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  const status: StatusCondition = targetCurative.statusTag ?? 'HP';
  const prompt = `${word.pokemonName} needs help! Pick ${targetCurative.label} from the Medicine Pocket!`;

  return {
    status,
    prompt,
    targetCurative,
    choices,
  };
}

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

  const orderedUnmastered =
    zoneId === 1 ? unmastered : [...unmastered].sort(() => rng() - 0.5);
  const shuffledMastered = [...mastered].sort(() => rng() - 0.5);

  return [...orderedUnmastered, ...shuffledMastered].slice(0, count);
}

export function resolvePartnerMove(moveId: PartnerMoveId): PartnerMoveDef {
  return PARTNER_MOVES.find((m) => m.id === moveId) ?? PARTNER_MOVES[0]!;
}

export function createBattleState(
  zoneId: ZoneId,
  wordMastery: Record<string, WordMasteryRecord>,
  selectedMoveId: PartnerMoveId,
  rng: () => number = Math.random,
  overrideMode?: TownChallengeMode,
): BattleState {
  const challengeMode = overrideMode ?? getTownChallengeMode(zoneId);
  const wordCount = overrideMode === 'wild-catch' && zoneId === 1 ? BATTLE_LENGTH : BATTLE_LENGTH;
  const words = selectBattleWords(zoneId, wordMastery, wordCount, rng);
  const firstWord = words[0]!;
  const isClinic = challengeMode === 'clinic-heal';

  return {
    zoneId,
    challengeMode,
    words,
    currentWordIndex: 0,
    phase: isClinic ? 'clinic-pick' : 'spelling',
    starHeartsFilled: 0,
    targetStarHearts: words.length,
    totalStarsEarned: 0,
    blendsCompleted: 0,
    firstTryCount: 0,
    usedHelpCount: 0,
    bagItemsEarned: 0,
    caughtPokemonIds: [],
    activeMove: resolvePartnerMove(selectedMoveId),
    wordResults: [],
    clinicPatient: isClinic ? createClinicPatientForWord(firstWord, rng) : null,
  };
}

export function getCurrentBattleWord(state: BattleState): WordEntry | null {
  return state.words[state.currentWordIndex] ?? null;
}

/**
 * Transitions Zone 4 Nurse Joy Clinic from picking the right curative bottle
 * into spelling its focus word to activate the cure!
 */
export function completeClinicMedicinePick(state: BattleState): BattleState {
  if (state.phase !== 'clinic-pick') return state;
  return {
    ...state,
    phase: 'spelling',
  };
}

export function setBattleActiveMove(
  state: BattleState,
  moveId: PartnerMoveId,
): BattleState {
  return {
    ...state,
    activeMove: resolvePartnerMove(moveId),
  };
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
 * Transitions from Paw-Slide Blending to the interactive Town Payoff Action
 * (Throw Poké Ball / Toss Berry & Ball / Pack Mart Item / Heal Patient / Launch Elemental Move!)
 */
export function completeBattleWordBlending(state: BattleState): BattleState {
  if (state.phase !== 'blending') return state;
  return {
    ...state,
    phase: 'action-ready',
    blendsCompleted: state.blendsCompleted + 1,
  };
}

/**
 * Fires when the player taps the interactive Payoff button (Throw Poké Ball! / Launch Move! / Heal!),
 * starting the animated VFX sequence and awarding Star Hearts!
 */
export function triggerBattlePayoffAction(state: BattleState): BattleState {
  if (state.phase !== 'action-ready' && state.phase !== 'blending') return state;
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
    blendsCompleted:
      state.phase === 'blending' ? state.blendsCompleted + 1 : state.blendsCompleted,
    bagItemsEarned:
      state.challengeMode === 'mart-quest'
        ? state.bagItemsEarned + 1
        : state.bagItemsEarned,
    caughtPokemonIds: caught,
  };
}

/**
 * Advances to the next encounter word (or enters Victory Celebration!).
 */
export function finishBattleMoveAnimation(
  state: BattleState,
  rng: () => number = Math.random,
): BattleState {
  if (state.phase !== 'move-animation') return state;
  const nextIndex = state.currentWordIndex + 1;
  if (nextIndex >= state.words.length) {
    return {
      ...state,
      phase: 'victory',
    };
  }
  const nextWord = state.words[nextIndex]!;
  const isClinic = state.challengeMode === 'clinic-heal';

  return {
    ...state,
    currentWordIndex: nextIndex,
    phase: isClinic ? 'clinic-pick' : 'spelling',
    clinicPatient: isClinic ? createClinicPatientForWord(nextWord, rng) : null,
  };
}
