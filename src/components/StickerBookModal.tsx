import React, { useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import { ALPHABET_LETTERS } from '../data/alphabet';
import { CURRICULUM_WORDS } from '../data/curriculum';
import { KANTO_POKEMON_CATALOG } from '../data/pokemonCatalog';
import { KANTO_BADGES } from '../data/rewards';
import type { PlayerProgress } from '../data/types';
import { PokemonSprite } from './PokemonSprite';
import { BadgeGlyph, PokeBallIcon, SpeakerIcon, StarIcon } from './SwitchIcons';

export type StickerBookTab = 'pokemon' | 'letters' | 'badges' | 'words';

interface StickerBookModalProps {
  progress: PlayerProgress;
  initialTab?: StickerBookTab;
  onClose: () => void;
}

export const StickerBookModal: React.FC<StickerBookModalProps> = ({
  progress,
  initialTab = 'pokemon',
  onClose,
}) => {
  const [tab, setTab] = useState<StickerBookTab>(initialTab);

  const caughtSet = new Set(progress.caughtPokemonIds);
  const masteredLettersSet = new Set(progress.masteredLetters);
  const practicedWords = CURRICULUM_WORDS.filter(
    (w) => (progress.wordMastery[w.id]?.attempts ?? 0) > 0,
  );

  // Order Pokédex: caught Pokémon first (sorted by Pokédex #), then uncaught silhouettes!
  const sortedPokedex = [...KANTO_POKEMON_CATALOG].sort((a, b) => {
    const aCaught = caughtSet.has(a.id) ? 0 : 1;
    const bCaught = caughtSet.has(b.id) ? 0 : 1;
    if (aCaught !== bCaught) return aCaught - bCaught;
    return a.id - b.id;
  });

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="My Pokémon Pokédex & Sticker Book"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {tab === 'pokemon'
                ? 'My Captured Pokémon'
                : tab === 'letters'
                  ? 'A–Z Alphabet Progress'
                  : 'Trainer Sticker Book'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
              Saved automatically in your browser · {progress.caughtPokemonIds.length} / {KANTO_POKEMON_CATALOG.length} Kanto Pokémon caught · {progress.masteredLetters.length} / 26 Letters
            </p>
          </div>
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
            id="tab-caught-pokemon"
            type="button"
            role="tab"
            aria-selected={tab === 'pokemon'}
            className={`seg-btn ${tab === 'pokemon' ? 'seg-btn--active' : ''}`}
            onClick={() => setTab('pokemon')}
          >
            Pokémon ({progress.caughtPokemonIds.length}/{KANTO_POKEMON_CATALOG.length})
          </button>
          <button
            id="tab-az-letters"
            type="button"
            role="tab"
            aria-selected={tab === 'letters'}
            className={`seg-btn ${tab === 'letters' ? 'seg-btn--active' : ''}`}
            onClick={() => setTab('letters')}
          >
            A–Z ({progress.masteredLetters.length}/26)
          </button>
          <button
            id="tab-badges"
            type="button"
            role="tab"
            aria-selected={tab === 'badges'}
            className={`seg-btn ${tab === 'badges' ? 'seg-btn--active' : ''}`}
            onClick={() => setTab('badges')}
          >
            Badges ({progress.earnedBadges.length}/{KANTO_BADGES.length})
          </button>
          <button
            id="tab-words"
            type="button"
            role="tab"
            aria-selected={tab === 'words'}
            className={`seg-btn ${tab === 'words' ? 'seg-btn--active' : ''}`}
            onClick={() => setTab('words')}
          >
            Words ({practicedWords.length})
          </button>
        </div>

        {tab === 'pokemon' && (
          <div className="pokemon-book-grid" data-testid="pokedex-grid">
            {sortedPokedex.map((poke) => {
              const isCaught = caughtSet.has(poke.id);
              const detail = progress.caughtPokemonDetails[poke.id];
              return (
                <button
                  key={poke.id}
                  type="button"
                  className={`pokemon-book-card ${
                    isCaught ? 'pokemon-book-card--caught' : 'pokemon-book-card--silhouette'
                  }`}
                  onClick={() => {
                    soundEffects.playTileTap();
                    if (isCaught) {
                      void speechEngine.speakPokemon(poke.name);
                    }
                  }}
                  aria-label={isCaught ? `${poke.name}, caught ${detail?.count ?? 1} times` : `Undiscovered Pokémon #${poke.id}`}
                >
                  <span className="pokedex-card__num">
                    #{String(poke.id).padStart(3, '0')}
                  </span>

                  {isCaught && detail && detail.count > 1 && (
                    <span className="pokedex-card__count">×{detail.count}</span>
                  )}

                  {isCaught && (
                    <span className="pokedex-card__ball" aria-hidden="true">
                      <PokeBallIcon size={15} color="#E64545" />
                    </span>
                  )}

                  <div className={isCaught ? '' : 'pokedex-silhouette-wrap'}>
                    <PokemonSprite pokemonId={poke.id} name={isCaught ? poke.name : 'Unknown Pokémon'} size={74} />
                  </div>

                  <span className="pokedex-card__name">
                    {isCaught ? poke.name : '???'}
                  </span>
                  {isCaught && detail?.lastTown && (
                    <span className="pokedex-card__town">{detail.lastTown}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {tab === 'letters' && (
          <div
            data-testid="sticker-az-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
              gap: '10px',
            }}
          >
            {ALPHABET_LETTERS.map((item) => {
              const mastered = masteredLettersSet.has(item.letter);
              return (
                <button
                  key={item.letter}
                  id={`book-letter-${item.letter}`}
                  type="button"
                  className={`pokemon-book-card ${
                    mastered ? 'pokemon-book-card--caught' : ''
                  }`}
                  style={{
                    padding: '10px 8px',
                    opacity: mastered ? 1 : 0.65,
                    gap: '4px',
                  }}
                  onClick={() => {
                    soundEffects.playTileTap();
                    void speechEngine.speakLetter(item.letter, false, `${item.letter}, like ${item.keyword}!`);
                  }}
                  aria-label={`Letter ${item.letter}, ${item.keyword}${mastered ? ', mastered' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <StarIcon size={14} filled={mastered} />
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                      }}
                    >
                      {item.letter} {item.lower}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                    {item.keyword}
                  </span>
                </button>
              );
            })}
          </div>
        )}

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

        {tab === 'words' && (
          <div>
            {practicedWords.length === 0 ? (
              <p style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                Play any Kanto town to start filling your word collection!
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
                        void speechEngine.speakWord(w.displayWord);
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
