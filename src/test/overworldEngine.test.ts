import { describe, expect, it } from 'vitest';
import { createDefaultProgress } from '../engine/masteryTracker';
import {
  computeRoutePath,
  getLandmarkById,
  getTownChallengeMode,
  isLandmarkUnlocked,
  KANTO_LANDMARKS,
} from '../engine/overworldEngine';

describe('Kanto Overworld Map Navigation Engine', () => {
  it('places all 10 Kanto landmarks cleanly inside normalized map bounds', () => {
    expect(KANTO_LANDMARKS).toHaveLength(10);
    for (const lm of KANTO_LANDMARKS) {
      expect(lm.x).toBeGreaterThan(5);
      expect(lm.x).toBeLessThan(95);
      expect(lm.y).toBeGreaterThan(10);
      expect(lm.y).toBeLessThan(90);
      expect(lm.sceneFile.endsWith('.jpg')).toBe(true);
    }
  });

  it('computes valid multi-waypoint road paths between any two Kanto landmarks', () => {
    const path = computeRoutePath('pallet', 'champion');
    expect(path[0]).toBe('pallet');
    expect(path[path.length - 1]).toBe('champion');
    expect(path.length).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < path.length - 1; i += 1) {
      const current = getLandmarkById(path[i]!);
      expect(current.neighbors).toContain(path[i + 1]!);
    }
  });

  it('assigns a distinct authentic gameplay challenge mode to each of the 6 towns', () => {
    expect(getTownChallengeMode(1)).toBe('wild-catch');
    expect(getTownChallengeMode(2)).toBe('forest-trail');
    expect(getTownChallengeMode(3)).toBe('mart-quest');
    expect(getTownChallengeMode(4)).toBe('clinic-heal');
    expect(getTownChallengeMode(5)).toBe('gym-battle');
    expect(getTownChallengeMode(6)).toBe('champion-gauntlet');
  });

  it('unlocks Pallet Town, Oak\'s A–Z Lab, and side landmarks by default and gates later towns until earned or overridden', () => {
    const p = createDefaultProgress();
    expect(isLandmarkUnlocked(getLandmarkById('pallet'), p)).toBe(true);
    expect(isLandmarkUnlocked(getLandmarkById('oaks-lab'), p)).toBe(true);
    expect(isLandmarkUnlocked(getLandmarkById('dojo'), p)).toBe(true);
    expect(isLandmarkUnlocked(getLandmarkById('menu-camp'), p)).toBe(true);
    expect(isLandmarkUnlocked(getLandmarkById('champion'), p)).toBe(false);

    const unlockedAll = { ...p, settings: { ...p.settings, unlockAllZones: true } };
    expect(isLandmarkUnlocked(getLandmarkById('champion'), unlockedAll)).toBe(true);
  });
});
