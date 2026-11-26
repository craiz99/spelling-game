import { getPhonemeInfo, LETTER_NAMES } from '../data/phonemes';
import type { LetterAudioMode, VoiceSpeed } from '../data/types';

export interface VoiceOption {
  uri: string;
  name: string;
  lang: string;
  qualityRank: number;
}

export interface AudioDiagnostics {
  speechSupported: boolean;
  voiceCount: number;
  activeVoiceName: string;
}

const PREFERRED_VOICE_PATTERNS: readonly { pattern: RegExp; score: number }[] = [
  { pattern: /Samantha/i, score: 100 },
  { pattern: /Ava.*Premium|Ava.*Enhanced|Ava/i, score: 98 },
  { pattern: /Google US English/i, score: 96 },
  { pattern: /Microsoft Aria|Microsoft Jenny|Microsoft Ana/i, score: 95 },
  { pattern: /Siri.*Female|Karen|Tessa|Moira/i, score: 90 },
  { pattern: /Natural|Neural|Online/i, score: 85 },
  { pattern: /en-US/i, score: 60 },
  { pattern: /^en/i, score: 40 },
];

function scoreVoice(voice: SpeechSynthesisVoice): number {
  let score = 0;
  for (const rule of PREFERRED_VOICE_PATTERNS) {
    if (rule.pattern.test(voice.name) || rule.pattern.test(voice.lang)) {
      score = Math.max(score, rule.score);
    }
  }
  if (/en[-_]US/i.test(voice.lang)) score += 12;
  if (/Compact|Fred|Albert|Bells|Boing|Bubbles|Zarvox/i.test(voice.name)) score -= 80;
  return score;
}

/**
 * Bulletproof multi-browser Web Speech API voice engine.
 * Fixes the 4 classic browser silence bugs:
 * 1. Never cancels synchronously before speaking on a fresh queue (Chrome/Safari drop bug)
 * 2. Debounces 45ms only when canceling an active utterance
 * 3. Retains activeUtterance reference to prevent Chrome garbage collection mid-speech
 * 4. Calls speechSynthesis.resume() to unstick Chrome/macOS paused states & caches async voices
 */
class SpeechGuidanceEngine {
  private enabled = true;
  private speed: VoiceSpeed = 'slow';
  private preferredVoiceUri = '';
  private activeToken = 0;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private pendingTimer: number | null = null;

  constructor() {
    this.initVoices();
  }

  private initVoices(): void {
    if (!this.isSupported()) return;
    const refresh = () => {
      try {
        const list = window.speechSynthesis.getVoices();
        if (list.length > 0) {
          this.cachedVoices = list;
        }
      } catch {
        // ignore
      }
    };
    refresh();
    try {
      window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
    } catch {
      // ignore in older Safari/jsdom
    }
  }

