import { describe, expect, it } from 'vitest';
import {
  BATTLE_LENGTH,
  completeBattleWordBlending,
  completeBattleWordSpelling,
  completeClinicMedicinePick,
  completeLetterCatchEncounter,
  completeSwitchMenuPick,
  createBattleState,
  findMenuCardForWord,
  finishBattleMoveAnimation,
  getCurrentBattleWord,
  triggerBattlePayoffAction,
} from '../engine/battleEngine';

describe('Battle & Integrated Town Challenge State Machine', () => {
  it('transitions smoothly through spelling, integrated Switch menu-pick, blending, and victory', () => {
    let battle = createBattleState(1, {}, 'tackle', () => 0.3);
    expect(battle.challengeMode).toBe('wild-catch');
    expect(battle.words).toHaveLength(BATTLE_LENGTH);
    expect(battle.phase).toBe('spelling');
    expect(battle.starHeartsFilled).toBe(0);

    // At least 1 Switch Menu word is guaranteed inside the stage
    expect(battle.words.some((w) => findMenuCardForWord(w) !== null)).toBe(true);

    for (let i = 0; i < BATTLE_LENGTH; i += 1) {
      expect(getCurrentBattleWord(battle)).not.toBeNull();
      if (battle.phase === 'menu-pick') {
        expect(battle.menuEncounter).not.toBeNull();
        expect(battle.menuEncounter!.choices).toHaveLength(3);
        battle = completeSwitchMenuPick(battle);
      }
      expect(battle.phase).toBe('spelling');

      battle = completeBattleWordSpelling(battle, {
        usedHelp: i === 2,
        wrongAttempts: i === 1 ? 1 : 0,
      });
      expect(battle.phase).toBe('blending');

      battle = completeBattleWordBlending(battle);
      expect(battle.phase).toBe('action-ready');

      battle = triggerBattlePayoffAction(battle);
      expect(battle.phase).toBe('move-animation');
      expect(battle.starHeartsFilled).toBe(i + 1);

      battle = finishBattleMoveAnimation(battle);
    }

    expect(battle.phase).toBe('victory');
    expect(battle.starHeartsFilled).toBe(BATTLE_LENGTH);
    expect(battle.blendsCompleted).toBe(BATTLE_LENGTH);
    expect(battle.totalStarsEarned).toBeGreaterThanOrEqual(BATTLE_LENGTH * 2);
    expect(battle.caughtPokemonIds.length).toBeGreaterThanOrEqual(1);
  });

  it('weaves an integrated A–Z wild letter catch into regular town stages when letters remain unmastered', () => {
    let battle = createBattleState(1, {}, 'tackle', () => 0.25, {
      landmarkId: 'pallet',
      masteredLetters: [],
    });
    expect(battle.letterCatchSlotIndex).toBe(1);
    expect(battle.letterCatchTarget).not.toBeNull();

    // Finish encounter 0 -> encounter 1 automatically opens integrated A–Z Wild Letter Catch!
    battle = completeBattleWordSpelling(battle, { usedHelp: false, wrongAttempts: 0 });
    battle = completeBattleWordBlending(battle);
    battle = triggerBattlePayoffAction(battle);
    battle = finishBattleMoveAnimation(battle, () => 0.25);

    expect(battle.phase).toBe('letter-catch');
    expect(battle.letterEncounter).not.toBeNull();
    expect(battle.letterEncounter!.choices).toHaveLength(4);

    battle = completeLetterCatchEncounter(battle);
    expect(battle.phase).toBe('move-animation');
    expect(battle.letterCatchActive).toBe(true);
    expect(battle.starHeartsFilled).toBe(2);
  });

  it('starts Zone 4 Pokémon Center in Nurse Joy clinic-pick phase with a matching curative and status condition', () => {
    let clinic = createBattleState(4, {}, 'tackle', () => 0.2);
    expect(clinic.challengeMode).toBe('clinic-heal');
    expect(clinic.phase).toBe('clinic-pick');
    expect(clinic.clinicPatient).not.toBeNull();
    expect(clinic.clinicPatient!.choices).toHaveLength(3);
    expect(clinic.clinicPatient!.status).toBeTruthy();

    clinic = completeClinicMedicinePick(clinic);
    expect(clinic.phase).toBe('spelling');
  });

  it('supports Saffron City adaptive mixed Kanto challenges with 5 distinct Pokémon species', () => {
    const saffron = createBattleState(3, {}, 'tackle', () => 0.35, {
      landmarkId: 'saffron',
      unlockedZones: [1, 2, 3],
      masteredLetters: ['A', 'M'],
    });
    expect(saffron.landmarkId).toBe('saffron');
    expect(saffron.challengeMode).toBe('city-challenge');
    expect(saffron.words).toHaveLength(5);
    expect(new Set(saffron.words.map((w) => w.pokemonId)).size).toBe(5);
    expect(saffron.words.some((w) => findMenuCardForWord(w) !== null)).toBe(true);
  });

  it('delivers 5 encounters per stage with 5 distinct Pokémon species across all 6 zones', () => {
    expect(BATTLE_LENGTH).toBe(5);
    for (const zoneId of [1, 2, 3, 4, 5, 6] as const) {
      const state = createBattleState(zoneId, {}, 'tackle', () => 0.42);
      expect(state.words).toHaveLength(5);
      const uniqueSpecies = new Set(state.words.map((w) => w.pokemonId));
      expect(uniqueSpecies.size, `Zone ${zoneId} should have 5 unique Pokémon species`).toBe(5);
    }
  });
});
