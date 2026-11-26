import React from 'react';
import type { AccessoryId, EeveeMood, EquippedAccessories } from '../data/types';
import { PokemonSprite } from './PokemonSprite';

interface EeveeAvatarProps {
  size?: number;
  mood?: EeveeMood;
  equipped: EquippedAccessories;
  className?: string;
}

/**
 * Renders official PokéAPI Eevee (#133) artwork with refined, soft-shaded
 * Dress-Up Closet accessory overlays accurately calibrated to Eevee's official artwork pose.
 */
export const EeveeAvatar: React.FC<EeveeAvatarProps> = ({
  size = 112,
  mood = 'idle',
  equipped,
  className = '',
}) => {
  const hasOverlay = Boolean(equipped.head || equipped.eyes || equipped.neck);

  return (
    <div
      className={`eevee-avatar eevee-avatar--${mood} ${className}`}
      style={{ width: size, height: size }}
    >
      <PokemonSprite pokemonId={133} name="Eevee" size={size} />

      {hasOverlay && (
        <svg
          className="eevee-accessory-layer"
          viewBox="0 0 120 120"
          fill="none"
          aria-hidden="true"
        >
          {/* Head Slot Accessories (calibrated to official Eevee #133 crown area) */}
          {equipped.head === 'trainer-cap' && (
            <g style={{ filter: 'drop-shadow(0 2px 3px rgba(15,35,65,0.22))' }}>
              <path d="M36 39 C38 22 68 20 74 37 Z" fill="#E64545" />
              <path d="M44 37 C46 27 62 26 65 36 Z" fill="#FFFFFF" />
              <path d="M51 32 A4 4 0 0 1 59 32" stroke="#E64545" strokeWidth="2.2" fill="none" />
              <path d="M31 39 Q53 33 78 39 L75 43 Q53 38 32 42 Z" fill="#C62828" />
            </g>
          )}

          {equipped.head === 'flower-crown' && (
            <g style={{ filter: 'drop-shadow(0 2px 3px rgba(15,35,65,0.18))' }}>
              <path d="M36 37 Q54 29 73 36" stroke="#43A047" strokeWidth="3" strokeLinecap="round" />
              <circle cx="40" cy="36" r="4.8" fill="#F472B6" />
              <circle cx="40" cy="36" r="1.7" fill="#FFFBEB" />
              <circle cx="50" cy="32.5" r="5.2" fill="#FBBF24" />
              <circle cx="50" cy="32.5" r="1.8" fill="#FFFFFF" />
              <circle cx="60" cy="32.5" r="5.2" fill="#60A5FA" />
              <circle cx="60" cy="32.5" r="1.8" fill="#FFFFFF" />
              <circle cx="69" cy="36" r="4.6" fill="#4ADE80" />
              <circle cx="69" cy="36" r="1.6" fill="#FFFFFF" />
            </g>
          )}

          {equipped.head === 'champion-crown' && (
            <g style={{ filter: 'drop-shadow(0 2px 4px rgba(180,120,0,0.35))' }}>
              <path
                d="M39 36 L41 21 L49 28 L55 18 L61 28 L69 21 L71 36 Z"
                fill="url(#champCrownGrad)"
                stroke="#B45309"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <circle cx="55" cy="30" r="2.6" fill="#EF4444" />
              <circle cx="45" cy="31" r="2" fill="#38BDF8" />
              <circle cx="65" cy="31" r="2" fill="#38BDF8" />
              <defs>
                <linearGradient id="champCrownGrad" x1="39" y1="18" x2="71" y2="36" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
            </g>
          )}

          {/* Eyes Slot — Star Shades */}
          {equipped.eyes === 'star-shades' && (
            <g style={{ filter: 'drop-shadow(0 2px 3px rgba(15,35,65,0.28))' }}>
              <polygon
                points="44,41 46.2,46 51.5,46.4 47.4,50 48.6,55.2 44,52.4 39.4,55.2 40.6,50 36.5,46.4 41.8,46"
                fill="#1E3A8A"
                stroke="#F5B82E"
                strokeWidth="1.7"
              />
              <polygon
                points="62,41 64.2,46 69.5,46.4 65.4,50 66.6,55.2 62,52.4 57.4,55.2 58.6,50 54.5,46.4 59.8,46"
                fill="#1E3A8A"
                stroke="#F5B82E"
                strokeWidth="1.7"
              />
              <line x1="50" y1="47.5" x2="56" y2="47.5" stroke="#F5B82E" strokeWidth="2.2" />
            </g>
          )}

          {/* Neck Slot Accessories */}
          {equipped.neck === 'sunny-bow-tie' && (
            <g style={{ filter: 'drop-shadow(0 2px 3px rgba(15,35,65,0.2))' }}>
              <polygon points="56,74 44,68 44,80" fill="#FBBF24" />
              <polygon points="56,74 68,68 68,80" fill="#FBBF24" />
              <circle cx="56" cy="74" r="3.6" fill="#D97706" />
            </g>
          )}

          {equipped.neck === 'berry-scarf' && (
            <g style={{ filter: 'drop-shadow(0 2px 3px rgba(15,35,65,0.22))' }}>
              <path
                d="M38 69 Q56 79 74 69 Q72 78 56 82 Q40 78 38 69 Z"
                fill="#E11D48"
              />
              <path d="M58 76 L67 90 L57 88 Z" fill="#BE123C" />
              <circle cx="55" cy="76" r="2.2" fill="#FDA4AF" />
            </g>
          )}
        </svg>
      )}
    </div>
  );
};

