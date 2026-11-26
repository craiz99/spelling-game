import type { ElementType } from './types';

export interface KantoPokemonInfo {
  id: number;
  name: string;
  /** Phonetic pronunciation cue for natural TTS */
  spokenName: string;
  elementType: ElementType;
}

/**
 * 48 beloved Kanto Pokémon across all 6 towns & Oak's Alphabet Safari
 * for rich encounter variety and Pokédex collection tracking.
 */
export const KANTO_POKEMON_CATALOG: readonly KantoPokemonInfo[] = [
  { id: 1, name: 'Bulbasaur', spokenName: 'Bulbasaur', elementType: 'Grass' },
  { id: 4, name: 'Charmander', spokenName: 'Charmander', elementType: 'Fire' },
  { id: 7, name: 'Squirtle', spokenName: 'Squirtle', elementType: 'Water' },
  { id: 10, name: 'Caterpie', spokenName: 'Caterpie', elementType: 'Bug' },
  { id: 12, name: 'Butterfree', spokenName: 'Butterfree', elementType: 'Bug' },
  { id: 16, name: 'Pidgey', spokenName: 'Pidgey', elementType: 'Normal' },
  { id: 19, name: 'Rattata', spokenName: 'Rat-uh-tah', elementType: 'Normal' },
  { id: 21, name: 'Spearow', spokenName: 'Spear-oh', elementType: 'Normal' },
  { id: 25, name: 'Pikachu', spokenName: 'Pikachu', elementType: 'Electric' },
  { id: 27, name: 'Sandshrew', spokenName: 'Sand-shrew', elementType: 'Ground' },
  { id: 29, name: 'Nidoran', spokenName: 'Need-or-an', elementType: 'Poison' },
  { id: 35, name: 'Clefairy', spokenName: 'Clef-airy', elementType: 'Fairy' },
  { id: 37, name: 'Vulpix', spokenName: 'Vulpix', elementType: 'Fire' },
  { id: 39, name: 'Jigglypuff', spokenName: 'Jigglypuff', elementType: 'Fairy' },
  { id: 43, name: 'Oddish', spokenName: 'Oddish', elementType: 'Grass' },
  { id: 46, name: 'Paras', spokenName: 'Pair-us', elementType: 'Bug' },
  { id: 50, name: 'Diglett', spokenName: 'Dig-let', elementType: 'Ground' },
  { id: 52, name: 'Meowth', spokenName: 'Meowth', elementType: 'Normal' },
  { id: 54, name: 'Psyduck', spokenName: 'Sigh-duck', elementType: 'Water' },
  { id: 56, name: 'Mankey', spokenName: 'Mankey', elementType: 'Fighting' },
  { id: 58, name: 'Growlithe', spokenName: 'Growl-ith', elementType: 'Fire' },
  { id: 59, name: 'Arcanine', spokenName: 'Arc-uh-nine', elementType: 'Fire' },
  { id: 60, name: 'Poliwag', spokenName: 'Polly-wag', elementType: 'Water' },
  { id: 63, name: 'Abra', spokenName: 'Ah-brah', elementType: 'Psychic' },
  { id: 66, name: 'Machop', spokenName: 'Mah-chop', elementType: 'Fighting' },
  { id: 69, name: 'Bellsprout', spokenName: 'Bell-sprout', elementType: 'Grass' },
  { id: 72, name: 'Tentacool', spokenName: 'Tent-uh-cool', elementType: 'Water' },
  { id: 74, name: 'Geodude', spokenName: 'Geo-dude', elementType: 'Rock' },
  { id: 77, name: 'Ponyta', spokenName: 'Pony-tah', elementType: 'Fire' },
  { id: 79, name: 'Slowpoke', spokenName: 'Slow-poke', elementType: 'Water' },
  { id: 81, name: 'Magnemite', spokenName: 'Mag-nuh-mite', elementType: 'Electric' },
  { id: 83, name: "Farfetch'd", spokenName: 'Far-fetched', elementType: 'Normal' },
  { id: 84, name: 'Doduo', spokenName: 'Doh-doo-oh', elementType: 'Normal' },
  { id: 86, name: 'Seel', spokenName: 'Seal', elementType: 'Water' },
  { id: 90, name: 'Shellder', spokenName: 'Shell-der', elementType: 'Water' },
  { id: 92, name: 'Gastly', spokenName: 'Ghast-ly', elementType: 'Poison' },
  { id: 95, name: 'Onix', spokenName: 'On-ix', elementType: 'Rock' },
  { id: 98, name: 'Krabby', spokenName: 'Krabby', elementType: 'Water' },
  { id: 100, name: 'Voltorb', spokenName: 'Volt-orb', elementType: 'Electric' },
  { id: 104, name: 'Cubone', spokenName: 'Cue-bone', elementType: 'Ground' },
  { id: 111, name: 'Rhyhorn', spokenName: 'Rye-horn', elementType: 'Rock' },
  { id: 113, name: 'Chansey', spokenName: 'Chan-see', elementType: 'Normal' },
  { id: 116, name: 'Horsea', spokenName: 'Horse-ee', elementType: 'Water' },
  { id: 120, name: 'Staryu', spokenName: 'Star-you', elementType: 'Water' },
  { id: 129, name: 'Magikarp', spokenName: 'Magi-karp', elementType: 'Water' },
  { id: 131, name: 'Lapras', spokenName: 'Lap-rus', elementType: 'Ice' },
  { id: 132, name: 'Ditto', spokenName: 'Ditto', elementType: 'Normal' },
  { id: 133, name: 'Eevee', spokenName: 'Ee-vee', elementType: 'Normal' },
  { id: 134, name: 'Vaporeon', spokenName: 'Vay-por-ee-on', elementType: 'Water' },
  { id: 135, name: 'Jolteon', spokenName: 'Jolt-ee-on', elementType: 'Electric' },
  { id: 136, name: 'Flareon', spokenName: 'Flare-ee-on', elementType: 'Fire' },
  { id: 138, name: 'Omanyte', spokenName: 'Ah-muh-night', elementType: 'Rock' },
  { id: 140, name: 'Kabuto', spokenName: 'Kah-boo-toe', elementType: 'Rock' },
  { id: 143, name: 'Snorlax', spokenName: 'Snore-lax', elementType: 'Normal' },
  { id: 147, name: 'Dratini', spokenName: 'Drah-tee-nee', elementType: 'Water' },
  { id: 151, name: 'Mew', spokenName: 'Mew', elementType: 'Psychic' },
];

export const KANTO_POKEMON_BY_ID: Readonly<Record<number, KantoPokemonInfo>> =
  Object.fromEntries(KANTO_POKEMON_CATALOG.map((p) => [p.id, p]));

export function getPokemonNameById(id: number): string {
  return KANTO_POKEMON_BY_ID[id]?.name ?? `Pokémon #${id}`;
}
