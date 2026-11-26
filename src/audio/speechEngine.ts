import { getPhonemeInfo, LETTER_NAMES } from '../data/phonemes';
import type { LetterAudioMode, VoiceSpeed } from '../data/types';

export interface VoiceOption {
  uri: string;
  name: string;
  lang: string;
  qualityRank: number;
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

class SpeechGuidanceEngine {
  private enabled = true;
  private speed: VoiceSpeed = 'slow';
  private preferredVoiceUri = '';
  private activeToken = 0;

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
    if (!enabledFlag(opts.enabled)) {
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

  public getAvailableVoices(): VoiceOption[] {
    if (!this.isSupported()) return [];
    try {
      const voices = window.speechSynthesis.getVoices();
      return voices
        .filter((v) => /^en/i.test(v.lang))
        .map((v) => ({
          uri: v.voiceURI,
          name: v.name,
          lang: v.lang,
          qualityRank: scoreVoice(v),
        }))
        .sort((a, b) => b.qualityRank - a.qualityRank);
    } catch {
      return [];
    }
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    if (!this.isSupported()) return null;
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return null;

      if (this.preferredVoiceUri) {
        const exact = voices.find((v) => v.voiceURI === this.preferredVoiceUri);
        if (exact) return exact;
      }

      const english = voices.filter((v) => /^en/i.test(v.lang));
      if (english.length === 0) return voices[0] ?? null;

      return [...english].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Unlocks iOS/iPad Safari SpeechSynthesis on the user's first tap.
   */
  public unlock(): void {
    if (!this.isSupported()) return;
    try {
      const warm = new SpeechSynthesisUtterance('');
      warm.volume = 0;
      window.speechSynthesis.speak(warm);
    } catch {
      // ignore
    }
  }

  public stop(): void {
    this.activeToken += 1;
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

    return new Promise<void>((resolve) => {
      try {
        if (interrupt) {
          window.speechSynthesis.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = this.pickVoice();
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang || 'en-US';
        utterance.rate =
          options.rateOverride ?? (this.speed === 'slow' ? 0.8 : 0.95);
        utterance.pitch = options.pitch ?? 1.06;

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve();
        };

        utterance.onend = finish;
        utterance.onerror = finish;
        // Safety timeout so UI choreography never stalls if browser fails to emit onend
        const estimatedMs = Math.max(1800, text.length * 95);
        const timer = window.setTimeout(finish, estimatedMs);

        if (token !== this.activeToken && interrupt) {
          finish();
          return;
        }
        window.speechSynthesis.speak(utterance);
      } catch {
        resolve();
      }
    });
  }

  /**
   * Speaks a pure schwa-minimal phoneme cue (or Letter Name + Sound when configured).
   */
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
      rateOverride: this.speed === 'slow' ? 0.78 : 0.9,
      pitch: 1.08,
    });
  }

  /**
   * Speaks a connected CV blending cue smoothly during Paw-Slide dragging.
   */
  public speakBlendCue(cueText: string): Promise<void> {
    return this.speak(cueText, {
      rateOverride: this.speed === 'slow' ? 0.76 : 0.88,
      pitch: 1.07,
    });
  }

  /**
   * Models a word aloud with its everyday real-world sentence.
   */
  public speakWordIntroduction(
    displayWord: string,
    everydaySentence: string,
    focusWord: string,
  ): Promise<void> {
    const cleanWord = displayWord.toLowerCase();
    const cleanFocus = focusWord.toLowerCase();
    const prompt =
      cleanWord === cleanFocus
        ? `Let's spell ${cleanWord}! ${everydaySentence}`
        : `Let's read ${cleanWord}! ${everydaySentence} Let's build ${cleanFocus}!`;
    return this.speak(prompt);
  }
}

function enabledFlag(v: boolean): boolean {
  return Boolean(v);
}

export const speechEngine = new SpeechGuidanceEngine();
