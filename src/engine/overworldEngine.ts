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
  kind: 'town' | 'letter-lab' | 'dojo' | 'menu-camp' | 'tall-grass';
}

/**
 * Coordinates calibrated precisely onto the expansive regional Kanto map
 * (public/assets/scenes/kanto-world-map.jpg) so every town sits cleanly on
 * its painted biome and Eevee walks along the regional sandy roads & bridges.
 */
export const KANTO_LANDMARKS: readonly MapLandmark[] = [
  {
    id: 'pallet',
    name: 'Pallet Town',
    challengeTitle: 'Wild Grass Catch',
    ctaLabel: 'Play!',
    description: 'First words & Poké Ball catch',
    accentColor: '#E64545',
    x: 16,
    y: 83,
    zoneId: 1,
    challengeMode: 'wild-catch',
    sceneFile: 'scene-pallet-meadow.jpg',
    featuredPokemonId: 25,
    featuredPokemonName: 'Pikachu',
    neighbors: ['oaks-lab', 'tall-grass'],
    kind: 'town',
  },
  {
    id: 'oaks-lab',
    name: "Oak's A–Z Lab",
    challengeTitle: 'A–Z Letter Sounds',
    ctaLabel: 'A–Z Lab!',
    description: 'All 26 letters A–Z',
    accentColor: '#2C98F0',
    x: 26,
    y: 80,
    sceneFile: 'scene-oaks-lab.jpg',
    featuredPokemonId: 133,
    featuredPokemonName: 'Eevee',
    neighbors: ['pallet', 'tall-grass'],
    kind: 'letter-lab',
  },
  {
    id: 'tall-grass',
    name: 'Route 1 Grass',
    challengeTitle: 'Wild Catch',
    ctaLabel: 'Catch!',
    description: 'Surprise wild encounter',
    accentColor: '#2EB56B',
    x: 39,
    y: 74,
    zoneId: 1,
    challengeMode: 'wild-catch',
    sceneFile: 'scene-pallet-meadow.jpg',
    featuredPokemonId: 16,
    featuredPokemonName: 'Pidgey',
    neighbors: ['pallet', 'oaks-lab', 'viridian', 'center'],
    kind: 'tall-grass',
  },
  {
    id: 'viridian',
    name: 'Viridian Forest',
    challengeTitle: 'Forest Trail',
    ctaLabel: 'Explore!',
    description: '3 forest clearings',
    accentColor: '#2EB56B',
    x: 28,
    y: 57,
    zoneId: 2,
    challengeMode: 'forest-trail',
    sceneFile: 'scene-viridian-forest.jpg',
    featuredPokemonId: 1,
    featuredPokemonName: 'Bulbasaur',
    neighbors: ['tall-grass', 'pewter', 'center'],
    kind: 'town',
  },
  {
    id: 'pewter',
    name: 'Pewter City',
    challengeTitle: 'Poké Mart',
    ctaLabel: 'Shop!',
    description: 'Mart & Switch words',
    accentColor: '#3B82F6',
    x: 16,
    y: 38,
    zoneId: 3,
    challengeMode: 'mart-quest',
    sceneFile: 'scene-pewter-mart.jpg',
    featuredPokemonId: 74,
    featuredPokemonName: 'Geodude',
    neighbors: ['viridian', 'center'],
    kind: 'town',
  },
  {
    id: 'center',
    name: 'Pokémon Center',
    challengeTitle: 'Healing Clinic',
    ctaLabel: 'Heal!',
    description: 'Cure sick Pokémon',
    accentColor: '#F06277',
    x: 45,
    y: 35,
    zoneId: 4,
    challengeMode: 'clinic-heal',
    sceneFile: 'scene-pokemon-center.jpg',
    featuredPokemonId: 113,
    featuredPokemonName: 'Chansey',
    neighbors: ['tall-grass', 'viridian', 'pewter', 'dojo', 'menu-camp'],
    kind: 'town',
  },
  {
    id: 'dojo',
    name: 'Blending Dojo',
    challengeTitle: 'Word Ladders',
    ctaLabel: 'Blend!',
    description: '6 word chains',
    accentColor: '#C78D4E',
    x: 59,
    y: 20,
    sceneFile: 'scene-blending-dojo.jpg',
    featuredPokemonId: 37,
    featuredPokemonName: 'Vulpix',
    neighbors: ['center', 'menu-camp', 'champion'],
    kind: 'dojo',
  },
  {
    id: 'menu-camp',
    name: 'Menu Camp',
    challengeTitle: 'Switch Menus',
    ctaLabel: 'Practice!',
    description: '4 Switch menu decks',
    accentColor: '#F2992E',
    x: 62,
    y: 38,
    sceneFile: 'scene-pewter-mart.jpg',
    featuredPokemonId: 52,
    featuredPokemonName: 'Meowth',
    neighbors: ['center', 'dojo', 'cerulean', 'champion'],
    kind: 'menu-camp',
  },
  {
    id: 'cerulean',
    name: 'Cerulean Gym',
    challengeTitle: 'Gym Battle',
    ctaLabel: 'Battle!',
    description: 'Elemental moves',
    accentColor: '#0EA5E9',
    x: 82,
    y: 50,
    zoneId: 5,
    challengeMode: 'gym-battle',
    sceneFile: 'scene-cerulean-gym.jpg',
    featuredPokemonId: 7,
    featuredPokemonName: 'Squirtle',
    neighbors: ['menu-camp', 'champion'],
    kind: 'town',
  },
  {
    id: 'champion',
    name: 'Champion Stadium',
    challengeTitle: 'Grand Finals',
    ctaLabel: 'Champion!',
    description: 'Heart words & Kanto pals',
    accentColor: '#EAB308',
    x: 88,
    y: 15,
    zoneId: 6,
    challengeMode: 'champion-gauntlet',
    sceneFile: 'scene-champion-stadium.jpg',
    featuredPokemonId: 143,
    featuredPokemonName: 'Snorlax',
    neighbors: ['dojo', 'menu-camp', 'cerulean'],
    kind: 'town',
  },
];

/**
 * Painted regional trail edges connecting Kanto landmarks along the roads & bridges.
 */
export const OVERWORLD_ROADS: readonly [MapNodeId, MapNodeId][] = [
  ['pallet', 'oaks-lab'],
  ['oaks-lab', 'tall-grass'],
  ['tall-grass', 'viridian'],
  ['viridian', 'pewter'],
  ['pewter', 'center'],
  ['tall-grass', 'center'],
  ['center', 'dojo'],
  ['center', 'menu-camp'],
  ['menu-camp', 'cerulean'],
  ['menu-camp', 'champion'],
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
