import React from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import { DRESS_UP_ACCESSORIES, PARTNER_MOVES } from '../data/rewards';
import type { AccessoryDef, PartnerMoveId, PlayerProgress } from '../data/types';
import {
  getNextAccessoryMilestone,
  getUnlockedMoves,
} from '../engine/milestoneEngine';
import { AccessoryBadgeIcon, EeveeAvatar } from './EeveeAvatar';
import { LockIcon, StarIcon } from './SwitchIcons';

interface EeveeClosetModalProps {
  progress: PlayerProgress;
  onToggleAccessory: (acc: AccessoryDef) => void;
  onSelectMove: (moveId: PartnerMoveId) => void;
  onClose: () => void;
}

export const EeveeClosetModal: React.FC<EeveeClosetModalProps> = ({
  progress,
  onToggleAccessory,
  onSelectMove,
  onClose,
}) => {
  const nextMilestone = getNextAccessoryMilestone(progress.totalStars);
  const unlockedMoves = getUnlockedMoves(progress.totalStars);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Eevee Dress-Up Closet and Partner Moves"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel" style={{ maxWidth: '840px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Eevee&apos;s Closet &amp; Partner Moves</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="top-hud__stars">
              <StarIcon size={16} filled />
              <span>{progress.totalStars}</span>
            </span>
            <button
              id="btn-close-closet"
              type="button"
              className="switch-pill-btn"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="closet-grid">
          {/* Left Studio Pedestal */}
          <div className="closet-pedestal">
            <EeveeAvatar
              size={156}
              mood="proud"
              equipped={progress.equippedAccessories}
            />
            <div
              style={{
                width: '130px',
                height: '16px',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.9)',
                boxShadow: '0 4px 12px rgba(15,35,65,0.12)',
                marginTop: '-16px',
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '0.96rem' }}>
                Mix &amp; Match by Slot!
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                {nextMilestone
                  ? `Next unlock: ${nextMilestone.name} at ${nextMilestone.starsRequired} ★`
                  : 'All 6 accessories unlocked!'}
              </div>
            </div>
          </div>

          {/* Right Accessories & 7 Partner Moves */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: '1.08rem' }}>
                Dress-Up Accessories (6)
              </h3>
              <div className="accessory-grid">
                {DRESS_UP_ACCESSORIES.map((acc) => {
                  const unlocked = progress.totalStars >= acc.starsRequired;
                  const equipped = progress.equippedAccessories[acc.slot] === acc.id;
                  return (
                    <button
                      key={acc.id}
                      id={`closet-acc-${acc.id}`}
                      type="button"
                      disabled={!unlocked}
                      className={`accessory-tile ${equipped ? 'accessory-tile--equipped' : ''}`}
                      onClick={() => {
                        soundEffects.playCorrectPop();
                        onToggleAccessory(acc);
                        void speechEngine.speakAccessory(
                          acc.id,
                          !equipped,
                          equipped ? `Took off ${acc.name}` : `Eevee put on the ${acc.name}!`,
                        );
                      }}
                    >
                      <AccessoryBadgeIcon id={acc.id} size={40} />
                      <span style={{ fontWeight: 900, fontSize: '0.86rem' }}>{acc.name}</span>
                      <span
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          color: !unlocked
                            ? 'var(--ink-muted)'
                            : equipped
                              ? '#15803D'
                              : 'var(--switch-blue)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {!unlocked && <LockIcon size={12} />}
                        {!unlocked
                          ? `${acc.starsRequired} ★`
                          : equipped
                            ? 'Equipped'
                            : 'Wear'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: '1.08rem' }}>
                Eevee Partner Moves ({unlockedMoves.length}/{PARTNER_MOVES.length})
              </h3>
              <div className="segmented-control">
                {PARTNER_MOVES.map((move) => {
                  const unlocked = progress.totalStars >= move.starsRequired;
                  const selected = progress.selectedMoveId === move.id;
                  return (
                    <button
                      key={move.id}
                      id={`closet-move-${move.id}`}
                      type="button"
                      disabled={!unlocked}
                      className={`seg-btn ${selected ? 'seg-btn--active' : ''}`}
                      style={{
                        opacity: unlocked ? 1 : 0.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      onClick={() => {
                        soundEffects.playAttackSparkle(move.elementType);
                        onSelectMove(move.id);
                        void speechEngine.speakMoveReady(
                          move.id,
                          `Eevee is ready to use ${move.name}!`,
                        );
                      }}
                    >
                      <span>{move.name}</span>
                      {!unlocked && (
                        <span style={{ fontSize: '0.74rem' }}>({move.starsRequired}★)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
