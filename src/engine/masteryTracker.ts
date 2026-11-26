import { DRESS_UP_ACCESSORIES, KANTO_BADGES, PARTNER_MOVES } from '../data/rewards';
import type {
  AccessoryId,
  BadgeId,
  BlendingStyle,
  CaughtPokemonDetail,
  EquippedAccessories,
  LetterAudioMode,
  MapNodeId,
  MasteryStatus,
  ParentSettings,
  PartnerMoveId,
  PlayerProgress,
  ScaffoldMode,
  TileMode,
  VoiceSpeed,
  WordMasteryRecord,
  ZoneId,
} from '../data/types';

export const STORAGE_KEY = 'lets-go-spell-eevee-v1';
export const PROGRESS_VERSION = 3;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createDefaultSettings(): ParentSettings {
  return {
    scaffoldMode: 'auto',
    letterAudioMode: 'phonics',
    voiceSpeed: 'slow',
    blendingStyle: 'successive',
    tileMode: 'single-letters',
    voiceEnabled: true,
    chimesEnabled: true,
    unlockAllZones: false,
    preferredVoiceUri: '',
  };
}

export function createDefaultProgress(): PlayerProgress {
  return {
    version: PROGRESS_VERSION,
    totalStars: 0,
    battlesWon: 0,
    totalBlends: 0,
    menuTrainerWins: 0,
    bagItemsCount: 3,
    currentMapNodeId: 'pallet',
    completedZones: [],
    completedChains: [],
    masteredLetters: [],
    // Eevee (#133) begins in your Pokédex as your partner pal!
    caughtPokemonIds: [133],
    caughtPokemonDetails: {
      133: {
        count: 1,
        firstCaughtAt: Date.now(),
        lastTown: 'Pallet Town',
      },
    },
    earnedBadges: [],
    equippedAccessories: {
      head: null,
      eyes: null,
      neck: null,
    },
    selectedMoveId: 'tackle',
    wordMastery: {},
    settings: createDefaultSettings(),
  };
}

function getSafeStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

const VALID_SCAFFOLDS = new Set<ScaffoldMode>(['auto', 'extra-help', 'builder', 'explorer']);
const VALID_AUDIO_MODES = new Set<LetterAudioMode>(['phonics', 'names-and-sounds']);
const VALID_SPEEDS = new Set<VoiceSpeed>(['slow', 'normal']);
const VALID_BLENDING_STYLES = new Set<BlendingStyle>(['successive', 'continuous']);
const VALID_TILE_MODES = new Set<TileMode>(['single-letters', 'digraph-teams']);
const VALID_ZONES = new Set<ZoneId>([1, 2, 3, 4, 5, 6]);
const VALID_MAP_NODES = new Set<MapNodeId>([
  'pallet',
  'oaks-lab',
  'viridian',
  'pewter',
  'center',
  'cerulean',
  'champion',
  'dojo',
  'menu-camp',
  'tall-grass',
]);
const VALID_BADGES = new Set<BadgeId>(KANTO_BADGES.map((b) => b.id));
const VALID_ACCESSORIES = new Set<AccessoryId>(DRESS_UP_ACCESSORIES.map((a) => a.id));
const VALID_MOVES = new Set<PartnerMoveId>(PARTNER_MOVES.map((m) => m.id));

function nonNegativeInt(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(value);
}

function sanitizeSettings(raw: unknown): ParentSettings {
  const defaults = createDefaultSettings();
  if (!raw || typeof raw !== 'object') return defaults;
  const obj = raw as Record<string, unknown>;
  return {
    scaffoldMode: VALID_SCAFFOLDS.has(obj.scaffoldMode as ScaffoldMode)
      ? (obj.scaffoldMode as ScaffoldMode)
      : defaults.scaffoldMode,
    letterAudioMode: VALID_AUDIO_MODES.has(obj.letterAudioMode as LetterAudioMode)
      ? (obj.letterAudioMode as LetterAudioMode)
      : defaults.letterAudioMode,
    voiceSpeed: VALID_SPEEDS.has(obj.voiceSpeed as VoiceSpeed)
      ? (obj.voiceSpeed as VoiceSpeed)
      : defaults.voiceSpeed,
    blendingStyle: VALID_BLENDING_STYLES.has(obj.blendingStyle as BlendingStyle)
      ? (obj.blendingStyle as BlendingStyle)
      : defaults.blendingStyle,
    tileMode: VALID_TILE_MODES.has(obj.tileMode as TileMode)
      ? (obj.tileMode as TileMode)
      : defaults.tileMode,
    voiceEnabled: typeof obj.voiceEnabled === 'boolean' ? obj.voiceEnabled : defaults.voiceEnabled,
    chimesEnabled: typeof obj.chimesEnabled === 'boolean' ? obj.chimesEnabled : defaults.chimesEnabled,
    unlockAllZones: typeof obj.unlockAllZones === 'boolean' ? obj.unlockAllZones : defaults.unlockAllZones,
    preferredVoiceUri: typeof obj.preferredVoiceUri === 'string' ? obj.preferredVoiceUri : '',
  };
}

