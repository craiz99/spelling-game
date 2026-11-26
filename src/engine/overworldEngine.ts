import type {
  MapNodeId,
  PlayerProgress,
  TownChallengeMode,
  ZoneId,
} from '../data/types';
import { isZoneUnlocked } from './milestoneEngine';

export interface MapPoint {
  x: number;
  y: number;
}

export interface MapLandmark {
  id: MapNodeId;
  name: string;
  challengeTitle: string;
  ctaLabel: string;
  description: string;
  accentColor: string;
  x: number;
  y: number;
  zoneId?: ZoneId;
  challengeMode?: TownChallengeMode;
  sceneFile: string;
  featuredPokemonId: number;
  featuredPokemonName: string;
  neighbors: MapNodeId[];
  kind: 'town' | 'dojo' | 'menu-camp' | 'tall-grass';
}

/**
 * Coordinates calibrated precisely onto public/assets/scenes/kanto-world-map.jpg
 * so Eevee trots directly along the painted sandy-gold Kanto roads!
 */
export const KANTO_LANDMARKS: readonly MapLandmark[] = [
  {
    id: 'pallet',
    name: 'Pallet Town',
    challengeTitle: 'Wild Grass Poké Ball Catch',
    ctaLabel: 'Catch Wild Pokémon!',
    description: 'Spell 2-sound & smooth starter words, blend them, then throw a Poké Ball!',
    accentColor: '#E64545',
    x: 31,
    y: 59,
    zoneId: 1,
    challengeMode: 'wild-catch',
    sceneFile: 'scene-pallet-meadow.jpg',
    featuredPokemonId: 25,
    featuredPokemonName: 'Pikachu',
    neighbors: ['tall-grass', 'menu-camp', 'pewter'],
    kind: 'town',
  },
  {
    id: 'tall-grass',
    name: 'Route 1 Tall Grass',
    challengeTitle: 'Surprise Wild Encounter',
    ctaLabel: 'Jump in Tall Grass!',
    description: 'Rustling tall grass! Quick surprise wild Pokémon catch!',
    accentColor: '#2EB56B',
    x: 35,
    y: 44,
    zoneId: 1,
    challengeMode: 'wild-catch',
    sceneFile: 'scene-pallet-meadow.jpg',
    featuredPokemonId: 16,
    featuredPokemonName: 'Pidgey',
    neighbors: ['pallet', 'viridian', 'pewter'],
    kind: 'tall-grass',
  },
  {
    id: 'viridian',
    name: 'Viridian Forest',
    challengeTitle: '3-Clearing Forest Trail',
    ctaLabel: 'Explore Forest Trail!',
    description: 'Guide Eevee through 3 sunlit forest clearings with Berry & Poké Ball catches!',
    accentColor: '#2EB56B',
    x: 42,
    y: 31,
    zoneId: 2,
    challengeMode: 'forest-trail',
    sceneFile: 'scene-viridian-forest.jpg',
    featuredPokemonId: 1,
    featuredPokemonName: 'Bulbasaur',
    neighbors: ['tall-grass', 'pewter', 'dojo', 'center'],
    kind: 'town',
  },
  {
    id: 'pewter',
    name: 'Pewter City',
    challengeTitle: 'Poké Mart Stock-Up Quest',
    ctaLabel: 'Shop at Poké Mart!',
    description: 'Read Switch Mart signs & stock Poké Balls and Berries into your Adventure Bag!',
    accentColor: '#3B82F6',
    x: 18,
    y: 32,
    zoneId: 3,
    challengeMode: 'mart-quest',
    sceneFile: 'scene-pewter-mart.jpg',
    featuredPokemonId: 74,
    featuredPokemonName: 'Geodude',
    neighbors: ['pallet', 'tall-grass', 'viridian'],
    kind: 'town',
  },
  {
    id: 'menu-camp',
    name: 'Switch Trainer Camp',
    challengeTitle: 'Switch Menu Trainer (4 Decks)',
    ctaLabel: 'Open Menu Trainer!',
    description: 'Practice reading real Pause, Battle, Medicine & Attack Switch menus!',
    accentColor: '#F2992E',
    x: 45,
    y: 62,
    sceneFile: 'scene-pewter-mart.jpg',
    featuredPokemonId: 52,
    featuredPokemonName: 'Meowth',
    neighbors: ['pallet', 'center', 'cerulean'],
    kind: 'menu-camp',
  },
  {
    id: 'center',
    name: 'Pokémon Center',
    challengeTitle: "Nurse Joy's Healing Clinic",
    ctaLabel: 'Heal Pokémon!',
    description: 'Pick the right curative medicine, then spell & blend to cure sick pals!',
    accentColor: '#F06277',
    x: 58,
    y: 57,
    zoneId: 4,
    challengeMode: 'clinic-heal',
    sceneFile: 'scene-pokemon-center.jpg',
    featuredPokemonId: 113,
    featuredPokemonName: 'Chansey',
    neighbors: ['menu-camp', 'viridian', 'dojo', 'cerulean'],
    kind: 'town',
  },
  {
    id: 'dojo',
    name: 'Blending Dojo',
    challengeTitle: 'Single-Sound Word Ladders',
    ctaLabel: 'Enter Blending Dojo!',
    description: 'Swap one letter sound at a time across 6 real-world word chains!',
    accentColor: '#C78D4E',
    x: 61,
    y: 23,
    sceneFile: 'scene-blending-dojo.jpg',
    featuredPokemonId: 37,
    featuredPokemonName: 'Vulpix',
    neighbors: ['viridian', 'center', 'champion'],
    kind: 'dojo',
  },
  {
    id: 'cerulean',
    name: 'Cerulean Gym',
    challengeTitle: 'Water Gym Elemental Battle',
    ctaLabel: 'Start Gym Battle!',
    description: 'Pick elemental moves, spell action verbs, and launch sparkling battle VFX!',
    accentColor: '#0EA5E9',
    x: 82,
    y: 53,
    zoneId: 5,
    challengeMode: 'gym-battle',
    sceneFile: 'scene-cerulean-gym.jpg',
    featuredPokemonId: 7,
    featuredPokemonName: 'Squirtle',
    neighbors: ['menu-camp', 'center', 'champion'],
    kind: 'town',
  },
  {
    id: 'champion',
    name: "Eevee's Champion Gym",
    challengeTitle: 'Grand Kanto Championship',
    ctaLabel: 'Enter Stadium!',
    description: 'Master Heart Words & Kanto Pokémon roots in the sunlit Champion Stadium!',
    accentColor: '#EAB308',
    x: 84,
    y: 28,
    zoneId: 6,
    challengeMode: 'champion-gauntlet',
    sceneFile: 'scene-champion-stadium.jpg',
    featuredPokemonId: 143,
    featuredPokemonName: 'Snorlax',
    neighbors: ['dojo', 'cerulean'],
    kind: 'town',
  },
];

