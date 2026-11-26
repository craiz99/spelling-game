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
 * Renders official PokéAPI Eevee (#133) artwork with precision-calibrated
 * Dress-Up Closet accessory overlays measured directly against the 475x475 sprite grid:
 * - Crown midpoint between ears: (44, 37) tilted +11deg
 * - Eyes: left (32.5, 54.5), right (52.5, 58.5), bridge (42.5, 56.5) tilted +11deg
 * - Neck fluff collar: center (39, 73.5) tilted +10deg
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
          {/* Head Slot Accessories — centered on (44, 36.5) with +11deg head tilt */}
          {equipped.head === 'trainer-cap' && (
            <g
              transform="translate(44, 36.5) rotate(11)"
              style={{ filter: 'drop-shadow(0 2px 3px rgba(15,35,65,0.26))' }}
            >
              <path d="M-15 2 C-13 -13 13 -13 15 2 Z" fill="#E64545" stroke="#991B1B" strokeWidth="1" />
              <path d="M-8 1 C-6 -7 6 -7 8 1 Z" fill="#FFFFFF" />
              <path d="M-4 -2.5 A4 4 0 0 1 4 -2.5" stroke="#E64545" strokeWidth="2.1" fill="none" />
              <circle cx="0" cy="-10.5" r="2.1" fill="#C62828" />
              <path d="M-19 2 Q-2 -3.5 17 2.5 L15 6 Q-2 1 -18 5.5 Z" fill="#B91C1C" />
            </g>
          )}

          {equipped.head === 'flower-crown' && (
            <g
              transform="translate(44, 37) rotate(11)"
              style={{ filter: 'drop-shadow(0 2px 3px rgba(15,35,65,0.2))' }}
            >
              <path d="M-15 2 Q0 -5 15 2" stroke="#2E9E5B" strokeWidth="3.2" strokeLinecap="round" />
              <circle cx="-12" cy="1" r="4.4" fill="#F472B6" />
              <circle cx="-12" cy="1" r="1.6" fill="#FFFBEB" />
              <circle cx="-4" cy="-2" r="4.9" fill="#FBBF24" />
              <circle cx="-4" cy="-2" r="1.7" fill="#FFFFFF" />
              <circle cx="5" cy="-2" r="4.9" fill="#60A5FA" />
              <circle cx="5" cy="-2" r="1.7" fill="#FFFFFF" />
              <circle cx="13" cy="1" r="4.2" fill="#4ADE80" />
              <circle cx="13" cy="1" r="1.5" fill="#FFFFFF" />
            </g>
          )}

          {equipped.head === 'champion-crown' && (
            <g
              transform="translate(44, 35) rotate(11)"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(180,120,0,0.38))' }}
            >
              <path
                d="M-13 2 L-11 -11 L-4 -4.5 L0 -14 L4 -4.5 L11 -11 L13 2 Z"
                fill="url(#champCrownGrad)"
                stroke="#B45309"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <circle cx="0" cy="-3" r="2.4" fill="#EF4444" />
              <circle cx="-7.5" cy="-2.2" r="1.9" fill="#38BDF8" />
              <circle cx="7.5" cy="-2.2" r="1.9" fill="#38BDF8" />
              <defs>
                <linearGradient id="champCrownGrad" x1="-13" y1="-14" x2="13" y2="2" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
            </g>
          )}

          {/* Eyes Slot — Star Shades centered directly on left eye (32.5,54.5) & right eye (52.5,58.5) */}
          {equipped.eyes === 'star-shades' && (
            <g
              transform="translate(42.5, 56.5) rotate(11)"
              style={{ filter: 'drop-shadow(0 2px 3px rgba(15,35,65,0.3))' }}
            >
              <polygon
                points="-10,-7.5 -7.8,-2.5 -2.5,-2 -6.6,1.6 -5.4,6.8 -10,4 -14.6,6.8 -13.4,1.6 -17.5,-2 -12.2,-2.5"
                fill="#1E3A8A"
                stroke="#F5B82E"
                strokeWidth="1.7"
              />
              <polygon
                points="10,-7.5 12.2,-2.5 17.5,-2 13.4,1.6 14.6,6.8 10,4 5.4,6.8 6.6,1.6 2.5,-2 7.8,-2.5"
                fill="#1E3A8A"
                stroke="#F5B82E"
                strokeWidth="1.7"
              />
              <line x1="-3.5" y1="-1.2" x2="3.5" y2="-1.2" stroke="#F5B82E" strokeWidth="2.3" />
            </g>
          )}

          {/* Neck Slot Accessories — centered on Eevee's fluffy chest collar (39, 73.5) with +10deg tilt */}
          {equipped.neck === 'sunny-bow-tie' && (
            <g
              transform="translate(39, 73.5) rotate(10)"
              style={{ filter: 'drop-shadow(0 2px 3px rgba(15,35,65,0.24))' }}
            >
              <polygon points="0,0 -11,-6 -11,6" fill="#FBBF24" stroke="#B45309" strokeWidth="1" />
              <polygon points="0,0 11,-6 11,6" fill="#FBBF24" stroke="#B45309" strokeWidth="1" />
              <circle cx="0" cy="0" r="3.4" fill="#D97706" />
            </g>
          )}

          {equipped.neck === 'berry-scarf' && (
            <g
              transform="translate(39, 71) rotate(10)"
              style={{ filter: 'drop-shadow(0 2px 3px rgba(15,35,65,0.24))' }}
            >
              <path
                d="M-17 -3 Q0 7 18 -3 Q16 5.5 0 9.5 Q-15 5.5 -17 -3 Z"
                fill="#E11D48"
                stroke="#9F1239"
                strokeWidth="0.9"
              />
              <path d="M2 5 L11 19 L1 17 Z" fill="#BE123C" />
              <circle cx="-1" cy="4.2" r="2.2" fill="#FDA4AF" />
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
