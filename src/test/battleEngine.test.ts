import { describe, expect, it } from 'vitest';
import {
  BATTLE_LENGTH,
  completeBattleWordBlending,
  completeBattleWordSpelling,
  completeClinicMedicinePick,
  createBattleState,
  finishBattleMoveAnimation,
  getCurrentBattleWord,
  triggerBattlePayoffAction,
} from '../engine/battleEngine';

describe('Battle & Town Challenge State Machine', () => {
  it('transitions smoothly through spelling -> blending -> action-ready -> move-animation -> victory', () => {
    let battle = createBattleState(1, {}, 'tackle', () => 0.3);
    expect(battle.challengeMode).toBe('wild-catch');
    expect(battle.words).toHaveLength(BATTLE_LENGTH);
    expect(battle.phase).toBe('spelling');
    expect(battle.starHeartsFilled).toBe(0);

    for (let i = 0; i < BATTLE_LENGTH; i += 1) {
      expect(getCurrentBattleWord(battle)).not.toBeNull();
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

  it('starts Zone 4 Pokémon Center in Nurse Joy clinic-pick phase with a matching curative', () => {
    let clinic = createBattleState(4, {}, 'tackle', () => 0.2);
    expect(clinic.challengeMode).toBe('clinic-heal');
    expect(clinic.phase).toBe('clinic-pick');
    expect(clinic.clinicPatient).not.toBeNull();
    expect(clinic.clinicPatient!.choices).toHaveLength(3);

    clinic = completeClinicMedicinePick(clinic);
    expect(clinic.phase).toBe('spelling');
  });
});