function sanitizeEquipped(raw: unknown): EquippedAccessories {
  const base: EquippedAccessories = { head: null, eyes: null, neck: null };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const slot of ['head', 'eyes', 'neck'] as const) {
    const val = obj[slot];
    if (typeof val === 'string' && VALID_ACCESSORIES.has(val as AccessoryId)) {
      base[slot] = val as AccessoryId;
    }
  }
  return base;
}

function sanitizeWordMastery(raw: unknown): Record<string, WordMasteryRecord> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, WordMasteryRecord> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue;
    const rec = val as Record<string, unknown>;
    const cleanWins = nonNegativeInt(rec.cleanWins);
    const assistedWins = nonNegativeInt(rec.assistedWins);
    const attempts = Math.max(nonNegativeInt(rec.attempts), cleanWins + assistedWins);
    const status: MasteryStatus =
      cleanWins >= 2 ? 'mastered' : attempts > 0 ? 'learning' : 'new';
    result[key] = {
      attempts,
      cleanWins,
      assistedWins,
      status,
      lastPracticedAt: nonNegativeInt(rec.lastPracticedAt),
    };
  }
  return result;
}

function sanitizeCaughtDetails(
  raw: unknown,
  caughtIds: number[],
): Record<number, CaughtPokemonDetail> {
  const result: Record<number, CaughtPokemonDetail> = {};
  if (raw && typeof raw === 'object') {
    for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
      const id = Number(key);
      if (!Number.isInteger(id) || id < 1 || id > 151) continue;
      if (!val || typeof val !== 'object') continue;
      const rec = val as Record<string, unknown>;
      result[id] = {
        count: Math.max(1, nonNegativeInt(rec.count, 1)),
        firstCaughtAt: nonNegativeInt(rec.firstCaughtAt, Date.now()),
        lastTown: typeof rec.lastTown === 'string' && rec.lastTown.trim() ? rec.lastTown : 'Kanto',
      };
    }
  }
  for (const id of caughtIds) {
    if (!result[id]) {
      result[id] = {
        count: 1,
        firstCaughtAt: Date.now(),
        lastTown: id === 133 ? 'Pallet Town' : 'Kanto',
      };
    }
  }
  return result;
}

/**
 * Safely loads PlayerProgress from localStorage with automatic corrupt-JSON
 * and invalid-field recovery (never throws).
 */
