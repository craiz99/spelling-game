import { getMenuCardsByDeck } from '../data/menuDecks';
import type { MenuCardItem, MenuDeckId } from '../data/types';

export interface MenuRoundState {
  deckId: MenuDeckId;
  cards: MenuCardItem[];
  target: MenuCardItem;
  wrongAttempts: number;
  showBeacon: boolean;
  isSolved: boolean;
  usedHelp: boolean;
  lastWrongLabel: string | null;
}

export interface MenuChoiceOutcome {
  state: MenuRoundState;
  result: 'correct' | 'wrong-tier-1' | 'wrong-tier-2' | 'auto-assist-tier-3' | 'ignored';
  coachingText: string;
}

export function createMenuRound(
  deckId: MenuDeckId,
  previousTargetId?: string,
  rng: () => number = Math.random,
): MenuRoundState {
  const allCards = getMenuCardsByDeck(deckId);
  // Keep Medicine Pocket & Attacks neatly capped to 6 visible cards on tablet while guaranteeing target inclusion
  const candidates = allCards.filter((c) => c.id !== previousTargetId);
  const pool = candidates.length > 0 ? candidates : allCards;
  const target = pool[Math.floor(rng() * pool.length)] ?? allCards[0]!;

  let visibleCards: MenuCardItem[];
  if (allCards.length <= 6) {
    visibleCards = [...allCards];
  } else {
    const others = allCards
      .filter((c) => c.id !== target.id)
      .sort(() => rng() - 0.5)
      .slice(0, 5);
    visibleCards = [target, ...others].sort((a, b) =>
      allCards.indexOf(a) - allCards.indexOf(b),
    );
  }

  return {
    deckId,
    cards: visibleCards,
    target,
    wrongAttempts: 0,
    showBeacon: false,
    isSolved: false,
    usedHelp: false,
    lastWrongLabel: null,
  };
}

export function evaluateMenuChoice(
  round: MenuRoundState,
  chosenCardId: string,
): MenuChoiceOutcome {
  if (round.isSolved) {
    return { state: round, result: 'ignored', coachingText: '' };
  }

  const chosen = round.cards.find((c) => c.id === chosenCardId);
  if (!chosen) {
    return { state: round, result: 'ignored', coachingText: '' };
  }

  if (chosen.id === round.target.id) {
    return {
      state: {
        ...round,
        isSolved: true,
        showBeacon: false,
        lastWrongLabel: null,
      },
      result: 'correct',
      coachingText: `Yes! That says ${round.target.label}! Now slide Eevee's paw to blend it!`,
    };
  }

  const nextWrong = round.wrongAttempts + 1;
  if (nextWrong === 1) {
    return {
      state: {
        ...round,
        wrongAttempts: nextWrong,
        lastWrongLabel: chosen.label,
      },
      result: 'wrong-tier-1',
      coachingText: `That button says ${chosen.label}. ${round.target.spokenHint}`,
    };
  }

  if (nextWrong === 2) {
    return {
      state: {
        ...round,
        wrongAttempts: nextWrong,
        showBeacon: true,
        lastWrongLabel: chosen.label,
      },
      result: 'wrong-tier-2',
      coachingText: `Look for the glowing Switch card! ${round.target.spokenHint}`,
    };
  }

  return {
    state: {
      ...round,
      wrongAttempts: nextWrong,
      showBeacon: false,
      isSolved: true,
      usedHelp: true,
      lastWrongLabel: null,
    },
    result: 'auto-assist-tier-3',
    coachingText: `Eevee found ${round.target.label} for you! Let's slide and blend it together!`,
  };
}

export function triggerMenuEeveeHelp(round: MenuRoundState): MenuRoundState {
  if (round.isSolved) return round;
  return {
    ...round,
    isSolved: true,
    usedHelp: true,
    showBeacon: false,
  };
}
