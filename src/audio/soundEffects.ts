import type { ElementType } from '../data/types';

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private gestureBound = false;

  constructor() {
    this.bindFirstGestureUnlock();
  }

  private bindFirstGestureUnlock(): void {
    if (this.gestureBound || typeof window === 'undefined') return;
    this.gestureBound = true;
    const onGesture = () => {
      this.unlock();
    };
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('keydown', onGesture, { passive: true });
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public unlock(): void {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
  }

  public isReady(): boolean {
    return Boolean(this.ctx && this.ctx.state === 'running');
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

  private scheduleTone(
    ctx: AudioContext,
    freq: number,
    durationSec: number,
    options: {
      type?: OscillatorType;
      gain?: number;
      delaySec?: number;
      slideToFreq?: number;
    },
  ): void {
    try {
      const now = ctx.currentTime + (options.delaySec ?? 0);
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const peakGain = options.gain ?? 0.28;

      osc.type = options.type ?? 'triangle';
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
      osc.stop(now + durationSec + 0.03);
    } catch {
      // gracefully ignore in restricted audio contexts
    }
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

    if (ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(() => {
          this.scheduleTone(ctx, freq, durationSec, options);
        })
        .catch(() => {});
      return;
    }

    this.scheduleTone(ctx, freq, durationSec, options);
  }

  public playTileTap(): void {
    this.playTone(523.25, 0.1, { type: 'triangle', gain: 0.24, slideToFreq: 587.33 });
  }

  public playCorrectPop(): void {
    this.playTone(523.25, 0.14, { type: 'triangle', gain: 0.28, delaySec: 0 });
    this.playTone(659.25, 0.14, { type: 'triangle', gain: 0.28, delaySec: 0.07 });
    this.playTone(783.99, 0.22, { type: 'sine', gain: 0.3, delaySec: 0.14 });
  }

  /** Warm wooden marimba note — gentle, zero harsh buzzers! */
  public playGentleWoodChime(): void {
    this.playTone(329.63, 0.14, { type: 'sine', gain: 0.24, delaySec: 0 });
    this.playTone(293.66, 0.18, { type: 'sine', gain: 0.22, delaySec: 0.08 });
  }

  public playHintSparkle(): void {
    this.playTone(880, 0.14, { type: 'sine', gain: 0.22, delaySec: 0 });
    this.playTone(1046.5, 0.18, { type: 'sine', gain: 0.24, delaySec: 0.09 });
    this.playTone(1318.5, 0.22, { type: 'sine', gain: 0.22, delaySec: 0.18 });
  }

  /** Rising pentatonic chime as the paw slides smoothly across phoneme bubbles */
  public playBlendStep(stepIndex: number, totalSteps: number): void {
    const pentatonic = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
    const safeIdx = Math.min(pentatonic.length - 1, Math.max(0, stepIndex));
    const baseFreq = pentatonic[safeIdx] ?? 523.25;
    const nextFreq =
      pentatonic[Math.min(pentatonic.length - 1, safeIdx + 1)] ?? baseFreq * 1.12;
    const isLast = stepIndex >= totalSteps - 1;
    this.playTone(baseFreq, isLast ? 0.28 : 0.18, {
      type: 'triangle',
      gain: 0.26,
      slideToFreq: nextFreq,
    });
  }

  public playBlendComplete(): void {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, i) => {
      this.playTone(freq, 0.32, { type: 'triangle', gain: 0.24, delaySec: i * 0.055 });
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
    this.playTone(base, 0.16, { type: 'triangle', gain: 0.28, slideToFreq: base * 1.5 });
    this.playTone(base * 1.25, 0.24, {
      type: 'sine',
      gain: 0.26,
      delaySec: 0.1,
      slideToFreq: base * 1.8,
    });
  }

  public playVictoryFanfare(): void {
    const notes = [
      { f: 523.25, d: 0.13, t: 0 },
      { f: 659.25, d: 0.13, t: 0.12 },
      { f: 783.99, d: 0.13, t: 0.24 },
      { f: 1046.5, d: 0.36, t: 0.36 },
    ];
    notes.forEach((n) => {
      this.playTone(n.f, n.d, { type: 'triangle', gain: 0.28, delaySec: n.t });
    });
  }

  public playFootstep(): void {
    this.playTone(349.23, 0.06, { type: 'triangle', gain: 0.18, slideToFreq: 415 });
  }

  /** Synchronized with the 5-beat target-locked Poké Ball Capture sequence! */
  public playPokeBallThrow(): void {
    // Beat 1: Whoosh throw arc (0ms)
    this.playTone(340, 0.36, { type: 'sine', gain: 0.26, slideToFreq: 780 });
    // Beat 2: Red beam hit impact (450ms)
    this.playTone(660, 0.16, { type: 'triangle', gain: 0.28, delaySec: 0.45, slideToFreq: 980 });
    // Beat 3: Bounce on ground (800ms)
    this.playTone(260, 0.11, { type: 'sine', gain: 0.24, delaySec: 0.8, slideToFreq: 190 });
    // Beat 4: 3 suspense wobbles (1080ms, 1360ms, 1640ms)
    this.playTone(440, 0.11, { type: 'triangle', gain: 0.24, delaySec: 1.08, slideToFreq: 520 });
    this.playTone(493.88, 0.11, { type: 'triangle', gain: 0.24, delaySec: 1.36, slideToFreq: 587 });
    this.playTone(554.37, 0.11, { type: 'triangle', gain: 0.24, delaySec: 1.64, slideToFreq: 659 });
  }

  public playCatchSuccess(): void {
    const notes = [
      { f: 523.25, d: 0.12, t: 0 },
      { f: 659.25, d: 0.12, t: 0.11 },
      { f: 783.99, d: 0.12, t: 0.22 },
      { f: 1046.5, d: 0.38, t: 0.34 },
    ];
    notes.forEach((n) => {
      this.playTone(n.f, n.d, { type: 'triangle', gain: 0.3, delaySec: n.t });
    });
  }

  /** Classic warm 5-note healing chime inspired by Pokémon Center */
  public playHealingChime(): void {
    const notes = [
      { f: 587.33, d: 0.14, t: 0 },
      { f: 587.33, d: 0.14, t: 0.16 },
      { f: 587.33, d: 0.14, t: 0.32 },
      { f: 493.88, d: 0.14, t: 0.48 },
      { f: 783.99, d: 0.4, t: 0.64 },
    ];
    notes.forEach((n) => {
      this.playTone(n.f, n.d, { type: 'sine', gain: 0.28, delaySec: n.t });
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
      this.playTone(n.f, n.d, { type: 'triangle', gain: 0.3, delaySec: n.t });
    });
  }
}

export const soundEffects = new SoundEffectsEngine();
