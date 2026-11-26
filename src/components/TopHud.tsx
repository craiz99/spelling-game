import React, { useEffect, useRef, useState } from 'react';
import {
  BookIcon,
  CrownIcon,
  GearIcon,
  PokeBallIcon,
  SpeakerIcon,
  StarIcon,
} from './SwitchIcons';

interface TopHudProps {
  totalStars: number;
  caughtPokemonCount: number;
  voiceMuted: boolean;
  onOpenPokedex: () => void;
  onOpenStickerBook: () => void;
  onOpenCloset: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
}

const HOLD_DURATION_MS = 1000;

/**
 * Floating Nintendo Switch HUD pills overlaid lightly at the top corners:
 * - Top-Left: Star Stickers count + clickable My Captured Pokémon Pokédex button!
 * - Top-Right: Book (Badges & Words), Eevee Closet, Mute toggle, and Grown-Up Settings
 */
export const TopHud: React.FC<TopHudProps> = ({
  totalStars,
  caughtPokemonCount,
  voiceMuted,
  onOpenPokedex,
  onOpenStickerBook,
  onOpenCloset,
  onToggleMute,
  onOpenSettings,
}) => {
  const [holdPercent, setHoldPercent] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const clearHold = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setHoldPercent(0);
  };

  useEffect(() => clearHold, []);

  const beginHold = () => {
    clearHold();
    startRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(100, Math.round((elapsed / HOLD_DURATION_MS) * 100));
      setHoldPercent(pct);
      if (elapsed >= HOLD_DURATION_MS) {
        clearHold();
        onOpenSettings();
      }
    }, 45);
  };

  const handleGearKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      clearHold();
      onOpenSettings();
    }
  };

  return (
    <header className="floating-hud" aria-label="Game navigation">
      <div className="floating-hud__group">
        <div className="hud-stat-pill" aria-label={`${totalStars} Star Stickers`}>
          <StarIcon size={20} filled />
          <span>{totalStars}</span>
        </div>

        <button
          id="hud-pokedex-btn"
          type="button"
          className="hud-circle-btn hud-pokedex-btn"
          onClick={onOpenPokedex}
          aria-label={`My Captured Pokémon: ${caughtPokemonCount}. Tap to view Pokédex.`}
          title="My Captured Pokémon"
        >
          <PokeBallIcon size={20} color="#E64545" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            {caughtPokemonCount}
          </span>
          <span className="hud-circle-btn__text">Pokémon</span>
        </button>
      </div>

      <div className="floating-hud__group">
        <button
          id="hud-sticker-book-btn"
          type="button"
          className="hud-circle-btn"
          onClick={onOpenStickerBook}
          aria-label="Open Trainer Sticker Book"
          title="Sticker Book"
        >
          <BookIcon size={20} />
          <span className="hud-circle-btn__text">Book</span>
        </button>

        <button
          id="hud-closet-btn"
          type="button"
          className="hud-circle-btn"
          onClick={onOpenCloset}
          aria-label="Open Eevee Dress-Up Closet"
          title="Eevee Closet"
        >
          <CrownIcon size={20} />
          <span className="hud-circle-btn__text">Closet</span>
        </button>

        <button
          id="hud-mute-btn"
          type="button"
          className="hud-circle-btn"
          onClick={onToggleMute}
          aria-label={voiceMuted ? 'Unmute voice and chimes' : 'Mute voice and chimes'}
          title={voiceMuted ? 'Turn Sound On' : 'Mute Sound'}
        >
          <SpeakerIcon size={20} muted={voiceMuted} />
        </button>

        <button
          id="hud-settings-gear-btn"
          type="button"
          className="hud-circle-btn hud-gear-btn"
          onPointerDown={beginHold}
          onPointerUp={clearHold}
          onPointerLeave={clearHold}
          onPointerCancel={clearHold}
          onKeyDown={handleGearKeyDown}
          aria-label="Grown-Up Settings (hold to open or press Enter)"
          title="Hold 1 second (or press Enter) for Grown-Up Settings"
        >
          {holdPercent > 0 && (
            <span
              className="hud-gear-progress"
              style={{ width: `${holdPercent}%` }}
            />
          )}
          <GearIcon size={20} />
        </button>
      </div>
    </header>
  );
};
