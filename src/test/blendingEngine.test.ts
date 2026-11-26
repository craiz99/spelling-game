import { describe, expect, it } from 'vitest';
import { getWordById } from '../data/curriculum';
import {
  createBlendingSteps,
  getSuccessiveBlendSequence,
  mapProgressToStep,
} from '../engine/blendingEngine';

describe('Blending Engine — Successive 2-Step & Continuous Phonation', () => {
  it('glues the first 2 sounds into a connected CV chunk in Successive mode', () => {
    const sun = getWordById('z1-sun')!;
    const steps = createBlendingSteps(
      sun.units,
      sun.focusWord,
      'successive',
      sun.successiveChunkCues,
    );

    expect(steps).toHaveLength(3);
    expect(steps[0]!.isGluedChunk).toBe(false);
    expect(steps[1]!.isGluedChunk).toBe(true);
    expect(steps[1]!.speechCue).toBe('suh');
    expect(steps[2]!.speechCue).toBe('sun');
  });

  it('maps slider progress (0..1) cleanly to phoneme bubbles and completion threshold', () => {
    expect(mapProgressToStep(0, 3).activeStepIndex).toBe(-1);
    expect(mapProgressToStep(0.15, 3).activeStepIndex).toBe(0);
    expect(mapProgressToStep(0.15, 3).isFirstTwoGlued).toBe(false);

    const mid = mapProgressToStep(0.55, 3);
    expect(mid.activeStepIndex).toBe(1);
    expect(mid.isFirstTwoGlued).toBe(true);
    expect(mid.isComplete).toBe(false);

    const end = mapProgressToStep(0.95, 3);
    expect(end.activeStepIndex).toBe(2);
    expect(end.reachedIndices).toEqual([0, 1, 2]);
    expect(end.isComplete).toBe(true);
  });

  it('builds a timed 1-tap auto-blend sequence ending with the full word', () => {
    const burn = getWordById('z4-burn-heal')!;
    const cues = getSuccessiveBlendSequence(
      burn.units,
      burn.focusWord,
      'successive',
      burn.successiveChunkCues,
    );
    expect(cues).toHaveLength(4);
    expect(cues[cues.length - 1]!.isFinalWord).toBe(true);
    expect(cues[cues.length - 1]!.progress).toBe(1);
    expect(cues[cues.length - 1]!.speechText).toBe('burn');
  });
});
