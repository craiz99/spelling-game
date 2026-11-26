export type ZoneId = 1 | 2 | 3 | 4 | 5 | 6;

export type ElementType =
  | 'Normal'
  | 'Water'
  | 'Fire'
  | 'Grass'
  | 'Electric'
  | 'Ground'
  | 'Dark'
  | 'Psychic'
  | 'Rock'
  | 'Poison'
  | 'Bug'
  | 'Ice'
  | 'Fairy'
  | 'Fighting';

export type StatusCondition = 'PAR' | 'BRN' | 'FRZ' | 'PSN' | 'SLP' | 'HP' | 'ITEM';

export type WordCategory =
  | 'everyday'
  | 'menu'
  | 'mart'
  | 'curative'
  | 'attack'
  | 'pokemon'
  | 'heart-word';

export interface PhonemeUnit {
  /** Exact uppercase letters rendered inside this Elkonin sound box */
  letters: string;
  /** Canonical key in PHONEME_MAP */
  phonemeKey: string;
  /** True when the grapheme-phoneme pattern is irregular (Heart Word part) */
  isHeartWord?: boolean;
  /** Warm spoken hint explaining the Heart Word pattern */
  heartHint?: string;
}

export interface WordEntry {
  id: string;
  zoneId: ZoneId;
  /** Full game/real-world label, e.g. "PARALYZE HEAL", "SUN", "PSYDUCK" */
  displayWord: string;
  /** Optional syllable-dotted full label for visual scaffolding */
  syllableDisplay?: string;
  /** Text rendered immediately before the Elkonin boxes for smart focus-chunking */
  prefixDisplay?: string;
  /** Text rendered immediately after the Elkonin boxes for smart focus-chunking */
  suffixDisplay?: string;
  /** Exact concatenation of units.map(u => u.letters).join('') */
  focusWord: string;
  units: PhonemeUnit[];
  category: WordCategory;
  /** Valid Kanto PokéAPI official artwork ID (1..151) */
  pokemonId: number;
  pokemonName: string;
  /** Optional PokéAPI item slug for curatives/mart items */
  itemSlug?: string;
  /** Real-world everyday sentence anchoring meaning outside Pokémon */
  everydaySentence: string;
  /** Short Pokémon Let's Go bridge note */
  pokemonBridge: string;
  /** Optional elemental type badge */
  elementType?: ElementType;
  /** Optional connected-CV first chunk pronunciation for Successive Blending */
  successiveChunkCues?: string[];
  /** Whether the word begins with a stretchable continuant sound */
  isContinuantStart?: boolean;
}

export interface ZoneDefinition {
  id: ZoneId;
  name: string;
  subtitle: string;
  phonicsFocus: string;
  accentColor: string;
  softTint: string;
  description: string;
  featuredPokemonId: number;
  featuredPokemonName: string;
  secondaryPokemonId: number;
}

export type ScaffoldMode = 'auto' | 'extra-help' | 'builder' | 'explorer';
export type LetterAudioMode = 'phonics' | 'names-and-sounds';
export type VoiceSpeed = 'slow' | 'normal';
export type BlendingStyle = 'successive' | 'continuous';

export interface ParentSettings {
  scaffoldMode: ScaffoldMode;
  letterAudioMode: LetterAudioMode;
  voiceSpeed: VoiceSpeed;
  blendingStyle: BlendingStyle;
  voiceEnabled: boolean;
  chimesEnabled: boolean;
  unlockAllZones: boolean;
  preferredVoiceUri: string;
}

export type AccessorySlot = 'head' | 'eyes' | 'neck';

export type AccessoryId =
  | 'trainer-cap'
  | 'flower-crown'
  | 'sunny-bow-tie'
  | 'star-shades'
  | 'berry-scarf'
  | 'champion-crown';

export interface AccessoryDef {
  id: AccessoryId;
  name: string;
  slot: AccessorySlot;
  starsRequired: number;
  accentColor: string;
  description: string;
}

export type PartnerMoveId =
  | 'tackle'
  | 'quick-attack'
  | 'swift'
  | 'bouncy-bubble'
  | 'buzzy-buzz'
  | 'sizzly-slide'
  | 'veevee-volley';

export interface PartnerMoveDef {
  id: PartnerMoveId;
  name: string;
  elementType: ElementType;
  starsRequired: number;
  spokenCallout: string;
  accentColor: string;
}

export type BadgeId =
  | 'pallet-first-sounds'
  | 'smooth-blender'
  | 'lets-go-menu-reader'
  | 'nurse-joy-helper'
  | 'battle-move-star'
  | 'word-chain-whiz'
  | 'kanto-pal-collector'
  | 'eevee-spelling-champion';

export interface BadgeDef {
  id: BadgeId;
  name: string;
  subtitle: string;
  description: string;
  gradient: string;
  iconType: 'house' | 'paw' | 'controller' | 'heart' | 'bolt' | 'chain' | 'pokeball' | 'crown';
}

export type MenuDeckId = 'pause' | 'battle' | 'medicine' | 'attacks';

export interface MenuCardItem {
  id: string;
  deckId: MenuDeckId;
  label: string;
  focusWord: string;
  units: PhonemeUnit[];
  prompt: string;
  spokenHint: string;
  accentColor: string;
  iconType:
    | 'dex'
    | 'bag'
    | 'party'
    | 'map'
    | 'save'
    | 'fight'
    | 'run'
    | 'potion'
    | 'spray'
    | 'pill'
    | 'ball'
    | 'berry'
    | 'candy'
    | 'attack';
  itemSlug?: string;
  statusTag?: StatusCondition;
  elementType?: ElementType;
}

export interface MenuDeckDef {
  id: MenuDeckId;
  title: string;
  shortTitle: string;
  accentColor: string;
  description: string;
}

export interface WordChainStep {
  word: string;
  units: PhonemeUnit[];
  changedIndex: number | null;
  previousLetters: string | null;
  newLetters: string | null;
  pokemonId: number;
  everydaySentence: string;
  spokenPrompt: string;
}

export interface WordChainDef {
  id: string;
  title: string;
  phonicsLabel: string;
  accentColor: string;
  steps: WordChainStep[];
}

export type MasteryStatus = 'new' | 'learning' | 'mastered';

export interface WordMasteryRecord {
  attempts: number;
  cleanWins: number;
  assistedWins: number;
  status: MasteryStatus;
  lastPracticedAt: number;
}

export type EquippedAccessories = Record<AccessorySlot, AccessoryId | null>;

export interface PlayerProgress {
  version: number;
  totalStars: number;
  battlesWon: number;
  totalBlends: number;
  menuTrainerWins: number;
  completedZones: ZoneId[];
  completedChains: string[];
  caughtPokemonIds: number[];
  earnedBadges: BadgeId[];
  equippedAccessories: EquippedAccessories;
  selectedMoveId: PartnerMoveId;
  wordMastery: Record<string, WordMasteryRecord>;
  settings: ParentSettings;
}

export type EeveeMood = 'idle' | 'happy' | 'cheering' | 'proud' | 'encouraging' | 'sparkle';
