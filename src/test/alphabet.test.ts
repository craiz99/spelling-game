import { describe, expect, it } from 'vitest';
import { ALPHABET_LETTERS } from '../data/alphabet';
import { CURRICULUM_WORDS } from '../data/curriculum';
import { PHONEME_MAP } from '../data/phonemes';
import { WORD_CHAINS } from '../data/wordChains';
import {
  getWordPictureUrl,
  PAINTED_WORD_SLUGS,
  resolveRawWordPictureSlug,
  resolveWordPictureSlug,
} from '../data/wordPictures';
import { getSceneUrl, KANTO_LANDMARKS } from '../engine/overworldEngine';

describe("Professor Oak's A–Z Alphabet & Painted Word Picture Integrity", () => {
  it('covers all 26 English letters A through Z strictly in alphabetical order', () => {
    expect(ALPHABET_LETTERS).toHaveLength(26);
    const joined = ALPHABET_LETTERS.map((l) => l.letter).join('');
    expect(joined).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  });

  it('assigns every A–Z letter a valid phonemeKey, valid Kanto pokemonId, and painted picture slug', () => {
    for (const def of ALPHABET_LETTERS) {
      expect(PHONEME_MAP[def.phonemeKey], `Missing phonemeKey for ${def.letter}`).toBeDefined();
      expect(def.pokemonId).toBeGreaterThanOrEqual(1);
      expect(def.pokemonId).toBeLessThanOrEqual(151);
      expect(PAINTED_WORD_SLUGS.has(def.pictureSlug), `Missing slug ${def.pictureSlug}`).toBe(true);
      expect(getWordPictureUrl(def.pictureSlug)).toContain(`/assets/words/${def.pictureSlug}.jpg`);
    }
  });

  it('ensures every curriculum word has either a painted picture card, official item sprite, or official Pokémon artwork', () => {
    let paintedCount = 0;
    for (const word of CURRICULUM_WORDS) {
      const slug = resolveWordPictureSlug(word);
      if (slug) {
        paintedCount += 1;
        expect(PAINTED_WORD_SLUGS.has(slug)).toBe(true);
      }
      const hasVisual = Boolean(slug || word.itemSlug || word.pokemonId);
      expect(hasVisual, `Word ${word.id} has no visual`).toBe(true);
    }
    // Over 80% of all curriculum words use bespoke painted Word Picture Cards
    expect(paintedCount).toBeGreaterThanOrEqual(55);
  });

  it('ensures every Blending Dojo word chain step resolves to a painted picture card', () => {
    for (const chain of WORD_CHAINS) {
      for (const step of chain.steps) {
        const slug = resolveRawWordPictureSlug(step.word);
        expect(slug, `Missing painted picture slug for Dojo word ${step.word}`).not.toBeNull();
        expect(PAINTED_WORD_SLUGS.has(slug!)).toBe(true);
      }
    }
  });

  it('ensures every Kanto map landmark resolves to a painted scene URL', () => {
    expect(getSceneUrl('kanto-world-map.jpg')).toContain('/assets/scenes/kanto-world-map.jpg');
    for (const landmark of KANTO_LANDMARKS) {
      expect(getSceneUrl(landmark.sceneFile)).toContain(`/assets/scenes/${landmark.sceneFile}`);
    }
  });
});
