import { getPhonemeInfo } from '../data/phonemes';
import type { BlendingStyle, PhonemeUnit } from '../data/types';

export interface BlendingStep {
  index: number;
  startRatio: number;
  endRatio: number;
  letters: string;
  phonemeKey: string;
  /** Cumulative letters blended up to this bubble */
  cumulativeLetters: string;
  /** Speech cue spoken when the paw enters this step */
  speechCue: string;
  /** Visual caption displayed under/next to the bubbles */
  visualPrompt: string;
  /** True when the first two sounds glue together in Successive 2-Step mode */
  isGluedChunk: boolean;
}

export interface BlendingProgressMapping {
  activeStepIndex: number;
  reachedIndices: number[];
  isFirstTwoGlued: boolean;
  isComplete: boolean;
}

/**
 * Generates blending steps for either:
 * - 'successive' (Default for 5yo struggling with blending): glues sound 1 + sound 2
 *   into a single connected CV chunk ("suuu") before adding sound 3 ("SUN!"),
 *   reducing working-memory load from 3 items to 2.
 * - 'continuous': smooth left-to-right connected phonation across each phoneme bubble.
 */
export function createBlendingSteps(
  units: readonly PhonemeUnit[],
  focusWord: string,
  style: BlendingStyle = 'successive',
  successiveChunkCues?: readonly string[],
): BlendingStep[] {
  const count = units.length;
  if (count === 0) return [];

  const sliceWidth = 1 / count;
  let cumulative = '';

  return units.map((unit, index) => {
    cumulative += unit.letters;
    const info = getPhonemeInfo(unit.phonemeKey);
    const startRatio = Number((index * sliceWidth).toFixed(4));
    const endRatio = Number(((index + 1) * sliceWidth).toFixed(4));

    const isGluedChunk = style === 'successive' && count >= 3 && index === 1;

    let speechCue = info.blendingCue;
    let visualPrompt = `"${info.blendingCue}…"`;

    if (style === 'successive' && count >= 3) {
      if (index === 0) {
        speechCue = info.blendingCue;
        visualPrompt = `"${unit.letters.toLowerCase()}…"`;
      } else if (index === 1) {
        const gluedCue =
          successiveChunkCues && successiveChunkCues[0]
            ? successiveChunkCues[0]
            : cumulative.toLowerCase();
        speechCue = gluedCue;
        visualPrompt = `Glue ${units[0]!.letters}+${unit.letters} → "${gluedCue}…"`;
      } else if (index === count - 1) {
        speechCue = focusWord.toLowerCase();
        visualPrompt = `"${focusWord}!"`;
      } else {
        const chunkCue =
          successiveChunkCues && successiveChunkCues[index - 1]
            ? successiveChunkCues[index - 1]!
            : cumulative.toLowerCase();
        speechCue = chunkCue;
        visualPrompt = `"${chunkCue}…"`;
      }
    } else if (index === count - 1 && count === 2) {
      speechCue = focusWord.toLowerCase();
      visualPrompt = `"${focusWord}!"`;
    }

    return {
      index,
      startRatio,
      endRatio,
      letters: unit.letters,
      phonemeKey: unit.phonemeKey,
      cumulativeLetters: cumulative,
      speechCue,
      visualPrompt,
      isGluedChunk,
    };
  });
}

/**
 * Maps a continuous slider value (0..1) to active phoneme bubble index and completion state.
 */
export function mapProgressToStep(
  progress: number,
  stepCount: number,
): BlendingProgressMapping {
  if (stepCount <= 0) {
    return {
      activeStepIndex: -1,
      reachedIndices: [],
      isFirstTwoGlued: false,
      isComplete: false,
    };
  }

  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped < 0.06) {
    return {
      activeStepIndex: -1,
      reachedIndices: [],
      isFirstTwoGlued: false,
      isComplete: false,
    };
  }

  const rawIndex = Math.min(stepCount - 1, Math.floor(clamped * stepCount));
  const reachedIndices: number[] = [];
  for (let i = 0; i <= rawIndex; i += 1) {
    reachedIndices.push(i);
  }

  return {
    activeStepIndex: rawIndex,
    reachedIndices,
    isFirstTwoGlued: stepCount >= 3 && rawIndex >= 1,
    isComplete: clamped >= 0.92,
  };
}

export interface AutoBlendCue {
  progress: number;
  stepIndex: number;
  speechText: string;
  delayMs: number;
  isFinalWord: boolean;
}

/**
 * Returns timed animation & voice cues for the 1-tap "Slide & Blend Together!" button.
 */
export function getSuccessiveBlendSequence(
  units: readonly PhonemeUnit[],
  focusWord: string,
  style: BlendingStyle = 'successive',
  successiveChunkCues?: readonly string[],
): AutoBlendCue[] {
  const steps = createBlendingSteps(units, focusWord, style, successiveChunkCues);
  const cues: AutoBlendCue[] = steps.map((step, idx) => ({
    progress: Number((((idx + 0.65) / steps.length)).toFixed(2)),
    stepIndex: step.index,
    speechText: step.speechCue,
    delayMs: idx === 0 ? 0 : idx === 1 && style === 'successive' ? 560 : 520,
    isFinalWord: false,
  }));

  cues.push({
    progress: 1,
    stepIndex: Math.max(0, steps.length - 1),
    speechText: focusWord.toLowerCase(),
    delayMs: 560,
    isFinalWord: true,
  });

  return cues;
}
