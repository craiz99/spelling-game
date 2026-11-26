import React, { useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import { getWordsByZone, ZONES } from '../data/curriculum';
import type { EeveeMood, PlayerProgress, ZoneId } from '../data/types';
import { isZoneUnlocked } from '../engine/milestoneEngine';
import { EeveeAvatar } from './EeveeAvatar';
import { PokemonSprite } from './PokemonSprite';
import { LockIcon, PokeBallIcon, StarIcon } from './SwitchIcons';

interface HomeMapProps {
  progress: PlayerProgress;
  onSelectZone: (zoneId: ZoneId) => void;
  onOpenMenuTrainer: () => void;
  onOpenBlendingDojo: () => void;
}

const EEVEE_GREETINGS = [
  'Hi friend! Pick a Kanto town to spell and blend together!',
  'Eevee loves spelling with you! Tap any Kanto town below!',
  'Ready to practice smooth blending? Let\'s go!',
];

export const HomeMap: React.FC<HomeMapProps> = ({
  progress,
  onSelectZone,
  onOpenMenuTrainer,
  onOpenBlendingDojo,
}) => {
  const [greetingIdx, setGreetingIdx] = useState(0);
  const [mood, setMood] = useState<EeveeMood>('idle');

  const handlePetEevee = () => {
    const nextIdx = (greetingIdx + 1) % EEVEE_GREETINGS.length;
    setGreetingIdx(nextIdx);
    setMood('cheering');
    soundEffects.playCorrectPop();
    void speechEngine.speak(EEVEE_GREETINGS[nextIdx]!);
    window.setTimeout(() => setMood('idle'), 1400);
  };

  return (
    <main className="app-container" style={{ gap: '18px' }}>
      {/* Hero Banner with Official Eevee + Mode Launchers */}
      <section className="home-hero" aria-label="Eevee partner hub">
        <div className="home-hero__partner">
          <button
            id="btn-pet-eevee"
            type="button"
            className="eevee-pet-btn"
            onClick={handlePetEevee}
            aria-label="Pet Eevee to hear a cheerful greeting"
          >
            <EeveeAvatar
              size={120}
              mood={mood}
              equipped={progress.equippedAccessories}
            />
          </button>

          <div className="switch-dialogue">
            <h1 className="switch-dialogue__title">Kanto Spelling Adventure</h1>
            <p className="switch-dialogue__text">
              {EEVEE_GREETINGS[greetingIdx]}
              <span className="switch-dialogue__caret" aria-hidden="true">
                ▸
              </span>
            </p>
          </div>
        </div>

        <div className="home-hero__launchers">
          <button
            id="btn-open-menu-trainer"
            type="button"
            className="mode-launcher"
            onClick={() => {
              soundEffects.playTileTap();
              onOpenMenuTrainer();
            }}
          >
            <span
              className="mode-launcher__badge"
              style={{ background: '#EFF6FF' }}
            >
              <PokeBallIcon size={28} color="#2C98F0" />
            </span>
            <span>
              <span className="mode-launcher__title">Switch Menu Trainer</span>
              <span className="mode-launcher__sub">
                Pause, Battle, Medicine &amp; Attacks (4 Decks)
              </span>
            </span>
          </button>

          <button
            id="btn-open-blending-dojo"
            type="button"
            className="mode-launcher mode-launcher--dojo"
            onClick={() => {
              soundEffects.playTileTap();
              onOpenBlendingDojo();
            }}
          >
            <span
              className="mode-launcher__badge"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              <PokeBallIcon size={28} color="#1D8F52" />
            </span>
            <span>
              <span className="mode-launcher__title">Eevee&apos;s Blending Dojo</span>
              <span className="mode-launcher__sub">
                Single-Sound Word Chains (6 Ladders)
              </span>
            </span>
          </button>
        </div>
      </section>

      {/* 6 Pure-White Floating Switch Destination Zone Cards */}
      <section aria-label="Six Kanto spelling zones">
        <div className="zone-grid">
          {ZONES.map((zone) => {
            const unlocked = isZoneUnlocked(zone.id, progress);
            const completed = progress.completedZones.includes(zone.id);
            const words = getWordsByZone(zone.id);
            const practicedCount = words.filter(
              (w) => (progress.wordMastery[w.id]?.attempts ?? 0) > 0,
            ).length;
            const masteredCount = words.filter(
              (w) => progress.wordMastery[w.id]?.status === 'mastered',
            ).length;
            const starsShown = completed
              ? masteredCount >= Math.ceil(words.length / 2)
                ? 3
                : 2
              : practicedCount > 0
                ? 1
                : 0;

            return (
              <button
                key={zone.id}
                id={`zone-card-${zone.id}`}
                type="button"
                disabled={!unlocked}
                className="zone-card"
                onClick={() => {
                  soundEffects.playTileTap();
                  onSelectZone(zone.id);
                }}
                aria-label={`Zone ${zone.id}: ${zone.name} — ${zone.subtitle}${
                  unlocked ? '' : ' (Locked — complete previous zone or unlock in Grown-Up Settings)'
                }`}
              >
                <div
                  className="zone-card__bar"
                  style={{ background: unlocked ? zone.accentColor : '#CBD5E1' }}
                />

                <div className="zone-card__body">
                  <div className="zone-card__top">
                    <span className="zone-card__tag">Zone {zone.id}</span>
                    {unlocked ? (
                      <span
                        style={{ display: 'inline-flex', gap: '2px' }}
                        aria-label={`${starsShown} of 3 stars`}
                      >
                        {[0, 1, 2].map((i) => (
                          <StarIcon key={i} size={16} filled={i < starsShown} />
                        ))}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: 'var(--ink-muted)',
                        }}
                      >
                        <LockIcon size={14} />
                        Locked
                      </span>
                    )}
                  </div>

                  <h2 className="zone-card__title">{zone.name}</h2>
                  <p className="zone-card__sub">{zone.subtitle}</p>

                  <div className="zone-card__footer">
                    <span className="zone-card__mastery">
                      {practicedCount}/{words.length} words
                    </span>
                    <PokemonSprite
                      pokemonId={zone.featuredPokemonId}
                      name={zone.featuredPokemonName}
                      size={74}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
};
