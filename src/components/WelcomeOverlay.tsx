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
 * Clean 1-tap launch overlay that unlocks both Web Audio and Web Speech
 * directly inside the user's tap gesture (zero synchronous cancel() race!).
 */
export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({
  equipped,
  onStart,
}) => {
  const handleStart = () => {
    soundEffects.unlock();
    speechEngine.unlock();
    soundEffects.playVictoryFanfare();
    // Speak directly inside user gesture with interrupt:false so Safari/Chrome never drop it
    void speechEngine.speak(
      'Hi friend! Let us go spell with Eevee! Tap a town on the Kanto map!',
      { interrupt: false },
    );
    onStart();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Let's Go, Spell with Eevee"
    >
      <div
        className="modal-panel"
        style={{ maxWidth: '420px', alignItems: 'center', textAlign: 'center', gap: '16px' }}
      >
        <EeveeAvatar size={156} mood="cheering" equipped={equipped} />
        <h2 className="modal-title" style={{ fontSize: '1.75rem' }}>
          Let&apos;s Go, Spell with Eevee!
        </h2>
        <button
          id="btn-welcome-start"
          type="button"
          className="switch-cta switch-cta--emerald"
          style={{ minHeight: '68px', padding: '14px 40px', fontSize: '1.25rem' }}
          onClick={handleStart}
        >
          <PokeBallIcon size={26} color="#FFFFFF" />
          <span>Let&apos;s Go!</span>
        </button>
      </div>
    </div>
  );
};
