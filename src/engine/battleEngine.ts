import { ALPHABET_LETTERS, type AlphabetLetterDef } from '../data/alphabet';
import { CURRICULUM_WORDS, getWordsByZone } from '../data/curriculum';
import { MENU_CARDS } from '../data/menuDecks';
import { areMirrorConfusable } from '../data/phonemes';
import { PARTNER_MOVES } from '../data/rewards';
import type {
  MapNodeId,
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
  | 'menu-pick'
  | 'letter-catch'
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

export interface MenuEncounterInfo {
  targetCard: MenuCardItem;
  choices: MenuCardItem[];
  prompt: string;
}

export interface LetterCatchEncounterInfo {
  targetLetter: AlphabetLetterDef;
  choices: AlphabetLetterDef[];
}

export interface BattleWordResult {
  wordId: string;
  usedHelp: boolean;
  wrongAttempts: number;
  starsEarned: number;
}

export interface BattleState {
  zoneId: ZoneId;
  landmarkId: MapNodeId;
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
  menuEncounter: MenuEncounterInfo | null;
  letterEncounter: LetterCatchEncounterInfo | null;
  /** Index inside the 5-encounter run where an integrated A–Z Wild Letter Catch triggers (or -1 if all 26 mastered) */
  letterCatchSlotIndex: number;
  letterCatchTarget: AlphabetLetterDef | null;
  letterCatchActive: boolean;
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
 * Progressive A–Z letter slices woven naturally across Kanto towns
 * so children master all 26 letters organically while adventuring!
 */
export const ZONE_LETTER_SLICES: Record<ZoneId, readonly string[]> = {
  1: ['A', 'M', 'S', 'F', 'N', 'R', 'G', 'O', 'U', 'Y'],
  2: ['B', 'C', 'D', 'H', 'I', 'P', 'T', 'V', 'W', 'X'],
  3: ['E', 'J', 'K', 'L', 'Q', 'Z'],
  4: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'],
  5: ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  6: ALPHABET_LETTERS.map((l) => l.letter),
};

/**
 * Picks the next unmastered A–Z letter for the active zone (preferring that zone's
 * letter slice first, then gracefully backfilling any remaining unmastered A–Z letter).
 */
export function selectIntegratedLetterForZone(
  zoneId: ZoneId,
  masteredLetters: readonly string[],
  rng: () => number = Math.random,
): AlphabetLetterDef | null {
  const masteredSet = new Set(masteredLetters.map((l) => l.toUpperCase()));
  const slice = ZONE_LETTER_SLICES[zoneId] ?? [];

  const slicePool = ALPHABET_LETTERS.filter(
    (item) => slice.includes(item.letter) && !masteredSet.has(item.letter),
  );
  if (slicePool.length > 0) {
    return slicePool[Math.floor(rng() * slicePool.length)] ?? slicePool[0]!;
  }

  const remainingPool = ALPHABET_LETTERS.filter((item) => !masteredSet.has(item.letter));
  if (remainingPool.length > 0) {
    return remainingPool[Math.floor(rng() * remainingPool.length)] ?? remainingPool[0]!;
  }

  return null;
}

/**
 * Builds 4 kid-friendly letter choices (avoiding mirror-confusion distractors like b/d, m/w).
 */
export function buildIntegratedLetterChoices(
  target: AlphabetLetterDef,
  rng: () => number = Math.random,
): AlphabetLetterDef[] {
  const distractors = ALPHABET_LETTERS.filter(
    (item) =>
      item.letter !== target.letter && !areMirrorConfusable(item.letter, target.letter),
  )
    .sort(() => rng() - 0.5)
    .slice(0, 3);

  return [target, ...distractors].sort((a, b) => a.letter.localeCompare(b.letter));
}

/**
 * Finds the matching Nintendo Switch MenuCardItem for a curriculum word, if it is a
 * Switch Pause Menu, Battle Menu, Medicine/Bag Item, or Basic Attack word!
 */
export function findMenuCardForWord(word: WordEntry): MenuCardItem | null {
  const upperDisplay = word.displayWord.trim().toUpperCase();
  const upperFocus = word.focusWord.trim().toUpperCase();

  // Exact label match (MAP, RUN, BAG, DEX, SAVE, PARTY, FIGHT, BERRY, POTION, SUPER POTION, TACKLE, EMBER, etc.)
  const byDisplay = MENU_CARDS.find((c) => c.label.toUpperCase() === upperDisplay);
  if (byDisplay) return byDisplay;

  // Poké Ball match (Zone 3 BALL -> POKÉ BALL)
  if (upperDisplay === 'BALL' || word.itemSlug === 'poke-ball') {
    return MENU_CARDS.find((c) => c.id === 'med-pokeball') ?? null;
  }

  // Exact focusWord match for multi-word menu cards
  const byFocus = MENU_CARDS.find(
    (c) => c.focusWord.toUpperCase() === upperFocus && c.deckId !== 'medicine',
  );
  if (byFocus && (word.category === 'menu' || word.category === 'attack')) {
    return byFocus;
  }

  return null;
}

/**
 * Builds an authentic 3-card Nintendo Switch Menu pick encounter paired with a menu word,
 * so the child picks the Switch button AND then spells & blends that menu item!
 */
export function createMenuEncounterForWord(
  word: WordEntry,
  rng: () => number = Math.random,
): MenuEncounterInfo | null {
  const targetCard = findMenuCardForWord(word);
  if (!targetCard) return null;

  const sameDeck = MENU_CARDS.filter(
    (c) => c.deckId === targetCard.deckId && c.id !== targetCard.id && c.label !== targetCard.label,
  );
  const distractors = [...sameDeck].sort(() => rng() - 0.5).slice(0, 2);
  const choices = [targetCard, ...distractors].sort((a, b) => a.label.localeCompare(b.label));

  return {
    targetCard,
    choices,
    prompt: targetCard.prompt,
  };
}

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

const CORE_CURATIVE_IDS = new Set([
  'z4-potion',
  'z4-super-potion',
  'z4-burn-heal',
  'z4-ice-heal',
  'z4-antidote',
  'z4-awakening',
  'z4-paralyze-heal',
  'z4-full-heal',
  'z4-revive',
]);

/**
 * Selects 5 words from the chosen zone:
 * - Prioritizes unmastered words before mastered review words
 * - Guarantees ZERO duplicate Pokémon species in the same stage
 * - Prioritizes Pokémon species the player hasn't caught yet
 * - Guarantees at least 1 Switch Menu word is woven into every non-clinic stage!
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

  const prioritizeVariety = (items: WordEntry[]): WordEntry[] => {
    const shuffled = [...items].sort(() => rng() - 0.5);
    const uncaught = shuffled.filter((w) => !caughtSet.has(w.pokemonId));
    const alreadyCaught = shuffled.filter((w) => caughtSet.has(w.pokemonId));
    return [...uncaught, ...alreadyCaught];
  };

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

  // Guarantee at least 1 Switch Menu word in non-clinic stages (placed at index >= 1 so slot 0 stays smooth)
  if (zoneId !== 4 && count >= 3 && !picked.some((w) => findMenuCardForWord(w) !== null)) {
    const zoneMenuCandidates = candidates.filter(
      (w) => findMenuCardForWord(w) !== null && !usedPokemonIds.has(w.pokemonId),
    );
    const fallbackMenu =
      zoneMenuCandidates[0] ??
      candidates.find((w) => findMenuCardForWord(w) !== null && !picked.includes(w));
    if (fallbackMenu) {
      picked[Math.min(2, picked.length - 1)] = fallbackMenu;
    }
  }

  // If slot 0 happened to be a menu word in Zone 1, gently swap with a non-menu starter so Encounter 1 opens cleanly into spelling
  if (zoneId === 1 && picked.length >= 3 && findMenuCardForWord(picked[0]!) !== null) {
    const nonMenuIdx = picked.findIndex((w, i) => i > 0 && findMenuCardForWord(w) === null);
    if (nonMenuIdx > 0) {
      const tmp = picked[0]!;
      picked[0] = picked[nonMenuIdx]!;
      picked[nonMenuIdx] = tmp;
    }
  }

  return picked;
}

/**
 * Adaptive Kanto City Mix for Saffron City (replacing Menu Camp):
 * Pulls unmastered/practicing words + Switch Menu words across all unlocked zones
 * with distinct Pokémon species, reusing our full BattleScreen engine!
 */
export function selectSaffronCityWords(
  unlockedZones: readonly ZoneId[],
  wordMastery: Record<string, WordMasteryRecord>,
  count: number = BATTLE_LENGTH,
  rng: () => number = Math.random,
  caughtPokemonIds: readonly number[] = [],
): WordEntry[] {
  const allowedZones = new Set<ZoneId>(unlockedZones.length > 0 ? unlockedZones : [1, 2, 3]);
  const pool = CURRICULUM_WORDS.filter((w) => allowedZones.has(w.zoneId));
  const caughtSet = new Set(caughtPokemonIds);

  const shuffled = [...pool].sort(() => rng() - 0.5);
  const menuWords = shuffled.filter((w) => findMenuCardForWord(w) !== null);
  const learningWords = shuffled.filter(
    (w) => findMenuCardForWord(w) === null && wordMastery[w.id]?.status !== 'mastered',
  );
  const otherWords = shuffled.filter(
    (w) => findMenuCardForWord(w) === null && wordMastery[w.id]?.status === 'mastered',
  );

  // Put Abra / Psychic / uncaught pals near the front!
  const sortWithPals = (items: WordEntry[]) =>
    [...items].sort((a, b) => {
      const aBoost = a.pokemonId === 63 ? -2 : !caughtSet.has(a.pokemonId) ? -1 : 0;
      const bBoost = b.pokemonId === 63 ? -2 : !caughtSet.has(b.pokemonId) ? -1 : 0;
      return aBoost - bBoost;
    });

  const picked: WordEntry[] = [];
  const usedPokemonIds = new Set<number>();

  const pushUnique = (list: WordEntry[], limit: number) => {
    for (const w of list) {
      if (picked.length >= limit) break;
      if (!usedPokemonIds.has(w.pokemonId) && !picked.includes(w)) {
        picked.push(w);
        usedPokemonIds.add(w.pokemonId);
      }
    }
  };

  // Start with 1 regular learning word, then weave in 2 Switch Menu words + 2 mixed review words!
  pushUnique(sortWithPals(learningWords), 1);
  pushUnique(sortWithPals(menuWords), 3);
  pushUnique(sortWithPals([...learningWords, ...otherWords, ...menuWords]), count);

  return picked.slice(0, count);
}

export function resolvePartnerMove(moveId: PartnerMoveId): PartnerMoveDef {
  return PARTNER_MOVES.find((m) => m.id === moveId) ?? PARTNER_MOVES[0]!;
}

function resolveInitialPhaseForEncounter(
  word: WordEntry,
  challengeMode: TownChallengeMode,
  rng: () => number,
): {
  phase: BattlePhase;
  clinicPatient: ClinicPatientInfo | null;
  menuEncounter: MenuEncounterInfo | null;
} {
  if (challengeMode === 'clinic-heal') {
    return {
      phase: 'clinic-pick',
      clinicPatient: createClinicPatientForWord(word, rng),
      menuEncounter: null,
    };
  }
  const menuEncounter = createMenuEncounterForWord(word, rng);
  if (menuEncounter) {
    return {
      phase: 'menu-pick',
      clinicPatient: null,
      menuEncounter,
    };
  }
  return {
    phase: 'spelling',
    clinicPatient: null,
    menuEncounter: null,
  };
}

export interface CreateBattleOptions {
  landmarkId?: MapNodeId;
  overrideMode?: TownChallengeMode;
  caughtPokemonIds?: readonly number[];
  masteredLetters?: readonly string[];
  unlockedZones?: readonly ZoneId[];
}

export function createBattleState(
  zoneId: ZoneId,
  wordMastery: Record<string, WordMasteryRecord>,
  selectedMoveId: PartnerMoveId,
  rng: () => number = Math.random,
  overrideModeOrOpts?: TownChallengeMode | CreateBattleOptions,
  caughtPokemonIdsArg: readonly number[] = [],
): BattleState {
  const opts: CreateBattleOptions =
    typeof overrideModeOrOpts === 'string'
      ? { overrideMode: overrideModeOrOpts, caughtPokemonIds: caughtPokemonIdsArg }
      : (overrideModeOrOpts ?? { caughtPokemonIds: caughtPokemonIdsArg });

  const landmarkId: MapNodeId =
    opts.landmarkId ??
    (zoneId === 1
      ? 'pallet'
      : zoneId === 2
        ? 'viridian'
        : zoneId === 3
          ? 'pewter'
          : zoneId === 4
            ? 'center'
            : zoneId === 5
              ? 'cerulean'
              : 'champion');

  const challengeMode =
    opts.overrideMode ??
    (landmarkId === 'saffron' ? 'city-challenge' : getTownChallengeMode(zoneId));

  const caughtPokemonIds = opts.caughtPokemonIds ?? caughtPokemonIdsArg;
  const words =
    landmarkId === 'saffron'
      ? selectSaffronCityWords(
          opts.unlockedZones ?? [1, 2, 3],
          wordMastery,
          BATTLE_LENGTH,
          rng,
          caughtPokemonIds,
        )
      : selectBattleWords(zoneId, wordMastery, BATTLE_LENGTH, rng, caughtPokemonIds);

  const firstWord = words[0]!;
  const initial = resolveInitialPhaseForEncounter(firstWord, challengeMode, rng);

  // Schedule 1 integrated A–Z Wild Letter Catch on Encounter 2 (index 1) whenever unmastered letters remain!
  const letterTarget =
    opts.masteredLetters !== undefined && challengeMode !== 'clinic-heal' && words.length >= 2
      ? selectIntegratedLetterForZone(zoneId, opts.masteredLetters, rng)
      : null;

  return {
    zoneId,
    landmarkId,
    challengeMode,
    words,
    currentWordIndex: 0,
    phase: initial.phase,
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
    clinicPatient: initial.clinicPatient,
    menuEncounter: initial.menuEncounter,
    letterEncounter: null,
    letterCatchSlotIndex: letterTarget ? 1 : -1,
    letterCatchTarget: letterTarget,
    letterCatchActive: false,
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

export function completeSwitchMenuPick(state: BattleState): BattleState {
  if (state.phase !== 'menu-pick') return state;
  return {
    ...state,
    phase: 'spelling',
  };
}

export function completeLetterCatchEncounter(state: BattleState): BattleState {
  if (state.phase !== 'letter-catch' || !state.letterEncounter) return state;
  const target = state.letterEncounter.targetLetter;
  const caught = !state.caughtPokemonIds.includes(target.pokemonId)
    ? [...state.caughtPokemonIds, target.pokemonId]
    : state.caughtPokemonIds;

  return {
    ...state,
    phase: 'move-animation',
    letterCatchActive: true,
    starHeartsFilled: Math.min(state.targetStarHearts, state.starHeartsFilled + 1),
    totalStarsEarned: state.totalStarsEarned + 2,
    caughtPokemonIds: caught,
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
    letterCatchActive: false,
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
      letterCatchActive: false,
      letterEncounter: null,
    };
  }

  // Trigger the integrated A–Z Wild Letter Catch on its scheduled encounter slot!
  if (nextIndex === state.letterCatchSlotIndex && state.letterCatchTarget) {
    return {
      ...state,
      currentWordIndex: nextIndex,
      phase: 'letter-catch',
      clinicPatient: null,
      menuEncounter: null,
      letterCatchActive: true,
      letterEncounter: {
        targetLetter: state.letterCatchTarget,
        choices: buildIntegratedLetterChoices(state.letterCatchTarget, rng),
      },
    };
  }

  const nextWord = state.words[nextIndex]!;
  const nextSetup = resolveInitialPhaseForEncounter(nextWord, state.challengeMode, rng);

  return {
    ...state,
    currentWordIndex: nextIndex,
    phase: nextSetup.phase,
    clinicPatient: nextSetup.clinicPatient,
    menuEncounter: nextSetup.menuEncounter,
    letterEncounter: null,
    letterCatchActive: false,
  };
}
