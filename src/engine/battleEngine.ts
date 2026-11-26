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
  statusLabel: string;
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

/** 5 encounters per town stage (~50%+ longer gameplay for richer practice!) */
export const BATTLE_LENGTH = 5;

const MEDICINE_ITEMS = MENU_CARDS.filter((c) => c.deckId === 'medicine');

const STATUS_DESCRIPTIONS: Record<StatusCondition, { label: string; symptom: string }> = {
  BRN: { label: 'Burned', symptom: 'has a hot burn' },
  FRZ: { label: 'Frozen', symptom: 'is frozen in chilly ice' },
  PAR: { label: 'Paralyzed', symptom: 'has electric static tingles' },
  PSN: { label: 'Poisoned', symptom: 'has purple poison bubbles' },
  SLP: { label: 'Asleep', symptom: 'fell fast asleep' },
  HP: { label: 'Tired', symptom: 'needs energy and healing' },
  ITEM: { label: 'Care', symptom: 'needs a helpful curative' },
};

/**
 * Creates a visual Nurse Joy Clinic diagnosis & 3-bottle curative tray
 * paired directly with the current Zone 4 curative word & status condition!
 */
export function createClinicPatientForWord(
  word: WordEntry,
  rng: () => number = Math.random,
): ClinicPatientInfo {
  const byDisplay = MEDICINE_ITEMS.find(
    (m) => m.label.toUpperCase() === word.displayWord.toUpperCase(),
  );
  const bySlug = word.itemSlug
    ? MEDICINE_ITEMS.find((m) => m.itemSlug === word.itemSlug)
    : undefined;
  const byStatus = word.statusCondition
    ? MEDICINE_ITEMS.find((m) => m.statusTag === word.statusCondition)
    : undefined;
  const targetCurative = byDisplay ?? bySlug ?? byStatus ?? MEDICINE_ITEMS[0]!;

  const distractors = MEDICINE_ITEMS.filter((m) => m.id !== targetCurative.id)
    .sort(() => rng() - 0.5)
    .slice(0, 2);

  const choices = [targetCurative, ...distractors].sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  const status: StatusCondition = word.statusCondition ?? targetCurative.statusTag ?? 'HP';
  const desc = STATUS_DESCRIPTIONS[status];
  const prompt = `${word.pokemonName} ${desc.symptom}! Pick ${targetCurative.label} to help!`;

  return {
    status,
    statusLabel: desc.label,
    prompt,
    targetCurative,
    choices,
  };
}

/**
 * Selects 5 words from the chosen zone:
 * - Prioritizes unmastered words before mastered review words
 * - Guarantees ZERO duplicate Pokémon species in the same stage
 * - Prioritizes Pokémon species the player hasn't caught yet!
 */
export function selectBattleWords(
  zoneId: ZoneId,
  wordMastery: Record<string, WordMasteryRecord>,
  count: number = BATTLE_LENGTH,
  rng: () => number = Math.random,
  caughtPokemonIds: readonly number[] = [],
): WordEntry[] {
  const pool = getWordsByZone(zoneId);
  if (pool.length <= count) return [...pool];

  const caughtSet = new Set(caughtPokemonIds);
  const unmastered = pool.filter((w) => {
    const rec = wordMastery[w.id];
    return !rec || rec.status !== 'mastered';
  });
  const mastered = pool.filter((w) => wordMastery[w.id]?.status === 'mastered');

  // Shuffle within mastery tiers, bubbling uncaught Pokémon to the front for exciting variety!
  const prioritizeVariety = (items: WordEntry[]): WordEntry[] => {
    const shuffled = [...items].sort(() => rng() - 0.5);
    const uncaught = shuffled.filter((w) => !caughtSet.has(w.pokemonId));
    const alreadyCaught = shuffled.filter((w) => caughtSet.has(w.pokemonId));
    return [...uncaught, ...alreadyCaught];
  };

  const CORE_CURATIVE_IDS = new Set([
    'z4-potion',
    'z4-burn-heal',
    'z4-ice-heal',
    'z4-antidote',
    'z4-awakening',
    'z4-paralyze-heal',
    'z4-full-heal',
    'z4-revive',
  ]);

  // In Zone 1, keep 2-sound easy words near the front; in Zone 4, lead with real named curatives!
  const orderedUnmastered =
    zoneId === 1
      ? [
          ...prioritizeVariety(unmastered.filter((w) => w.units.length === 2)),
          ...prioritizeVariety(unmastered.filter((w) => w.units.length > 2)),
        ]
      : zoneId === 4
        ? [
            ...prioritizeVariety(unmastered.filter((w) => CORE_CURATIVE_IDS.has(w.id))),
            ...prioritizeVariety(unmastered.filter((w) => !CORE_CURATIVE_IDS.has(w.id))),
          ]
        : prioritizeVariety(unmastered);
  const orderedMastered = prioritizeVariety(mastered);

  const candidates = [...orderedUnmastered, ...orderedMastered];
  const picked: WordEntry[] = [];
  const usedPokemonIds = new Set<number>();

  // Pass 1: strictly distinct Pokémon species
  for (const word of candidates) {
    if (picked.length >= count) break;
    if (!usedPokemonIds.has(word.pokemonId)) {
      picked.push(word);
      usedPokemonIds.add(word.pokemonId);
    }
  }

  // Pass 2 fallback if a zone ever has fewer distinct species than count
  for (const word of candidates) {
    if (picked.length >= count) break;
    if (!picked.includes(word)) {
      picked.push(word);
    }
  }

  return picked;
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
  caughtPokemonIds: readonly number[] = [],
): BattleState {
  const challengeMode = overrideMode ?? getTownChallengeMode(zoneId);
  const words = selectBattleWords(zoneId, wordMastery, BATTLE_LENGTH, rng, caughtPokemonIds);
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

export function completeBattleWordBlending(state: BattleState): BattleState {
  if (state.phase !== 'blending') return state;
  return {
    ...state,
    phase: 'action-ready',
    blendsCompleted: state.blendsCompleted + 1,
  };
}

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
