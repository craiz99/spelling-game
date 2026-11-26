import React, { useEffect, useMemo, useRef, useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import type { BlendingStyle, PhonemeUnit } from '../data/types';
import {
  createBlendingSteps,
  getSuccessiveBlendSequence,
  mapProgressToStep,
} from '../engine/blendingEngine';
import { PawPrintIcon, SparkleIcon } from './SwitchIcons';

interface PawSlideBlenderProps {
  units: readonly PhonemeUnit[];
  focusWord: string;
  displayWord?: string;
  prefixDisplay?: string;
  suffixDisplay?: string;
  blendingStyle: BlendingStyle;
  successiveChunkCues?: readonly string[];
  compact?: boolean;
  onBlendComplete: () => void;
}

/**
 * Paw-Slide Continuous & Successive Blending component.
 * Places the horizontal paw track strictly BELOW the phoneme bubbles
 * (with touch-action: none) so the handle never covers any letter!
 */
export const PawSlideBlender: React.FC<PawSlideBlenderProps> = ({
  units,
  focusWord,
  displayWord,
  prefixDisplay,
  suffixDisplay,
  blendingStyle,
  successiveChunkCues,
  compact = false,
  onBlendComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [isAutoBlending, setIsAutoBlending] = useState(false);
  const [completed, setCompleted] = useState(false);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const lastSpokenStepRef = useRef(-1);
  const autoTimersRef = useRef<number[]>([]);

  const steps = useMemo(
    () => createBlendingSteps(units, focusWord, blendingStyle, successiveChunkCues),
    [units, focusWord, blendingStyle, successiveChunkCues],
  );

  // Reset whenever word changes
  useEffect(() => {
    autoTimersRef.current.forEach((id) => window.clearTimeout(id));
    autoTimersRef.current = [];
    setProgress(0);
    setIsAutoBlending(false);
    setCompleted(false);
    lastSpokenStepRef.current = -1;
    draggingRef.current = false;
  }, [focusWord, units]);

  useEffect(() => {
    return () => {
      autoTimersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const mapping = mapProgressToStep(progress, steps.length);
  const useSuccessiveGlue = blendingStyle === 'successive' && units.length >= 3;

  const finalizeBlend = () => {
    if (completed) return;
    setCompleted(true);
    setProgress(1);
    soundEffects.playBlendComplete();
    const spokenTarget = (displayWord ?? focusWord).toLowerCase();
    void speechEngine.speak(`${spokenTarget}!`, { rateOverride: 0.85, pitch: 1.12 });
    const doneTimer = window.setTimeout(() => {
      onBlendComplete();
    }, compact ? 650 : 850);
    autoTimersRef.current.push(doneTimer);
  };

  const applyProgress = (nextProgress: number) => {
    const clamped = Math.max(0, Math.min(1, nextProgress));
    setProgress(clamped);

    const nextMap = mapProgressToStep(clamped, steps.length);
    if (
      nextMap.activeStepIndex >= 0 &&
      nextMap.activeStepIndex !== lastSpokenStepRef.current
    ) {
      lastSpokenStepRef.current = nextMap.activeStepIndex;
      const step = steps[nextMap.activeStepIndex];
      if (step) {
        soundEffects.playBlendStep(step.index, steps.length);
        void speechEngine.speakBlendCue(step.speechCue);
      }
    }

    if (nextMap.isComplete) {
      draggingRef.current = false;
      finalizeBlend();
    }
  };

  const progressFromClientX = (clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return (clientX - rect.left) / rect.width;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (completed || isAutoBlending) return;
    draggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore in jsdom
    }
    applyProgress(progressFromClientX(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || completed || isAutoBlending) return;
    applyProgress(progressFromClientX(e.clientX));
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  const handleSliderKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (completed || isAutoBlending) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      applyProgress(progress + 1 / Math.max(2, steps.length));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      applyProgress(progress - 0.25);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAutoBlend();
    }
  };

  const handleAutoBlend = () => {
    if (completed || isAutoBlending) return;
    setIsAutoBlending(true);
    lastSpokenStepRef.current = -1;
    const sequence = getSuccessiveBlendSequence(
      units,
      focusWord,
      blendingStyle,
      successiveChunkCues,
    );

    let elapsed = 0;
    sequence.forEach((cue) => {
      elapsed += cue.delayMs;
      const timer = window.setTimeout(() => {
        setProgress(cue.progress);
        if (cue.isFinalWord) {
          setIsAutoBlending(false);
          finalizeBlend();
        } else {
          soundEffects.playBlendStep(cue.stepIndex, steps.length);
          void speechEngine.speakBlendCue(cue.speechText);
        }
      }, elapsed);
      autoTimersRef.current.push(timer);
    });
  };

  const activeStep =
    mapping.activeStepIndex >= 0 ? steps[mapping.activeStepIndex] : null;
  const bubbleColorClass = (idx: number): string => {
    if (!mapping.reachedIndices.includes(idx)) return '';
    return `phoneme-bubble--lit-${idx % 3}`;
  };

  const handlePercent = Math.max(6, Math.min(94, Math.round(progress * 100)));

  return (
    <div
      className="paw-blender"
      data-testid="paw-slide-blender"
      aria-label={`Blend the sounds in ${focusWord}`}
    >
      {!compact && (
        <div className="paw-blender__header">
          <span className="paw-blender__badge">
            {useSuccessiveGlue ? '2-Step Blend' : 'Smooth Blend'}
          </span>
          <span className={`blend-cue-pill ${completed ? 'blend-cue-pill--done' : ''}`}>
            {completed
              ? `${displayWord ?? focusWord}!`
              : activeStep
                ? activeStep.visualPrompt
                : 'Slide!'}
          </span>
        </div>
      )}

      {/* Phoneme Bubbles Row — Strictly ABOVE the slider track */}
      <div className="paw-blender__bubbles" data-testid="phoneme-bubbles-row">
        {prefixDisplay && <span className="focus-affix">{prefixDisplay}</span>}

        {useSuccessiveGlue ? (
          <>
            <div
              className={`glued-chunk-group ${
                mapping.isFirstTwoGlued ? 'glued-chunk-group--active' : ''
              }`}
              data-testid="successive-glued-chunk"
            >
              <button
                type="button"
                className={`phoneme-bubble ${bubbleColorClass(0)}`}
                onClick={() => {
                  soundEffects.playBlendStep(0, steps.length);
                  if (steps[0]) void speechEngine.speakBlendCue(steps[0].speechCue);
                }}
              >
                {units[0]!.letters}
              </button>
              <span className="bubble-arrow" aria-hidden="true">
                {mapping.isFirstTwoGlued ? '+' : '→'}
              </span>
              <button
                type="button"
                className={`phoneme-bubble ${bubbleColorClass(1)}`}
                onClick={() => {
                  soundEffects.playBlendStep(1, steps.length);
                  if (steps[1]) void speechEngine.speakBlendCue(steps[1].speechCue);
                }}
              >
                {units[1]!.letters}
              </button>
            </div>

            {units.slice(2).map((unit, offset) => {
              const realIdx = offset + 2;
              return (
                <React.Fragment key={`${focusWord}-b-${realIdx}`}>
                  <span className="bubble-arrow" aria-hidden="true">
                    →
                  </span>
                  <button
                    type="button"
                    className={`phoneme-bubble ${bubbleColorClass(realIdx)}`}
                    onClick={() => {
                      soundEffects.playBlendStep(realIdx, steps.length);
                      const st = steps[realIdx];
                      if (st) void speechEngine.speakBlendCue(st.speechCue);
                    }}
                  >
                    {unit.letters}
                  </button>
                </React.Fragment>
              );
            })}
          </>
        ) : (
          units.map((unit, idx) => (
            <React.Fragment key={`${focusWord}-c-${idx}`}>
              {idx > 0 && (
                <span className="bubble-arrow" aria-hidden="true">
                  →
                </span>
              )}
              <button
                type="button"
                className={`phoneme-bubble ${bubbleColorClass(idx)}`}
                onClick={() => {
                  soundEffects.playBlendStep(idx, steps.length);
                  const st = steps[idx];
                  if (st) void speechEngine.speakBlendCue(st.speechCue);
                }}
              >
                {unit.letters}
              </button>
            </React.Fragment>
          ))
        )}

        {suffixDisplay && <span className="focus-affix">{suffixDisplay}</span>}
      </div>

      {/* Dedicated Paw-Slide Track Placed Strictly BELOW Phoneme Bubbles */}
      <div className="paw-track-wrap" data-testid="paw-slider-section">
        <div
          ref={trackRef}
          id="paw-slide-track"
          role="slider"
          tabIndex={0}
          aria-label={`Slide Eevee's paw to blend ${focusWord}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="paw-track"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleSliderKeyDown}
        >
          <div
            className="paw-track__fill"
            style={{ width: `calc(${Math.max(8, progress * 100)}% - 8px)` }}
          />
          <div
            className="paw-handle"
            style={{ left: `${handlePercent}%` }}
            aria-hidden="true"
          >
            <PawPrintIcon size={32} color="#A66B37" />
          </div>
        </div>
      </div>

      {/* Accessible 1-Tap Slide & Blend Together Button */}
      <button
        id="btn-slide-blend-together"
        type="button"
        className="switch-cta switch-cta--emerald"
        disabled={isAutoBlending || completed}
        onClick={handleAutoBlend}
      >
        <PawPrintIcon size={22} color="#FFFFFF" />
        <span>
          {completed ? `${focusWord}! Blended!` : 'Slide & Blend Together!'}
        </span>
        <SparkleIcon size={18} color="#FFFFFF" />
      </button>
    </div>
  );
};
