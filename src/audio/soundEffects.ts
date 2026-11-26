import type { ElementType } from '../data/types';

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public unlock(): void {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    durationSec: number,
    options: {
      type?: OscillatorType;
      gain?: number;
      delaySec?: number;
      slideToFreq?: number;
    } = {},
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime + (options.delaySec ?? 0);
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const peakGain = options.gain ?? 0.12;

      osc.type = options.type ?? 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (options.slideToFreq) {
        osc.frequency.exponentialRampToValueAtTime(
          options.slideToFreq,
          now + durationSec,
        );
      }

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, now + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + durationSec + 0.02);
    } catch {
      // gracefully ignore in restricted audio contexts
    }
  }

  public playTileTap(): void {
    this.playTone(523.25, 0.09, { type: 'triangle', gain: 0.09, slideToFreq: 587.33 });
  }

  public playCorrectPop(): void {
    this.playTone(523.25, 0.14, { type: 'triangle', gain: 0.13, delaySec: 0 });
    this.playTone(659.25, 0.14, { type: 'triangle', gain: 0.13, delaySec: 0.07 });
    this.playTone(783.99, 0.22, { type: 'sine', gain: 0.14, delaySec: 0.14 });
  }

  /** Warm wooden marimba note — gentle, zero harsh buzzers! */
  public playGentleWoodChime(): void {
    this.playTone(329.63, 0.13, { type: 'sine', gain: 0.09, delaySec: 0 });
    this.playTone(293.66, 0.18, { type: 'sine', gain: 0.08, delaySec: 0.08 });
  }

  public playHintSparkle(): void {
    this.playTone(880, 0.14, { type: 'sine', gain: 0.08, delaySec: 0 });
    this.playTone(1046.5, 0.18, { type: 'sine', gain: 0.09, delaySec: 0.09 });
    this.playTone(1318.5, 0.22, { type: 'sine', gain: 0.08, delaySec: 0.18 });
  }

  /** Rising pentatonic chime as the paw slides smoothly across phoneme bubbles */
  public playBlendStep(stepIndex: number, totalSteps: number): void {
    const pentatonic = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
    const safeIdx = Math.min(pentatonic.length - 1, Math.max(0, stepIndex));
    const baseFreq = pentatonic[safeIdx] ?? 523.25;
    const nextFreq = pentatonic[Math.min(pentatonic.length - 1, safeIdx + 1)] ?? baseFreq * 1.12;
    const isLast = stepIndex >= totalSteps - 1;
    this.playTone(baseFreq, isLast ? 0.28 : 0.18, {
      type: 'triangle',
      gain: 0.11,
      slideToFreq: nextFreq,
    });
  }

  public playBlendComplete(): void {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, i) => {
      this.playTone(freq, 0.32, { type: 'triangle', gain: 0.1, delaySec: i * 0.055 });
    });
  }

  public playAttackSparkle(elementType?: ElementType): void {
    const base =
      elementType === 'Electric'
        ? 880
        : elementType === 'Water'
          ? 587.33
          : elementType === 'Fire'
            ? 493.88
            : 523.25;
    this.playTone(base, 0.16, { type: 'triangle', gain: 0.12, slideToFreq: base * 1.5 });
    this.playTone(base * 1.25, 0.22, { type: 'sine', gain: 0.11, delaySec: 0.1, slideToFreq: base * 1.8 });
  }

  public playVictoryFanfare(): void {
    const notes = [
      { f: 523.25, d: 0.13, t: 0 },
      { f: 659.25, d: 0.13, t: 0.12 },
      { f: 783.99, d: 0.13, t: 0.24 },
      { f: 1046.5, d: 0.34, t: 0.36 },
    ];
    notes.forEach((n) => {
      this.playTone(n.f, n.d, { type: 'triangle', gain: 0.13, delaySec: n.t });
    });
  }

  public playBadgeFanfare(): void {
    const notes = [
      { f: 523.25, d: 0.12, t: 0 },
      { f: 659.25, d: 0.12, t: 0.11 },
      { f: 783.99, d: 0.12, t: 0.22 },
      { f: 987.77, d: 0.14, t: 0.33 },
      { f: 1046.5, d: 0.42, t: 0.46 },
    ];
    notes.forEach((n) => {
      this.playTone(n.f, n.d, { type: 'triangle', gain: 0.14, delaySec: n.t });
    });
  }
}

export const soundEffects = new SoundEffectsEngine();