  public configure(opts: {
    enabled: boolean;
    speed: VoiceSpeed;
    preferredVoiceUri?: string;
  }): void {
    this.enabled = opts.enabled;
    this.speed = opts.speed;
    if (typeof opts.preferredVoiceUri === 'string') {
      this.preferredVoiceUri = opts.preferredVoiceUri;
    }
    if (!opts.enabled) {
      this.stop();
    }
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    );
  }

  private getVoicesList(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    try {
      const live = window.speechSynthesis.getVoices();
      if (live.length > 0) {
        this.cachedVoices = live;
        return live;
      }
    } catch {
      // ignore
    }
    return this.cachedVoices;
  }

  public getAvailableVoices(): VoiceOption[] {
    return this.getVoicesList()
      .filter((v) => /^en/i.test(v.lang))
      .map((v) => ({
        uri: v.voiceURI,
        name: v.name,
        lang: v.lang,
        qualityRank: scoreVoice(v),
      }))
      .sort((a, b) => b.qualityRank - a.qualityRank);
  }

  public getDiagnostics(): AudioDiagnostics {
    const picked = this.pickVoice();
    return {
      speechSupported: this.isSupported(),
      voiceCount: this.getVoicesList().length,
      activeVoiceName: picked ? picked.name : 'System Default',
    };
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    const voices = this.getVoicesList();
    if (voices.length === 0) return null;

    if (this.preferredVoiceUri) {
      const exact = voices.find((v) => v.voiceURI === this.preferredVoiceUri);
      if (exact) return exact;
    }

    const english = voices.filter((v) => /^en/i.test(v.lang));
    if (english.length === 0) return voices[0] ?? null;

    return [...english].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
  }

  /**
   * Unlocks Safari/Chrome SpeechSynthesis without poisoning the queue with a
   * synchronously-canceled dummy utterance.
   */
  public unlock(): void {
    if (!this.isSupported()) return;
    try {
      this.getVoicesList();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // ignore
    }
  }

  public stop(): void {
    this.activeToken += 1;
    if (this.pendingTimer !== null) {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.activeUtterance = null;
    if (!this.isSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  public speak(
    text: string,
    options: { rateOverride?: number; pitch?: number; interrupt?: boolean } = {},
  ): Promise<void> {
    if (!this.enabled || !text.trim() || !this.isSupported()) {
      return Promise.resolve();
    }

    const interrupt = options.interrupt ?? true;
    const token = interrupt ? ++this.activeToken : this.activeToken;

    if (this.pendingTimer !== null && interrupt) {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }

    return new Promise<void>((resolve) => {
      const synth = window.speechSynthesis;

      const dispatch = () => {
        if (interrupt && token !== this.activeToken) {
          resolve();
          return;
        }
        try {
          if (synth.paused) {
            synth.resume();
          }
          const utterance = new SpeechSynthesisUtterance(text);
          const voice = this.pickVoice();
          if (voice) utterance.voice = voice;
          utterance.lang = voice?.lang || 'en-US';
          utterance.volume = 1;
          utterance.rate =
            options.rateOverride ?? (this.speed === 'slow' ? 0.82 : 0.96);
          utterance.pitch = options.pitch ?? 1.05;

          // Hold strong ref so Chrome does not garbage-collect utterance mid-speech
          this.activeUtterance = utterance;

          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            window.clearTimeout(safetyTimer);
            if (this.activeUtterance === utterance) {
              this.activeUtterance = null;
            }
            resolve();
          };

          utterance.onend = finish;
          utterance.onerror = finish;
          const estimatedMs = Math.max(2200, text.length * 105);
          const safetyTimer = window.setTimeout(finish, estimatedMs);

          synth.speak(utterance);
        } catch {
          resolve();
        }
      };

      try {
        const needsCancel = interrupt && (synth.speaking || synth.pending);
        if (needsCancel) {
          synth.cancel();
          // Critical 45ms breather so Chrome/Safari don't swallow the next speak() call
          this.pendingTimer = window.setTimeout(() => {
            this.pendingTimer = null;
            dispatch();
          }, 45);
        } else {
          dispatch();
        }
      } catch {
        resolve();
      }
    });
  }

  public speakPhoneme(
    phonemeKey: string,
    letters: string,
    audioMode: LetterAudioMode,
    includeKeyword = false,
  ): Promise<void> {
    const info = getPhonemeInfo(phonemeKey);
    const upper = letters.toUpperCase();
    const letterName = LETTER_NAMES[upper];

    let text: string;
    if (audioMode === 'names-and-sounds' && letterName) {
      text = includeKeyword
        ? `${letterName} says ${info.ttsCue}, like ${info.keyword}`
        : `${letterName} says ${info.ttsCue}`;
    } else if (includeKeyword) {
      text = `${info.ttsCue}, like ${info.keyword}`;
    } else {
      text = info.ttsCue;
    }

    return this.speak(text, {
      rateOverride: this.speed === 'slow' ? 0.8 : 0.92,
      pitch: 1.08,
    });
  }

  public speakBlendCue(cueText: string): Promise<void> {
    return this.speak(cueText, {
      rateOverride: this.speed === 'slow' ? 0.78 : 0.9,
      pitch: 1.07,
    });
  }

  public speakWordIntroduction(
    displayWord: string,
    everydaySentence: string,
    focusWord: string,
  ): Promise<void> {
    const cleanWord = displayWord.toLowerCase();
    const cleanFocus = focusWord.toLowerCase();
    const prompt =
      cleanWord === cleanFocus
        ? `${cleanWord}! ${everydaySentence}`
        : `${cleanWord}! ${everydaySentence} Spell ${cleanFocus}!`;
    return this.speak(prompt);
  }
}

export const speechEngine = new SpeechGuidanceEngine();
