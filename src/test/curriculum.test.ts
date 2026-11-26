import { describe, expect, it } from 'vitest';
import { CURRICULUM_WORDS, getWordsByZone, ZONES } from '../data/curriculum';
import { MENU_CARDS, MENU_DECKS } from '../data/menuDecks';
import { PHONEME_MAP } from '../data/phonemes';
import { WORD_CHAINS } from '../data/wordChains';
import type { ZoneId } from '../data/types';

describe('Curriculum & Dataset Integrity', () => {
  it('defines all 6 Kanto zones with 15 words per zone (90 words total)', () => {
    expect(ZONES).toHaveLength(6);
    ([1, 2, 3, 4, 5, 6] as ZoneId[]).forEach((zoneId) => {
      expect(getWordsByZone(zoneId).length).toBeGreaterThanOrEqual(15);
    });
  });

  it('guarantees every curriculum word units concatenate exactly to focusWord and never mirrors Eevee (#133) as an opponent', () => {
    for (const word of CURRICULUM_WORDS) {
      const joined = word.units.map((u) => u.letters).join('');
      expect(joined, `Word ${word.id} (${word.displayWord})`).toBe(word.focusWord);
      expect(word.units.length).toBeGreaterThanOrEqual(2);
      expect(word.units.length).toBeLessThanOrEqual(9);
      expect(word.pokemonId, `Word ${word.id} should not battle Eevee #133`).not.toBe(133);
    }
  });

  it('uses valid phoneme keys in PHONEME_MAP and valid Kanto PokéAPI IDs (1..151)', () => {
    for (const word of CURRICULUM_WORDS) {
      expect(word.pokemonId).toBeGreaterThanOrEqual(1);
      expect(word.pokemonId).toBeLessThanOrEqual(151);
      expect(word.everydaySentence.trim().length).toBeGreaterThan(5);
      for (const unit of word.units) {
        expect(
          PHONEME_MAP[unit.phonemeKey],
          `Missing phonemeKey "${unit.phonemeKey}" in ${word.id}`,
        ).toBeDefined();
      }
    }
  });

  it('starts Zone 1 with 2-sound and continuant-first words for easier blending', () => {
    const z1 = getWordsByZone(1);
    const twoSoundCount = z1.filter((w) => w.units.length === 2).length;
    const continuantStarts = z1.filter((w) => w.isContinuantStart).length;
    expect(twoSoundCount).toBeGreaterThanOrEqual(5);
    expect(continuantStarts).toBeGreaterThanOrEqual(9);
  });

  it('covers essential real-world words, curatives, basic attacks, and Kanto Pokémon', () => {
    const labels = new Set(CURRICULUM_WORDS.map((w) => w.displayWord));
    // Essential real-world kindergarten words + Heart Words
    for (const essential of ['GO', 'NO', 'IN', 'ON', 'UP', 'ME', 'SUN', 'MAP', 'RUN', 'BAG', 'PLAY', 'HELP', 'THE', 'YOU', 'GOOD', 'FRIEND']) {
      expect(labels.has(essential), `Missing everyday word ${essential}`).toBe(true);
    }
    // Essential Let's Go Switch Menu words (spread across all levels!)
    for (const menuWord of ['MAP', 'RUN', 'BAG', 'DEX', 'BERRY', 'SAVE', 'PARTY', 'FIGHT', 'TACKLE', 'EMBER', 'THUNDER SHOCK', 'BUZZY BUZZ']) {
      expect(labels.has(menuWord), `Missing Switch menu word ${menuWord}`).toBe(true);
    }
    // Essential Let's Go curatives
    for (const curative of ['POTION', 'SUPER POTION', 'BURN HEAL', 'ICE HEAL', 'PARALYZE HEAL', 'FULL HEAL', 'ANTIDOTE', 'AWAKENING']) {
      expect(labels.has(curative), `Missing curative ${curative}`).toBe(true);
    }
    // Basic Pokémon attacks
    for (const attack of ['BITE', 'SAND ATTACK', 'QUICK ATTACK', 'TAIL WHIP', 'VINE WHIP', 'WATER GUN']) {
      expect(labels.has(attack), `Missing basic attack ${attack}`).toBe(true);
    }
    // Popular Kanto Pokémon
    for (const poke of ['EEVEE', 'PSYDUCK', 'JIGGLYPUFF', 'PIKACHU', 'SNORLAX', 'CHARMANDER', 'BULBASAUR']) {
      expect(labels.has(poke), `Missing Pokémon ${poke}`).toBe(true);
    }
  });

  it('validates all 4 Switch Menu Trainer decks and their phoneme units', () => {
    expect(MENU_DECKS.map((d) => d.id)).toEqual(['pause', 'battle', 'medicine', 'attacks']);
    for (const card of MENU_CARDS) {
      const joined = card.units.map((u) => u.letters).join('');
      expect(joined, `Menu card ${card.id}`).toBe(card.focusWord);
      for (const unit of card.units) {
        expect(PHONEME_MAP[unit.phonemeKey]).toBeDefined();
      }
    }
  });

  it('validates all Blending Dojo word chains change exactly one phoneme per step', () => {
    expect(WORD_CHAINS.length).toBeGreaterThanOrEqual(4);
    for (const chain of WORD_CHAINS) {
      expect(chain.steps.length).toBe(4);
      for (let i = 0; i < chain.steps.length; i += 1) {
        const step = chain.steps[i]!;
        expect(step.units.map((u) => u.letters).join('')).toBe(step.word);
        if (i === 0) {
          expect(step.changedIndex).toBeNull();
        } else {
          const prev = chain.steps[i - 1]!;
          let diffs = 0;
          step.units.forEach((u, idx) => {
            if (u.letters !== prev.units[idx]?.letters) diffs += 1;
          });
          expect(diffs, `Chain ${chain.id} step ${step.word}`).toBe(1);
        }
      }
    }
  });
});
