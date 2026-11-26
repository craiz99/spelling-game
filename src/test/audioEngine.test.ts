import { afterEach, describe, expect, it, vi } from 'vitest';
import manifestRaw from '../../public/assets/audio/manifest.json';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import { ALPHABET_LETTERS } from '../data/alphabet';
import { CURRICULUM_WORDS } from '../data/curriculum';
import { MENU_CARDS } from '../data/menuDecks';
import { KANTO_POKEMON_CATALOG } from '../data/pokemonCatalog';
import { DRESS_UP_ACCESSORIES, KANTO_BADGES, PARTNER_MOVES } from '../data/rewards';
import { WORD_CHAINS } from '../data/wordChains';
import { createBlendingSteps } from '../engine/blendingEngine';
import { KANTO_LANDMARKS } from '../engine/overworldEngine';

const MANIFEST: Record<string, string> = manifestRaw;

describe('Bulletproof Audio & 100% Consistent Ava Neural Voice Engine', () => {
  const originalSynth = window.speechSynthesis;

  afterEach(() => {
    (window as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis = originalSynth;
    vi.restoreAllMocks();
  });

  it('reports Speech API diagnostics cleanly without throwing', () => {
    const diag = speechEngine.getDiagnostics();
    expect(typeof diag.speechSupported).toBe('boolean');
    expect(typeof diag.voiceCount).toBe('number');
    expect(typeof diag.activeVoiceName).toBe('string');
  });

  it('does not call speechSynthesis.cancel() synchronously before speaking on a fresh idle queue', async () => {
    const speakMock = vi.fn((utt: { onend?: () => void }) => {
      setTimeout(() => utt.onend?.(), 5);
    });
    const cancelMock = vi.fn();
    const resumeMock = vi.fn();

    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = {
      speaking: false,
      pending: false,
      paused: true,
      speak: speakMock,
      cancel: cancelMock,
      resume: resumeMock,
      getVoices: () => [],
    };

    await speechEngine.speak('Hello Eevee!');
    expect(cancelMock).not.toHaveBeenCalled();
    expect(resumeMock).toHaveBeenCalled();
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it('safely unlocks and triggers Web Audio sound effects without throwing in headless/jsdom', () => {
    expect(() => {
      soundEffects.unlock();
      soundEffects.playCorrectPop();
      soundEffects.playPokeBallThrow();
      soundEffects.playCatchSuccess();
      soundEffects.playVictoryFanfare();
    }).not.toThrow();
  });

  it('has 100% pre-rendered neural MP3 coverage for every blending step across all 90 curriculum words, 9 Dojo chains, and 26 Menu cards', () => {
    const missing: string[] = [];

    const checkSteps = (label: string, steps: ReturnType<typeof createBlendingSteps>) => {
      for (const st of steps) {
        const clean = st.speechCue.trim().toLowerCase();
        const found =
          MANIFEST[`blend:${clean}`] ??
          MANIFEST[`word:${clean}`] ??
          MANIFEST[`phoneme:${st.phonemeKey}`];
        if (!found) {
          missing.push(`${label} -> "${st.speechCue}" (${st.phonemeKey})`);
        }
      }
    };

    for (const word of CURRICULUM_WORDS) {
      checkSteps(
        word.id,
        createBlendingSteps(word.units, word.focusWord, 'successive', word.successiveChunkCues),
      );
      checkSteps(
        `${word.id}:cont`,
        createBlendingSteps(word.units, word.focusWord, 'continuous', word.successiveChunkCues),
      );
      if (!MANIFEST[`word:${word.displayWord.toLowerCase()}`]) {
        missing.push(`word:${word.displayWord.toLowerCase()}`);
      }
      if (!MANIFEST[`intro:${word.displayWord.toLowerCase()}`]) {
        missing.push(`intro:${word.displayWord.toLowerCase()}`);
      }
      if (word.zoneId === 4 && !MANIFEST[`clinic:${word.id}`]) {
        missing.push(`clinic:${word.id}`);
      }
    }

    for (const chain of WORD_CHAINS) {
      if (!MANIFEST[`dojo_done:${chain.id}`]) missing.push(`dojo_done:${chain.id}`);
      chain.steps.forEach((step, idx) => {
        if (!MANIFEST[`dojo_step:${chain.id}_${idx}`]) missing.push(`dojo_step:${chain.id}_${idx}`);
        checkSteps(`${chain.id}[${idx}]`, createBlendingSteps(step.units, step.word, 'successive'));
      });
    }

    for (const card of MENU_CARDS) {
      if (!MANIFEST[`menu_prompt:${card.id}`]) missing.push(`menu_prompt:${card.id}`);
      checkSteps(card.id, createBlendingSteps(card.units, card.focusWord, 'successive'));
    }

    expect(missing).toEqual([]);
  });

  it('has 100% pre-rendered neural MP3 coverage for all 26 A-Z Safari/Explore prompts, 56 Pokémon, 10 landmarks, 7 moves, 8 badges, and 6 accessories', () => {
    const missing: string[] = [];

    for (const letter of ALPHABET_LETTERS) {
      const k = letter.letter.toLowerCase();
      if (!MANIFEST[`safari:${k}`]) missing.push(`safari:${k}`);
      if (!MANIFEST[`letter:${k}`]) missing.push(`letter:${k}`);
    }
    for (const p of KANTO_POKEMON_CATALOG) {
      if (!MANIFEST[`pokemon:${p.name.toLowerCase()}`]) missing.push(`pokemon:${p.name}`);
      if (!MANIFEST[`caught:${p.name.toLowerCase()}`]) missing.push(`caught:${p.name}`);
    }
    for (const lm of KANTO_LANDMARKS) {
      if (!MANIFEST[`town:${lm.id}`]) missing.push(`town:${lm.id}`);
      if (!MANIFEST[`town_locked:${lm.id}`]) missing.push(`town_locked:${lm.id}`);
    }
    for (const mv of PARTNER_MOVES) {
      if (!MANIFEST[`move:${mv.id}`]) missing.push(`move:${mv.id}`);
      if (!MANIFEST[`move_ready:${mv.id}`]) missing.push(`move_ready:${mv.id}`);
    }
    for (const b of KANTO_BADGES) {
      if (!MANIFEST[`badge:${b.id}`]) missing.push(`badge:${b.id}`);
    }
    for (const a of DRESS_UP_ACCESSORIES) {
      if (!MANIFEST[`acc_on:${a.id}`]) missing.push(`acc_on:${a.id}`);
      if (!MANIFEST[`acc_off:${a.id}`]) missing.push(`acc_off:${a.id}`);
    }

    expect(missing).toEqual([]);

    // Verify every manifest entry maps to a valid .mp3 clip filename
    const uniqueFiles = new Set(Object.values(MANIFEST));
    expect(uniqueFiles.size).toBeGreaterThan(900);
    for (const fname of uniqueFiles) {
      expect(fname).toMatch(/^[a-z0-9_]+\.mp3$/);
    }
  });
});
