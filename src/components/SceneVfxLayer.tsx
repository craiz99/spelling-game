import React from 'react';
import type { ElementType, TownChallengeMode } from '../data/types';
import { ItemSprite } from './PokemonSprite';
import { HeartIcon, PokeBallIcon, SparkleIcon } from './SwitchIcons';

interface SceneVfxLayerProps {
  mode: TownChallengeMode;
  moveName: string;
  elementType: ElementType;
  itemSlug?: string;
  targetLabel: string;
}

/**
 * Renders animated Nintendo Switch gameplay payoff VFX directly over the painted scene:
 * - Wild Catch / Forest Trail: Parabolic Poké Ball throw arc -> wobble -> GOTCHA stars
 * - Pokémon Center Clinic: Swirling Nurse Joy healing sparkles & rising hearts
 * - Pewter Poké Mart: Glowing item swooping into the Adventure Bag
 * - Cerulean Gym / Champion Stadium: Elemental Partner Move VFX (stars, bubbles, lightning, embers)
 */
export const SceneVfxLayer: React.FC<SceneVfxLayerProps> = ({
  mode,
  moveName,
  elementType,
  itemSlug,
  targetLabel,
}) => {
  if (mode === 'wild-catch' || mode === 'forest-trail') {
    return (
      <div className="vfx-layer" role="status" aria-label={`Catching ${targetLabel}`}>
        <div className="vfx-pokeball-arc">
          <div className="vfx-pokeball-spin">
            <PokeBallIcon size={56} color="#E64545" />
          </div>
        </div>

        <div className="vfx-catch-burst">
          <SparkleIcon size={26} color="#F5B82E" />
          <SparkleIcon size={34} color="#FFE066" />
          <SparkleIcon size={26} color="#22C3DC" />
        </div>

        <div className="vfx-callout-pill vfx-callout-pill--catch">
          Gotcha! {targetLabel} joined you!
        </div>
      </div>
    );
  }

  if (mode === 'clinic-heal') {
    return (
      <div className="vfx-layer" role="status" aria-label={`Healing ${targetLabel}`}>
        <div className="vfx-heal-column">
          <div className="vfx-heal-bottle">
            <ItemSprite
              itemSlug={itemSlug ?? 'potion'}
              label="Medicine"
              accentColor="#F06277"
              size={52}
            />
          </div>
          <div className="vfx-heal-hearts">
            <HeartIcon size={26} color="#F43F5E" />
            <HeartIcon size={32} color="#34B86E" />
            <HeartIcon size={24} color="#F5B82E" />
          </div>
        </div>
        <div className="vfx-callout-pill vfx-callout-pill--heal">
          All Better! {targetLabel} is healed!
        </div>
      </div>
    );
  }

  if (mode === 'mart-quest') {
    return (
      <div className="vfx-layer" role="status" aria-label="Item packed in bag">
        <div className="vfx-mart-item">
          <ItemSprite
            itemSlug={itemSlug ?? 'poke-ball'}
            label={targetLabel}
            accentColor="#2C98F0"
            size={58}
          />
        </div>
        <div className="vfx-callout-pill vfx-callout-pill--mart">
          Packed into your Adventure Bag!
        </div>
      </div>
    );
  }

  // Elemental Gym Battle & Champion Stadium Partner Move VFX
  const isWater = elementType === 'Water';
  const isElectric = elementType === 'Electric';
  const isFire = elementType === 'Fire';

  return (
    <div className="vfx-layer" role="status" aria-label={`Eevee used ${moveName}`}>
      <div className="vfx-projectile-stream">
        {[0, 1, 2, 3].map((idx) => (
          <span
            key={idx}
            className={`vfx-projectile vfx-projectile--${idx}`}
            style={{ animationDelay: `${idx * 0.09}s` }}
          >
            {isWater ? (
              <span className="vfx-bubble" />
            ) : isElectric ? (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            ) : isFire ? (
              <span className="vfx-ember" />
            ) : (
              <SparkleIcon size={34} color={idx % 2 === 0 ? '#F5B82E' : '#38BDF8'} />
            )}
          </span>
        ))}
      </div>

      <div className="vfx-callout-pill vfx-callout-pill--move">
        <span className={`type-pill type-pill--${elementType}`}>{elementType}</span>
        <span>Eevee used {moveName}!</span>
      </div>
    </div>
  );
};
