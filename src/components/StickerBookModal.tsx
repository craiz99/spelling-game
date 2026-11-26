import React, { useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import { CURRICULUM_WORDS } from '../data/curriculum';
import { KANTO_BADGES } from '../data/rewards';
import type { PlayerProgress } from '../data/types';
import { PokemonSprite } from './PokemonSprite';
import { BadgeGlyph, SpeakerIcon, StarIcon } from './SwitchIcons';

interface StickerBookModalProps {
  progress: PlayerProgress;
  onClose: () => void;
}

const POKEMON_NAMES: Record<number, string> = {
  1: 'Bulbasaur',
  4: 'Charmander',
  7: 'Squirtle',
  10: 'Caterpie',
  12: 'Butterfree',
  16: 'Pidgey',
  19: 'Rattata',
  25: 'Pikachu',
  27: 'Sandshrew',
  35: 'Clefairy',
  37: 'Vulpix',
  39: 'Jigglypuff',
  43: 'Oddish',
  52: 'Meowth',
  54: 'Psyduck',
  58: 'Growlithe',
  60: 'Poliwag',
  66: 'Machop',
  69: 'Bellsprout',
  74: 'Geodude',
  77: 'Ponyta',
  79: 'Slowpoke',
  86: 'Seel',
  89: 'Muk',
  100: 'Voltorb',
  113: 'Chansey',
  120: 'Staryu',
  129: 'Magikarp',
  131: 'Lapras',
  133: 'Eevee',
  134: 'Vaporeon',
  135: 'Jolteon',
  136: 'Flareon',
  143: 'Snorlax',
  151: 'Mew',
};

export const StickerBookModal: React.FC<StickerBookModalProps> = ({
  progress,
  onClose,
}) => {
  const [tab, setTab] = useState<'badges' | 'pokemon' | 'words'>('badges');

  const practicedWords = CURRICULUM_WORDS.filter(
    (w) => (progress.wordMastery[w.id]?.attempts ?? 0) > 0,
  );

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Trainer Sticker Book"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">Trainer Sticker Book</h2>
          <button
            id="btn-close-sticker-book"
            type="button"
            className="switch-pill-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="segmented-control" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'badges'}
            className={`seg-btn ${tab === 'badges' ? 'seg-btn--active' : ''}`}
            onClick={() => setTab('badges')}
          >
            Badges ({progress.earnedBadges.length}/{KANTO_BADGES.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'pokemon'}
            className={`seg-btn ${tab === 'pokemon' ? 'seg-btn--active' : ''}`}
            onClick={() => setTab('pokemon')}
          >
            Caught Pokémon ({progress.caughtPokemonIds.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'words'}
            className={`seg-btn ${tab === 'words' ? 'seg-btn--active' : ''}`}
            onClick={() => setTab('words')}
          >
            Words Practiced ({practicedWords.length})
          </button>
        </div>

        {tab === 'badges' && (
          <div className="badge-grid">
            {KANTO_BADGES.map((badge) => {
              const earned = progress.earnedBadges.includes(badge.id);
              return (
                <div key={badge.id} className="badge-card">
                  <div
                    className={`badge-medal ${earned ? '' : 'badge-medal--locked'}`}
                    style={{ background: badge.gradient }}
                  >
                    <BadgeGlyph type={badge.iconType} size={28} />
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '0.88rem' }}>
                    {badge.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--ink-secondary)', fontWeight: 700 }}>
                    {earned ? badge.subtitle : badge.description}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'pokemon' && (
          <div className="pokemon-book-grid">
            {progress.caughtPokemonIds.map((id) => {
              const name = POKEMON_NAMES[id] ?? `Pokémon #${id}`;
              return (
                <button
                  key={id}
                  type="button"
                  className="pokemon-book-card"
                  onClick={() => {
                    soundEffects.playTileTap();
                    void speechEngine.speak(name);
                  }}
                >
                  <PokemonSprite pokemonId={id} name={name} size={76} />
                  <span>{name}</span>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'words' && (
          <div>
            {practicedWords.length === 0 ? (
              <p style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                Play a Kanto town stage to start filling your word collection!
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '10px',
                }}
              >
                {practicedWords.map((w) => {
                  const rec = progress.wordMastery[w.id];
                  const mastered = rec?.status === 'mastered';
                  return (
                    <button
                      key={w.id}
                      type="button"
                      className="pokemon-book-card"
                      style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '12px 14px' }}
                      onClick={() => {
                        soundEffects.playTileTap();
                        void speechEngine.speak(`${w.displayWord.toLowerCase()}. ${w.everydaySentence}`);
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <StarIcon size={15} filled={mastered} />
                        <span>{w.displayWord}</span>
                      </span>
                      <SpeakerIcon size={16} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