export function loadProgress(storage?: StorageLike): PlayerProgress {
  const store = getSafeStorage(storage);
  if (!store) return createDefaultProgress();

  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return createDefaultProgress();
    }
    const obj = parsed as Record<string, unknown>;

    const completedZones = Array.isArray(obj.completedZones)
      ? Array.from(
          new Set(
            obj.completedZones.filter((z): z is ZoneId =>
              VALID_ZONES.has(z as ZoneId),
            ),
          ),
        )
      : [];

    const completedChains = Array.isArray(obj.completedChains)
      ? Array.from(
          new Set(
            obj.completedChains.filter((c): c is string => typeof c === 'string'),
          ),
        )
      : [];

    const masteredLetters = Array.isArray(obj.masteredLetters)
      ? Array.from(
          new Set(
            obj.masteredLetters
              .filter((l): l is string => typeof l === 'string' && /^[a-zA-Z]$/.test(l))
              .map((l) => l.toUpperCase()),
          ),
        )
      : [];

    const rawPokemon = Array.isArray(obj.caughtPokemonIds)
      ? obj.caughtPokemonIds.filter(
          (id): id is number =>
            typeof id === 'number' && Number.isInteger(id) && id >= 1 && id <= 151,
        )
      : [];
    const caughtPokemonIds = Array.from(new Set([133, ...rawPokemon]));
    const caughtPokemonDetails = sanitizeCaughtDetails(obj.caughtPokemonDetails, caughtPokemonIds);

    const earnedBadges = Array.isArray(obj.earnedBadges)
      ? Array.from(
          new Set(
            obj.earnedBadges.filter((b): b is BadgeId =>
              VALID_BADGES.has(b as BadgeId),
            ),
          ),
        )
      : [];

    const selectedMoveId: PartnerMoveId = VALID_MOVES.has(
      obj.selectedMoveId as PartnerMoveId,
    )
      ? (obj.selectedMoveId as PartnerMoveId)
      : 'tackle';

    const currentMapNodeId: MapNodeId = VALID_MAP_NODES.has(
      obj.currentMapNodeId as MapNodeId,
    )
      ? (obj.currentMapNodeId as MapNodeId)
      : 'pallet';

    return {
      version: PROGRESS_VERSION,
      totalStars: nonNegativeInt(obj.totalStars),
      battlesWon: nonNegativeInt(obj.battlesWon),
      totalBlends: nonNegativeInt(obj.totalBlends),
      menuTrainerWins: nonNegativeInt(obj.menuTrainerWins),
      bagItemsCount: nonNegativeInt(obj.bagItemsCount, 3),
      currentMapNodeId,
      completedZones,
      completedChains,
      masteredLetters,
      caughtPokemonIds,
      caughtPokemonDetails,
      earnedBadges,
      equippedAccessories: sanitizeEquipped(obj.equippedAccessories),
      selectedMoveId,
      wordMastery: sanitizeWordMastery(obj.wordMastery),
      settings: sanitizeSettings(obj.settings),
    };
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(
  progress: PlayerProgress,
  storage?: StorageLike,
): boolean {
  const store = getSafeStorage(storage);
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function resetProgress(storage?: StorageLike): PlayerProgress {
  const store = getSafeStorage(storage);
  if (store) {
    try {
      store.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }
  const fresh = createDefaultProgress();
  saveProgress(fresh, storage);
  return fresh;
}

export function recordWordAttempt(
  progress: PlayerProgress,
  wordId: string,
  meta: { usedHelp: boolean; wrongAttempts: number; now?: number; focusWord?: string },
): PlayerProgress {
  const prev = progress.wordMastery[wordId] ?? {
    attempts: 0,
    cleanWins: 0,
    assistedWins: 0,
    status: 'new' as MasteryStatus,
    lastPracticedAt: 0,
  };

  const isClean = !meta.usedHelp && meta.wrongAttempts === 0;
  const cleanWins = prev.cleanWins + (isClean ? 1 : 0);
  const assistedWins = prev.assistedWins + (isClean ? 0 : 1);
  const attempts = prev.attempts + 1;
  const status: MasteryStatus = cleanWins >= 2 ? 'mastered' : 'learning';

  // Organically unlock every A-Z letter practiced in the spelled word!
  let nextMasteredLetters = progress.masteredLetters;
  if (meta.focusWord) {
    const letters = meta.focusWord
      .toUpperCase()
      .split('')
      .filter((ch) => /^[A-Z]$/.test(ch));
    const merged = Array.from(new Set([...progress.masteredLetters, ...letters]));
    if (merged.length !== progress.masteredLetters.length) {
      nextMasteredLetters = merged;
    }
  }

  return {
    ...progress,
    masteredLetters: nextMasteredLetters,
    wordMastery: {
      ...progress.wordMastery,
      [wordId]: {
        attempts,
        cleanWins,
        assistedWins,
        status,
        lastPracticedAt: meta.now ?? Date.now(),
      },
    },
  };
}

/**
 * Immediately saves a newly captured/befriended Pokémon to local progress
 * (even mid-stage!) with catch count and town provenance.
 */
export function recordSinglePokemonCatch(
  progress: PlayerProgress,
  pokemonId: number,
  townName: string,
  now: number = Date.now(),
): PlayerProgress {
  if (!Number.isInteger(pokemonId) || pokemonId < 1 || pokemonId > 151) {
    return progress;
  }
  const nextIds = progress.caughtPokemonIds.includes(pokemonId)
    ? progress.caughtPokemonIds
    : [...progress.caughtPokemonIds, pokemonId];
  const prev = progress.caughtPokemonDetails[pokemonId];
  const nextDetail: CaughtPokemonDetail = prev
    ? {
        count: prev.count + 1,
        firstCaughtAt: prev.firstCaughtAt,
        lastTown: townName,
      }
    : {
        count: 1,
        firstCaughtAt: now,
        lastTown: townName,
      };

  return {
    ...progress,
    caughtPokemonIds: nextIds,
    caughtPokemonDetails: {
      ...progress.caughtPokemonDetails,
      [pokemonId]: nextDetail,
    },
  };
}
