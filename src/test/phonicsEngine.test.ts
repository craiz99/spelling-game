import { describe, expect, it } from 'vitest';
import { getWordById, getWordsByZone } from '../data/curriculum';
import { areMirrorConfusable } from '../data/phonemes';
import {
  buildWordChallenge,
  evaluateTileSelection,
  findCorrectTileIdForActiveBox,
  findTileIdByKey,
  resolveEffectiveScaffold,
  triggerEeveeHelp,
  triggerIdleHint,
} from '../engine/phonicsEngine';

describe('Phonics Engine — Scaffolding, Mirror Filter & 3-Tier Safety Net', () => {
  it('defaults new words to Starter mode (1 missing box) under Auto-Adaptive', () => {
    expect(resolveEffectiveScaffold('auto', undefined)).toBe('starter');
    expect(
      resolveEffectiveScaffold('auto', {
        attempts: 1,
        cleanWins: 0,
        assistedWins: 1,
        status: 'learning',
        lastPracticedAt: 1,
      }),
    ).toBe('starter');
    expect(
      resolveEffectiveScaffold('auto', {
        attempts: 1,
        cleanWins: 1,
        assistedWins: 0,
        status: 'learning',
        lastPracticedAt: 1,
      }),
    ).toBe('builder');
    expect(
      resolveEffectiveScaffold('auto', {
        attempts: 2,
        cleanWins: 2,
        assistedWins: 0,
        status: 'mastered',
        lastPracticedAt: 1,
      }),
    ).toBe('explorer');
  });

  it('builds Starter challenges with exactly 1 blank box', () => {
    const word = getWordById('z1-sun')!;
    const challenge = buildWordChallenge(word, 'starter', () => 0.4);
    const blankCount = challenge.filledMask.filter((filled) => !filled).length;
    expect(blankCount).toBe(1);
    expect(challenge.activeIndex).not.toBeNull();
  });

  it('suppresses mirror-confusion distractors (B/D, P/Q, M/W, N/U, S/Z) in Zones 1–2', () => {
    const zone1And2 = [...getWordsByZone(1), ...getWordsByZone(2)];
    for (const word of zone1And2) {
      const challenge = buildWordChallenge(word, 'starter', () => 0.25);
      const activeUnit = word.units[challenge.activeIndex!]!;
      const distractors = challenge.tiles.filter((t) => t.id.startsWith('dist-'));
      for (const dist of distractors) {
        expect(
          areMirrorConfusable(dist.letters, activeUnit.letters),
          `Found mirror distractor ${dist.letters} for target ${activeUnit.letters} in ${word.displayWord}`,
        ).toBe(false);
      }
    }
  });

  it('runs the 3-tier always-winnable safety net: coaching -> beacon + ghost -> auto-assist', () => {
    const word = getWordById('z1-sun')!;
    let state = buildWordChallenge(word, 'starter', () => 0.4);
    const correctId = findCorrectTileIdForActiveBox(state)!;
    const wrongTile = state.tiles.find((t) => t.id !== correctId)!;

    // Wrong try 1: gentle coaching, no beacon yet
    const try1 = evaluateTileSelection(state, wrongTile.id);
    expect(try1.result).toBe('wrong-tier-1');
    expect(try1.state.showBeacon).toBe(false);
    expect(try1.state.showGhostLetter).toBe(false);

    // Wrong try 2: golden sparkle beacon + soft ghost letter
    const try2 = evaluateTileSelection(try1.state, wrongTile.id);
    expect(try2.result).toBe('wrong-tier-2');
    expect(try2.state.showBeacon).toBe(true);
    expect(try2.state.showGhostLetter).toBe(true);

    // Wrong try 3: Eevee cheerfully places the right letter automatically!
    const try3 = evaluateTileSelection(try2.state, wrongTile.id);
    expect(try3.result).toBe('auto-assist-tier-3');
    expect(try3.state.isComplete).toBe(true);
    expect(try3.state.usedHelp).toBe(true);
  });

  it('supports 6.5s idle hint trigger, Eevee Help anytime, and keyboard lookup', () => {
    const word = getWordById('z1-map')!;
    const initial = buildWordChallenge(word, 'starter', () => 0.1);
    const activeLetters = word.units[initial.activeIndex!]!.letters;

    const hinted = triggerIdleHint(initial);
    expect(hinted.showBeacon).toBe(true);
    expect(hinted.showGhostLetter).toBe(true);

    const keyMatch = findTileIdByKey(initial, activeLetters);
    expect(keyMatch).toBe(findCorrectTileIdForActiveBox(initial));

    const helped = triggerEeveeHelp(initial);
    expect(helped.placedUnit?.letters).toBe(activeLetters);
    expect(helped.state.isComplete).toBe(true);
    expect(helped.state.usedHelp).toBe(true);
  });
});
