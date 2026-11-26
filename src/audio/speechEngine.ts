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
  humanVoiceClips: number;
  humanVoiceReady: boolean;
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

function getAudioAssetUrl(fileName: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}assets/audio/${fileName}`;
}

/**
 * Studio-quality Neural Human Voice Engine with automatic Web Speech fallback.
 * - Loads public/assets/audio/manifest.json containing pre-rendered en-US-JennyNeural MP3 clips
 *   for every word, curative, Pokémon name, A–Z letter, phonics sound, and encouragement phrase.
 * - Plays genuine human neural audio via HTMLAudioElement on Chrome, Safari, iOS, and Android.
 * - Falls back seamlessly to hardened Web Speech API for any dynamic phrase not in the manifest.
 */
class SpeechGuidanceEngine {
  private enabled = true;
  private speed: VoiceSpeed = 'slow';
  private preferredVoiceUri = '';
  private activeToken = 0;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private pendingTimer: number | null = null;
  private manifest: Record<string, string> = {};
  private manifestLoaded = false;

  constructor() {
    this.initVoices();
    void this.loadManifest();
  }

  private async loadManifest(): Promise<void> {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    try {
      const res = await fetch(getAudioAssetUrl('manifest.json'));
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, string>;
      if (data && typeof data === 'object') {
        this.manifest = data;
        this.manifestLoaded = true;
      }
    } catch {
      // ignore in jsdom/offline tests; Web Speech fallback stays ready
    }
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
      // ignore
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

  public getAvailableVoices(): VoiceOption[] {
    if (!this.isSupported()) return [];
    let raw: SpeechSynthesisVoice[] = [];
    try {
      raw = window.speechSynthesis.getVoices();
    } catch {
      raw = [];
    }
    if (raw.length > 0) {
      this.cachedVoices = raw;
    } else if (this.cachedVoices.length > 0) {
      raw = this.cachedVoices;
    }
    return raw
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
    const voices = this.getAvailableVoices();
    const picked = this.pickVoice();
    const clipCount = Object.keys(this.manifest).length;
    return {
      speechSupported: this.isSupported(),
      voiceCount: voices.length,
      activeVoiceName:
        this.manifestLoaded && clipCount > 0
          ? 'Jenny Neural (Human Voice Pack)'
          : picked?.name ?? (voices[0]?.name || 'Browser Default'),
      humanVoiceClips: clipCount,
      humanVoiceReady: this.manifestLoaded && clipCount > 0,
    };
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    if (!this.isSupported()) return null;
    let voices: SpeechSynthesisVoice[] = [];
    try {
      voices = window.speechSynthesis.getVoices();
    } catch {
      voices = [];
    }
    if (voices.length === 0) voices = this.cachedVoices;
    if (!voices.length) return null;

    if (this.preferredVoiceUri) {
      const explicit = voices.find((v) => v.voiceURI === this.preferredVoiceUri);
      if (explicit) return explicit;
    }

    const english = voices.filter((v) => /^en/i.test(v.lang));
    const pool = english.length ? english : voices;
    return [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
  }

  public unlock(): void {
    if (!this.isSupported()) return;
    try {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) this.cachedVoices = list;
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // ignore
    }
  }

  private stopActiveAudio(): void {
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.activeAudio = null;
    }
  }

  public stop(): void {
    this.activeToken += 1;
    if (this.pendingTimer !== null) {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.stopActiveAudio();
    this.activeUtterance = null;
    if (!this.isSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  /**
   * Plays a pre-rendered neural human MP3 clip by manifest key (e.g., "word:sun", "pokemon:onix").
   * Falls back seamlessly to Web Speech API if the clip isn't found or cannot play.
   */
  public playClipKey(
    clipKey: string,
    fallbackText?: string,
    options: { interrupt?: boolean; rateOverride?: number } = {},
  ): Promise<void> {
    if (!this.enabled) return Promise.resolve();

    const fileName = this.manifest[clipKey];
    if (!fileName || typeof Audio === 'undefined') {
      return fallbackText ? this.speak(fallbackText, options) : Promise.resolve();
    }

    const interrupt = options.interrupt ?? true;
    const token = interrupt ? ++this.activeToken : this.activeToken;

    if (interrupt) {
      if (this.pendingTimer !== null) {
        window.clearTimeout(this.pendingTimer);
        this.pendingTimer = null;
      }
      this.stopActiveAudio();
      if (this.isSupported()) {
        try {
          if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
          }
        } catch {
          // ignore
        }
      }
    }

    return new Promise<void>((resolve) => {
      try {
        const audio = new Audio(getAudioAssetUrl(fileName));
        audio.preload = 'auto';
        audio.playbackRate =
          options.rateOverride ?? (this.speed === 'slow' ? 0.94 : 1.06);
        this.activeAudio = audio;

        let settled = false;
        const finish = (useFallback = false) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(safetyTimer);
          if (this.activeAudio === audio) {
            this.activeAudio = null;
          }
          if (useFallback && fallbackText && (!interrupt || token === this.activeToken)) {
            void this.speak(fallbackText, { ...options, interrupt: false }).then(resolve);
          } else {
            resolve();
          }
        };

        audio.onended = () => finish(false);
        audio.onerror = () => finish(true);
        const safetyTimer = window.setTimeout(() => finish(false), 9000);

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => finish(true));
        }
      } catch {
        if (fallbackText) {
          void this.speak(fallbackText, options).then(resolve);
        } else {
          resolve();
        }
      }
    });
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

    if (interrupt) {
      this.stopActiveAudio();
    }

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
            options.rateOverride ?? (this.speed === 'slow' ? 0.84 : 0.96);
          utterance.pitch = options.pitch ?? 1.04;

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

  public speakWord(word: string): Promise<void> {
    const clean = word.trim().toLowerCase();
    return this.playClipKey(`word:${clean}`, `${clean}!`);
  }

  public speakPokemon(pokemonName: string): Promise<void> {
    const clean = pokemonName.trim().toLowerCase();
    return this.playClipKey(`pokemon:${clean}`, `${pokemonName}!`);
  }

  public speakCaught(pokemonName: string): Promise<void> {
    const clean = pokemonName.trim().toLowerCase();
    return this.playClipKey(
      `caught:${clean}`,
      `Gotcha! ${pokemonName} joined your team!`,
    );
  }

  public speakLetter(letter: string, safariPrompt = false, fallbackText?: string): Promise<void> {
    const clean = letter.trim().toLowerCase();
    const key = safariPrompt ? `safari:${clean}` : `letter:${clean}`;
    return this.playClipKey(key, fallbackText ?? `${letter.toUpperCase()}!`);
  }

  public speakUiCue(
    cueKey:
      | 'welcome'
      | 'great_job'
      | 'first_try'
      | 'teamwork'
      | 'throw_ball'
      | 'heal_now'
      | 'launch_move'
      | 'stage_win'
      | 'try_again'
      | 'glow_hint'
      | 'all_better'
      | 'test_voice',
    fallbackText: string,
    interrupt = true,
  ): Promise<void> {
    return this.playClipKey(`ui:${cueKey}`, fallbackText, { interrupt });
  }

  public speakPhoneme(
    phonemeKey: string,
    letters: string,
    mode: LetterAudioMode,
    includeKeyword = false,
  ): Promise<void> {
    const info = getPhonemeInfo(phonemeKey);
    const upper = letters.toUpperCase();
    const letterName = LETTER_NAMES[upper];

    // Prefer our studio neural phoneme MP3 clip!
    if (this.manifest[`phoneme:${phonemeKey}`]) {
      return this.playClipKey(`phoneme:${phonemeKey}`, info.ttsCue);
    }

    if (mode === 'names-and-sounds' && letterName) {
      const phrase = includeKeyword
        ? `${letterName} says ${info.ttsCue}, like ${info.keyword}`
        : `${letterName}, ${info.ttsCue}`;
      return this.speak(phrase, { rateOverride: 0.8 });
    }

    const phrase = includeKeyword
      ? `${info.ttsCue}, like ${info.keyword}`
      : info.ttsCue;
    return this.speak(phrase, { rateOverride: 0.78 });
  }

  public speakBlendCue(cueText: string): Promise<void> {
    const clean = cueText.trim().toLowerCase();
    if (this.manifest[`word:${clean}`]) {
      return this.playClipKey(`word:${clean}`, cueText);
    }
    return this.speak(cueText, {
      rateOverride: this.speed === 'slow' ? 0.76 : 0.88,
      pitch: 1.06,
    });
  }

  public speakWordIntroduction(
    displayWord: string,
    everydaySentence: string,
    focusWord?: string,
  ): Promise<void> {
    const cleanDisplay = displayWord.trim().toLowerCase();
    const introKey = `intro:${cleanDisplay}`;
    const fallback =
      focusWord && focusWord.toLowerCase() !== cleanDisplay
        ? `${displayWord.toLowerCase()}. ${everydaySentence} Let's spell ${focusWord.toLowerCase()}!`
        : `Spell ${displayWord.toLowerCase()}! ${everydaySentence}`;

    return this.playClipKey(introKey, fallback);
  }
}

export const speechEngine = new SpeechGuidanceEngine();
