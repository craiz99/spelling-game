import React, { useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { getWordPictureUrl } from '../data/wordPictures';
import { getItemSpriteUrl, getPokemonArtworkUrl } from './PokemonSprite';
import { SpeakerIcon } from './SwitchIcons';

export interface WordPictureCardProps {
  /** Painted picture slug in public/assets/words/{slug}.jpg */
  pictureSlug?: string | null;
  /** Optional fallback PokéAPI item slug (for Medicine Pocket items) */
  itemSlug?: string;
  /** Optional fallback Pokémon ID (for Pokémon name words) */
  pokemonId?: number;
  /** Accessible alt label (e.g. "sun", "apple") */
  label: string;
  /** Optional visible caption (hidden during spelling so child spells from picture + voice) */
  caption?: string;
  /** Card size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Hide the small corner speaker badge when an adjacent large speaker button is shown */
  hideSpeakerBadge?: boolean;
  /** Called when tapped to speak the word aloud */
  onTap?: () => void;
}

/**
 * Nintendo Switch-styled painted Word Picture Flashcard.
 * Shows a warm painted illustration for every word (or official PokéAPI art for
 * medicines/Pokémon names) with a subtle speaker badge so a 5-year-old can tap
 * the picture anytime to hear the word spoken clearly.
 */
export const WordPictureCard: React.FC<WordPictureCardProps> = ({
  pictureSlug,
  itemSlug,
  pokemonId,
  label,
  caption,
  size = 'md',
  hideSpeakerBadge = false,
  onTap,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const imgSrc =
    pictureSlug && !imgFailed
      ? getWordPictureUrl(pictureSlug)
      : itemSlug
        ? getItemSpriteUrl(itemSlug)
        : pokemonId
          ? getPokemonArtworkUrl(pokemonId)
          : null;

  const isSprite = !pictureSlug || imgFailed;

  return (
    <button
      type="button"
      className={`word-picture-card word-picture-card--${size}`}
      onClick={() => {
        soundEffects.playTileTap();
        onTap?.();
      }}
      aria-label={`Hear word: ${label}`}
      data-testid="word-picture-card"
    >
      {!hideSpeakerBadge && (
        <span className="word-picture-card__speaker" aria-hidden="true">
          <SpeakerIcon size={size === 'sm' ? 14 : 16} color="#2C98F0" />
        </span>
      )}

      <span className="word-picture-card__media">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={label}
            className={
              isSprite
                ? 'word-picture-card__img word-picture-card__img--sprite'
                : 'word-picture-card__img'
            }
            draggable={false}
            onError={() => {
              if (pictureSlug && !imgFailed) setImgFailed(true);
            }}
          />
        ) : (
          <span className="word-picture-card__fallback">{label.slice(0, 1)}</span>
        )}
      </span>

      {caption && <span className="word-picture-card__caption">{caption}</span>}
    </button>
  );
};
