import React from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import type { EquippedAccessories } from '../data/types';
import { EeveeAvatar } from './EeveeAvatar';
import { PokeBallIcon } from './SwitchIcons';

interface WelcomeOverlayProps {
  equipped: EquippedAccessories;
  onStart: () => void;
}

/**
 * Friendly 1-tap welcome launch card that cleanly unlocks Web Audio & Web Speech
 * on iPad/iOS Safari before Eevee speaks the first line!
 */
export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({
  equipped,
  onStart,
}) => {
  const handleStart = () => {
    soundEffects.unlock();
    speechEngine.unlock();
    soundEffects.playVictoryFanfare();
    void speechEngine.speak(
      'Hi friend! Let us go spell and blend with Eevee! Pick a Kanto town to play!',
    );
    onStart();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Let's Go, Spell with Eevee"
    >
      <div
        className="modal-panel"
        style={{ maxWidth: '480px', alignItems: 'center', textAlign: 'center', gap: '16px' }}
      >
        <EeveeAvatar size={146} mood="cheering" equipped={equipped} />
        <h2 className="modal-title" style={{ fontSize: '1.75rem' }}>
          Let&apos;s Go, Spell with Eevee!
        </h2>
        <p style={{ margin: 0, fontWeight: 700, color: 'var(--ink-secondary)', fontSize: '1.02rem' }}>
          Build words with sound boxes, slide Eevee&apos;s paw to blend smoothly, and unlock Kanto friends!
        </p>
        <button
          id="btn-welcome-start"
          type="button"
          className="switch-cta switch-cta--emerald"
          style={{ minHeight: '66px', padding: '14px 34px', fontSize: '1.2rem' }}
          onClick={handleStart}
        >
          <PokeBallIcon size={24} color="#FFFFFF" />
          <span>Let&apos;s Go!</span>
        </button>
      </div>
    </div>
  );
};
