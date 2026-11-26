import { DRESS_UP_ACCESSORIES, KANTO_BADGES, PARTNER_MOVES } from '../data/rewards';
import type {
  AccessoryId,
  BadgeId,
  BlendingStyle,
  EquippedAccessories,
  LetterAudioMode,
  MapNodeId,
  MasteryStatus,
  ParentSettings,
  PartnerMoveId,
  PlayerProgress,
  ScaffoldMode,
  VoiceSpeed,
  WordMasteryRecord,
  ZoneId,
} from '../data/types';

export const STORAGE_KEY = 'lets-go-spell-eevee-v1';
export const PROGRESS_VERSION = 2;

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
    // Eevee (#133) begins in your Sticker Book as your partner pal!
    caughtPokemonIds: [133],
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
const VALID_ZONES = new Set<ZoneId>([1, 2, 3, 4, 5, 6]);
const VALID_MAP_NODES = new Set<MapNodeId>([
  'pallet',
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

    const rawPokemon = Array.isArray(obj.caughtPokemonIds)
      ? obj.caughtPokemonIds.filter(
          (id): id is number =>
            typeof id === 'number' && Number.isInteger(id) && id >= 1 && id <= 151,
        )
      : [];
    const caughtPokemonIds = Array.from(new Set([133, ...rawPokemon]));

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
      caughtPokemonIds,
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
  meta: { usedHelp: boolean; wrongAttempts: number; now?: number },
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

  return {
    ...progress,
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
