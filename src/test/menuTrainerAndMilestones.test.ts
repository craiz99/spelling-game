import { describe, expect, it } from 'vitest';
import { createDefaultProgress } from '../engine/masteryTracker';
import {
  createMenuRound,
  evaluateMenuChoice,
  triggerMenuEeveeHelp,
} from '../engine/menuTrainerEngine';
import {
  evaluateNewBadges,
  getHighestUnlockedMove,
  getUnlockedAccessories,
  isZoneUnlocked,
} from '../engine/milestoneEngine';
import type { MenuDeckId } from '../data/types';

describe('Switch Menu Trainer & Milestones / Rewards Engine', () => {
  it('creates valid rounds for all 4 Switch decks and enforces 3-tier coaching', () => {
    const decks: MenuDeckId[] = ['pause', 'battle', 'medicine', 'attacks'];
    for (const deckId of decks) {
      const round = createMenuRound(deckId, undefined, () => 0.2);
      expect(round.cards.some((c) => c.id === round.target.id)).toBe(true);
    }

    const round = createMenuRound('battle', undefined, () => 0.1);
    const wrongCard = round.cards.find((c) => c.id !== round.target.id)!;

    const r1 = evaluateMenuChoice(round, wrongCard.id);
    expect(r1.result).toBe('wrong-tier-1');
    expect(r1.state.showBeacon).toBe(false);

    const r2 = evaluateMenuChoice(r1.state, wrongCard.id);
    expect(r2.result).toBe('wrong-tier-2');
    expect(r2.state.showBeacon).toBe(true);

    const r3 = evaluateMenuChoice(r2.state, wrongCard.id);
    expect(r3.result).toBe('auto-assist-tier-3');
    expect(r3.state.isSolved).toBe(true);

    const helped = triggerMenuEeveeHelp(round);
    expect(helped.isSolved).toBe(true);
    expect(helped.usedHelp).toBe(true);
  });

  it('evaluates all 8 Kanto Spelling Badges accurately', () => {
    const base = createDefaultProgress();
    expect(evaluateNewBadges(base)).toHaveLength(0);

    const maxed = {
      ...base,
      battlesWon: 1,
      totalBlends: 10,
      menuTrainerWins: 5,
      completedZones: [1, 2, 3, 4, 5, 6] as (1 | 2 | 3 | 4 | 5 | 6)[],
      completedChains: ['c1', 'c2', 'c3'],
      caughtPokemonIds: [1, 4, 7, 10, 12, 25, 39, 54, 133, 143],
    };

    const earned = evaluateNewBadges(maxed);
    expect(earned).toHaveLength(8);
  });

  it('unlocks all 6 Dress-Up accessories and 7 Partner Moves at star thresholds', () => {
    expect(getUnlockedAccessories(0)).toHaveLength(0);
    expect(getUnlockedAccessories(5).map((a) => a.id)).toEqual(['trainer-cap']);
    expect(getUnlockedAccessories(15)).toHaveLength(2);
    expect(getUnlockedAccessories(25)).toHaveLength(3);
    expect(getUnlockedAccessories(40)).toHaveLength(4);
    expect(getUnlockedAccessories(55)).toHaveLength(5);
    expect(getUnlockedAccessories(75)).toHaveLength(6);

    expect(getHighestUnlockedMove(0).id).toBe('tackle');
    expect(getHighestUnlockedMove(6).id).toBe('quick-attack');
    expect(getHighestUnlockedMove(36).id).toBe('buzzy-buzz');
    expect(getHighestUnlockedMove(65).id).toBe('veevee-volley');
  });

  it('respects progressive zone unlocking and Grown-Up Unlock All 6 Zones override', () => {
    const p = createDefaultProgress();
    expect(isZoneUnlocked(1, p)).toBe(true);
    expect(isZoneUnlocked(2, p)).toBe(false);
    expect(isZoneUnlocked(6, p)).toBe(false);

    const withZ1 = { ...p, completedZones: [1 as const] };
    expect(isZoneUnlocked(2, withZ1)).toBe(true);
    expect(isZoneUnlocked(3, withZ1)).toBe(false);

    const unlockedAll = {
      ...p,
      settings: { ...p.settings, unlockAllZones: true },
    };
    expect(isZoneUnlocked(6, unlockedAll)).toBe(true);
  });
});
