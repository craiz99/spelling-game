import React, { useEffect } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import type { BadgeDef } from '../data/types';
import { BadgeGlyph, SparkleIcon } from './SwitchIcons';

interface BadgeCeremonyModalProps {
  badge: BadgeDef;
  onDismiss: () => void;
}

export const BadgeCeremonyModal: React.FC<BadgeCeremonyModalProps> = ({
  badge,
  onDismiss,
}) => {
  useEffect(() => {
    soundEffects.playBadgeFanfare();
    void speechEngine.speakBadge(
      badge.id,
      `Hooray! You earned the ${badge.name} Badge! ${badge.description}`,
    );
  }, [badge]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Badge Ceremony: ${badge.name}`}
    >
      <div
        className="modal-panel"
        style={{ maxWidth: '460px', alignItems: 'center', textAlign: 'center' }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: '#FEF3C7',
            color: '#B45309',
            fontWeight: 900,
            fontSize: '0.84rem',
          }}
        >
          <SparkleIcon size={16} color="#F59E0B" />
          <span>New Kanto Spelling Badge!</span>
        </div>

        <div
          className="badge-medal"
          style={{
            width: '108px',
            height: '108px',
            background: badge.gradient,
            borderWidth: '5px',
          }}
        >
          <BadgeGlyph type={badge.iconType} size={46} />
        </div>

        <h2 className="modal-title" style={{ fontSize: '1.65rem' }}>
          {badge.name}
        </h2>
        <p style={{ margin: 0, fontWeight: 700, color: 'var(--ink-secondary)' }}>
          {badge.description}
        </p>

        <button
          id="btn-badge-collect"
          type="button"
          className="switch-cta switch-cta--emerald"
          onClick={onDismiss}
        >
          Collect Badge!
        </button>
      </div>
    </div>
  );
};
