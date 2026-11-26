import { describe, expect, it } from 'vitest';
import {
  BATTLE_LENGTH,
  completeBattleWordBlending,
  completeBattleWordSpelling,
  createBattleState,
  finishBattleMoveAnimation,
  getCurrentBattleWord,
} from '../engine/battleEngine';

describe('Battle State Machine — Star Hearts & Always-Winnable Flow', () => {
  it('transitions smoothly from spelling -> blending -> move-animation -> victory', () => {
    let battle = createBattleState(1, {}, 'tackle', () => 0.3);
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
});