/**
 * Painted road edge segments drawn as subtle glowing Kanto trail dots between landmarks.
 */
export const OVERWORLD_ROADS: readonly [MapNodeId, MapNodeId][] = [
  ['pallet', 'tall-grass'],
  ['tall-grass', 'viridian'],
  ['pallet', 'pewter'],
  ['viridian', 'pewter'],
  ['pallet', 'menu-camp'],
  ['menu-camp', 'center'],
  ['center', 'cerulean'],
  ['viridian', 'dojo'],
  ['center', 'dojo'],
  ['dojo', 'champion'],
  ['cerulean', 'champion'],
];

export function getLandmarkById(id: MapNodeId): MapLandmark {
  return KANTO_LANDMARKS.find((l) => l.id === id) ?? KANTO_LANDMARKS[0]!;
}

export function getLandmarkByZone(zoneId: ZoneId): MapLandmark {
  return (
    KANTO_LANDMARKS.find((l) => l.kind === 'town' && l.zoneId === zoneId) ??
    KANTO_LANDMARKS[0]!
  );
}

export function getSceneUrl(sceneFile: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}assets/scenes/${sceneFile}`;
}

export function getTownChallengeMode(zoneId: ZoneId): TownChallengeMode {
  return getLandmarkByZone(zoneId).challengeMode ?? 'wild-catch';
}

export function isLandmarkUnlocked(
  landmark: MapLandmark,
  progress: PlayerProgress,
): boolean {
  if (!landmark.zoneId) return true;
  return isZoneUnlocked(landmark.zoneId, progress);
}

/**
 * Computes the shortest node-to-node Kanto road path via BFS so Eevee walks
 * smoothly along painted roads instead of teleporting across water/trees.
 */
export function computeRoutePath(fromId: MapNodeId, toId: MapNodeId): MapNodeId[] {
  if (fromId === toId) return [fromId];

  const queue: MapNodeId[][] = [[fromId]];
  const visited = new Set<MapNodeId>([fromId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1]!;
    const node = getLandmarkById(current);

    for (const next of node.neighbors) {
      if (next === toId) {
        return [...path, next];
      }
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }

  return [fromId, toId];
}

export function getNextRecommendedNode(progress: PlayerProgress): MapNodeId {
  const townOrder: { id: MapNodeId; zoneId: ZoneId }[] = [
    { id: 'pallet', zoneId: 1 },
    { id: 'viridian', zoneId: 2 },
    { id: 'pewter', zoneId: 3 },
    { id: 'center', zoneId: 4 },
    { id: 'cerulean', zoneId: 5 },
    { id: 'champion', zoneId: 6 },
  ];

  for (const t of townOrder) {
    if (!progress.completedZones.includes(t.zoneId) && isZoneUnlocked(t.zoneId, progress)) {
      return t.id;
    }
  }
  return 'champion';
}
