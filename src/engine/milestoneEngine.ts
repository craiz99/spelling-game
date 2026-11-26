import { DRESS_UP_ACCESSORIES, KANTO_BADGES, PARTNER_MOVES } from '../data/rewards';
import type {
  AccessoryDef,
  BadgeDef,
  BadgeId,
  PartnerMoveDef,
  PlayerProgress,
  ZoneId,
} from '../data/types';

const ALL_ZONES: readonly ZoneId[] = [1, 2, 3, 4, 5, 6];

export function isBadgeRequirementMet(
  badgeId: BadgeId,
  progress: PlayerProgress,
): boolean {
  switch (badgeId) {
    case 'pallet-first-sounds':
      return progress.battlesWon >= 1;
    case 'smooth-blender':
      return progress.totalBlends >= 10;
    case 'lets-go-menu-reader':
      return progress.menuTrainerWins >= 5;
    case 'nurse-joy-helper':
      return progress.completedZones.includes(4);
    case 'battle-move-star':
      return progress.completedZones.includes(5);
    case 'word-chain-whiz':
      return progress.completedChains.length >= 3;
    case 'kanto-pal-collector':
      return progress.caughtPokemonIds.length >= 10;
    case 'eevee-spelling-champion':
      return ALL_ZONES.every((z) => progress.completedZones.includes(z));
  }
}

/**
 * Returns any badges newly earned by the current progress that are not yet in earnedBadges.
 */
export function evaluateNewBadges(progress: PlayerProgress): BadgeDef[] {
  const earnedSet = new Set(progress.earnedBadges);
  return KANTO_BADGES.filter(
    (badge) => !earnedSet.has(badge.id) && isBadgeRequirementMet(badge.id, progress),
  );
}

export function getUnlockedAccessories(totalStars: number): AccessoryDef[] {
  return DRESS_UP_ACCESSORIES.filter((acc) => totalStars >= acc.starsRequired);
}

export function getNextAccessoryMilestone(totalStars: number): AccessoryDef | null {
  return DRESS_UP_ACCESSORIES.find((acc) => totalStars < acc.starsRequired) ?? null;
}

export function getUnlockedMoves(totalStars: number): PartnerMoveDef[] {
  return PARTNER_MOVES.filter((move) => totalStars >= move.starsRequired);
}

export function getHighestUnlockedMove(totalStars: number): PartnerMoveDef {
  const unlocked = getUnlockedMoves(totalStars);
  return unlocked[unlocked.length - 1] ?? PARTNER_MOVES[0]!;
}

/**
 * Determines whether a Kanto zone is unlocked for play.
 * Zone 1 is always unlocked. Completing Zone N unlocks Zone N+1,
 * or grown-ups can enable "Unlock All 6 Zones" anytime in Settings!
 */
export function isZoneUnlocked(zoneId: ZoneId, progress: PlayerProgress): boolean {
  if (zoneId === 1) return true;
  if (progress.settings.unlockAllZones) return true;
  const previousZone = (zoneId - 1) as ZoneId;
  return progress.completedZones.includes(previousZone);
}
