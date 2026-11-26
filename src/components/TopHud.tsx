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
  voiceMuted: boolean;
  onGoHome: () => void;
  onOpenStickerBook: () => void;
  onOpenCloset: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
}

const HOLD_DURATION_MS = 1000;

export const TopHud: React.FC<TopHudProps> = ({
  totalStars,
  voiceMuted,
  onGoHome,
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
      clearHold();
      onOpenSettings();
    }
  };

  return (
    <header className="top-hud" aria-label="Game navigation">
      <div className="top-hud__left">
        <button
          id="hud-home-btn"
          type="button"
          className="top-hud__brand"
          onClick={onGoHome}
          aria-label="Return to Kanto Map"
        >
          <PokeBallIcon size={26} color="#E64545" />
          <span>Let&apos;s Go, Spell with Eevee!</span>
        </button>

        <div className="top-hud__stars" aria-label={`${totalStars} Star Stickers`}>
          <StarIcon size={18} filled />
          <span>{totalStars}</span>
        </div>
      </div>

      <div className="top-hud__actions">
        <button
          id="hud-sticker-book-btn"
          type="button"
          className="hud-icon-btn"
          onClick={onOpenStickerBook}
        >
          <BookIcon size={18} />
          <span>Sticker Book</span>
        </button>

        <button
          id="hud-closet-btn"
          type="button"
          className="hud-icon-btn"
          onClick={onOpenCloset}
        >
          <CrownIcon size={18} />
          <span>Eevee Closet</span>
        </button>

        <button
          id="hud-mute-btn"
          type="button"
          className="hud-icon-btn"
          onClick={onToggleMute}
          aria-label={voiceMuted ? 'Unmute voice and chimes' : 'Mute voice and chimes'}
          title={voiceMuted ? 'Turn Sound On' : 'Mute Sound'}
        >
          <SpeakerIcon size={19} muted={voiceMuted} />
        </button>

        <button
          id="hud-settings-gear-btn"
          type="button"
          className="hud-icon-btn hud-gear-btn"
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
          <GearIcon size={19} />
          <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>Hold</span>
        </button>
      </div>
    </header>
  );
};
