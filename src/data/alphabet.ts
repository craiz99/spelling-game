export interface AlphabetLetterDef {
  letter: string;
  lower: string;
  phonemeKey: string;
  keyword: string;
  pictureSlug: string;
  pokemonId: number;
  pokemonName: string;
  /** True when the letter sound is demonstrated at the end (e.g., X in box) */
  isEndingSound?: boolean;
}

/**
 * Complete A–Z phonics alphabet for Professor Oak's A–Z Letter Lab.
 * Uses pure short vowels (A=apple, E=egg, I=in, O=on, U=up) and
 * everyday kindergarten keywords paired with painted Word Picture Cards.
 */
export const ALPHABET_LETTERS: readonly AlphabetLetterDef[] = [
  { letter: 'A', lower: 'a', phonemeKey: 'a_short', keyword: 'apple', pictureSlug: 'apple', pokemonId: 25, pokemonName: 'Pikachu' },
  { letter: 'B', lower: 'b', phonemeKey: 'b', keyword: 'ball', pictureSlug: 'ball', pokemonId: 1, pokemonName: 'Bulbasaur' },
  { letter: 'C', lower: 'c', phonemeKey: 'c', keyword: 'cat', pictureSlug: 'cat', pokemonId: 52, pokemonName: 'Meowth' },
  { letter: 'D', lower: 'd', phonemeKey: 'd', keyword: 'dog', pictureSlug: 'dog', pokemonId: 58, pokemonName: 'Growlithe' },
  { letter: 'E', lower: 'e', phonemeKey: 'e_short', keyword: 'egg', pictureSlug: 'egg', pokemonId: 113, pokemonName: 'Chansey' },
  { letter: 'F', lower: 'f', phonemeKey: 'f', keyword: 'fish', pictureSlug: 'fish', pokemonId: 129, pokemonName: 'Magikarp' },
  { letter: 'G', lower: 'g', phonemeKey: 'g', keyword: 'go', pictureSlug: 'go', pokemonId: 74, pokemonName: 'Geodude' },
  { letter: 'H', lower: 'h', phonemeKey: 'h', keyword: 'hat', pictureSlug: 'hat', pokemonId: 35, pokemonName: 'Clefairy' },
  { letter: 'I', lower: 'i', phonemeKey: 'i_short', keyword: 'in', pictureSlug: 'in', pokemonId: 43, pokemonName: 'Oddish' },
  { letter: 'J', lower: 'j', phonemeKey: 'j', keyword: 'jump', pictureSlug: 'jump', pokemonId: 39, pokemonName: 'Jigglypuff' },
  { letter: 'K', lower: 'k', phonemeKey: 'k', keyword: 'kite', pictureSlug: 'kite', pokemonId: 16, pokemonName: 'Pidgey' },
  { letter: 'L', lower: 'l', phonemeKey: 'l', keyword: 'lion', pictureSlug: 'lion', pokemonId: 59, pokemonName: 'Arcanine' },
  { letter: 'M', lower: 'm', phonemeKey: 'm', keyword: 'map', pictureSlug: 'map', pokemonId: 50, pokemonName: 'Diglett' },
  { letter: 'N', lower: 'n', phonemeKey: 'n', keyword: 'net', pictureSlug: 'net', pokemonId: 12, pokemonName: 'Butterfree' },
  { letter: 'O', lower: 'o', phonemeKey: 'o_short', keyword: 'on', pictureSlug: 'on', pokemonId: 54, pokemonName: 'Psyduck' },
  { letter: 'P', lower: 'p', phonemeKey: 'p', keyword: 'pig', pictureSlug: 'pig', pokemonId: 60, pokemonName: 'Poliwag' },
  { letter: 'Q', lower: 'q', phonemeKey: 'qu', keyword: 'queen', pictureSlug: 'queen', pokemonId: 37, pokemonName: 'Vulpix' },
  { letter: 'R', lower: 'r', phonemeKey: 'r', keyword: 'run', pictureSlug: 'run', pokemonId: 77, pokemonName: 'Ponyta' },
  { letter: 'S', lower: 's', phonemeKey: 's', keyword: 'sun', pictureSlug: 'sun', pokemonId: 7, pokemonName: 'Squirtle' },
  { letter: 'T', lower: 't', phonemeKey: 't', keyword: 'top', pictureSlug: 'top', pokemonId: 69, pokemonName: 'Bellsprout' },
  { letter: 'U', lower: 'u', phonemeKey: 'u_short', keyword: 'up', pictureSlug: 'up', pokemonId: 4, pokemonName: 'Charmander' },
  { letter: 'V', lower: 'v', phonemeKey: 'v', keyword: 'van', pictureSlug: 'van', pokemonId: 134, pokemonName: 'Vaporeon' },
  { letter: 'W', lower: 'w', phonemeKey: 'w', keyword: 'whale', pictureSlug: 'whale', pokemonId: 131, pokemonName: 'Lapras' },
  { letter: 'X', lower: 'x', phonemeKey: 'x', keyword: 'box', pictureSlug: 'box', pokemonId: 100, pokemonName: 'Voltorb', isEndingSound: true },
  { letter: 'Y', lower: 'y', phonemeKey: 'y_cons', keyword: 'yes', pictureSlug: 'yes', pokemonId: 135, pokemonName: 'Jolteon' },
  { letter: 'Z', lower: 'z', phonemeKey: 'z', keyword: 'zebra', pictureSlug: 'zebra', pokemonId: 143, pokemonName: 'Snorlax' },
];

export function getAlphabetLetter(letter: string): AlphabetLetterDef {
  const upper = letter.toUpperCase();
  return ALPHABET_LETTERS.find((l) => l.letter === upper) ?? ALPHABET_LETTERS[0]!;
}