export const AccessoryBadgeIcon: React.FC<{ id: AccessoryId; size?: number }> = ({
  id,
  size = 40,
}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    {id === 'trainer-cap' && (
      <>
        <path d="M8 30 C10 13 38 13 40 30 Z" fill="#E64545" />
        <path d="M16 29 C18 19 30 19 32 29 Z" fill="#FFFFFF" />
        <path d="M5 30 Q24 25 44 31 L42 35 Q24 30 6 33 Z" fill="#C62828" />
      </>
    )}
    {id === 'flower-crown' && (
      <>
        <path d="M8 29 Q24 18 40 29" stroke="#34B86E" strokeWidth="4" strokeLinecap="round" />
        <circle cx="13" cy="27" r="5" fill="#F472B6" />
        <circle cx="24" cy="22" r="5.5" fill="#FBBF24" />
        <circle cx="35" cy="27" r="5" fill="#60A5FA" />
        <circle cx="24" cy="22" r="2" fill="#FFFFFF" />
      </>
    )}
    {id === 'sunny-bow-tie' && (
      <>
        <polygon points="24,24 9,15 9,33" fill="#FBBF24" />
        <polygon points="24,24 39,15 39,33" fill="#FBBF24" />
        <circle cx="24" cy="24" r="5" fill="#D97706" />
      </>
    )}
    {id === 'star-shades' && (
      <>
        <polygon points="15,15 17.5,20.5 23.5,21 19,25 20.3,31 15,27.8 9.7,31 11,25 6.5,21 12.5,20.5" fill="#1E3A8A" stroke="#F5B82E" strokeWidth="2" />
        <polygon points="33,15 35.5,20.5 41.5,21 37,25 38.3,31 33,27.8 27.7,31 29,25 24.5,21 30.5,20.5" fill="#1E3A8A" stroke="#F5B82E" strokeWidth="2" />
        <line x1="21.5" y1="22.5" x2="26.5" y2="22.5" stroke="#F5B82E" strokeWidth="2.5" />
      </>
    )}
    {id === 'berry-scarf' && (
      <>
        <path d="M8 20 Q24 32 40 20 Q38 30 24 35 Q10 30 8 20 Z" fill="#E11D48" />
        <path d="M27 29 L36 42 L25 40 Z" fill="#BE123C" />
      </>
    )}
    {id === 'champion-crown' && (
      <>
        <path d="M8 34 L11 14 L19 23 L24 11 L29 23 L37 14 L40 34 Z" fill="#F59E0B" />
        <circle cx="24" cy="26" r="3.2" fill="#EF4444" />
        <circle cx="15" cy="27" r="2.2" fill="#38BDF8" />
        <circle cx="33" cy="27" r="2.2" fill="#38BDF8" />
      </>
    )}
  </svg>
);
