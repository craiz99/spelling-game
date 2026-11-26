import { describe, expect, it } from 'vitest';
import {
  createDefaultProgress,
  loadProgress,
  recordWordAttempt,
  resetProgress,
  saveProgress,
  STORAGE_KEY,
  type StorageLike,
} from '../engine/masteryTracker';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

describe('Mastery Tracker & Corrupt-Data Persistence Recovery', () => {
  it('saves and loads valid progress cleanly', () => {
    const store = createMemoryStorage();
    let progress = createDefaultProgress();
    progress.totalStars = 22;
    progress.settings.blendingStyle = 'continuous';
    progress = recordWordAttempt(progress, 'z1-sun', {
      usedHelp: false,
      wrongAttempts: 0,
      now: 1000,
    });
    progress = recordWordAttempt(progress, 'z1-sun', {
      usedHelp: false,
      wrongAttempts: 0,
      now: 2000,
    });

    expect(progress.wordMastery['z1-sun']?.status).toBe('mastered');
    expect(saveProgress(progress, store)).toBe(true);

    const loaded = loadProgress(store);
    expect(loaded.totalStars).toBe(22);
    expect(loaded.settings.blendingStyle).toBe('continuous');
    expect(loaded.wordMastery['z1-sun']?.status).toBe('mastered');
  });

  it('recovers gracefully from corrupt JSON and invalid field types without throwing', () => {
    const store = createMemoryStorage();
    store.setItem(STORAGE_KEY, '{not-valid-json!!!');
    const recovered = loadProgress(store);
    expect(recovered.totalStars).toBe(0);
    expect(recovered.caughtPokemonIds).toContain(133);

    store.setItem(
      STORAGE_KEY,
      JSON.stringify({
        totalStars: -50,
        completedZones: [1, 99, 'bad'],
        caughtPokemonIds: [999, -5, 25],
        settings: {
          scaffoldMode: 'invalid-mode',
          blendingStyle: 'bogus',
          voiceSpeed: 'warp',
        },
      }),
    );

    const sanitized = loadProgress(store);
    expect(sanitized.totalStars).toBe(0);
    expect(sanitized.completedZones).toEqual([1]);
    expect(sanitized.caughtPokemonIds).toEqual([133, 25]);
    expect(sanitized.settings.scaffoldMode).toBe('auto');
    expect(sanitized.settings.blendingStyle).toBe('successive');
    expect(sanitized.settings.voiceSpeed).toBe('slow');
  });

  it('resets progress cleanly back to defaults', () => {
    const store = createMemoryStorage();
    const p = createDefaultProgress();
    p.totalStars = 50;
    saveProgress(p, store);

    const fresh = resetProgress(store);
    expect(fresh.totalStars).toBe(0);
    expect(loadProgress(store).totalStars).toBe(0);
  });
});
