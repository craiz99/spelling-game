import React, { useState } from 'react';
import { PokeBallIcon } from './SwitchIcons';

export function getPokemonArtworkUrl(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
}

export function getItemSpriteUrl(itemSlug: string): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemSlug}.png`;
}

interface PokemonSpriteProps {
  pokemonId: number;
  name: string;
  size?: number;
  className?: string;
}

/**
 * Renders official Ken Sugimori Pokémon artwork from PokéAPI,
 * falling back gracefully to a crisp Switch Poké Ball SVG when offline.
 */
export const PokemonSprite: React.FC<PokemonSpriteProps> = ({
  pokemonId,
  name,
  size = 112,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`pokemon-sprite-wrap ${className}`}
      style={{ width: size, height: size }}
    >
      {failed ? (
        <PokeBallIcon size={Math.round(size * 0.72)} color="#E64545" />
      ) : (
        <img
          src={getPokemonArtworkUrl(pokemonId)}
          alt={name}
          className="pokemon-sprite-img"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
};

interface ItemSpriteProps {
  itemSlug?: string;
  label: string;
  accentColor: string;
  size?: number;
}

/**
 * Renders official PokéAPI item sprite with a crisp minimal Switch vector bottle fallback.
 */
export const ItemSprite: React.FC<ItemSpriteProps> = ({
  itemSlug,
  label,
  accentColor,
  size = 38,
}) => {
  const [failed, setFailed] = useState(false);

  if (!itemSlug || failed) {
    return (
      <svg
        width={size * 0.78}
        height={size * 0.78}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect x="7" y="6" width="10" height="14" rx="3.5" fill={accentColor} />
        <rect x="9" y="2.5" width="6" height="3.5" rx="1" fill="#475569" />
        <rect x="9.5" y="10" width="5" height="6" rx="1.5" fill="#FFFFFF" opacity="0.55" />
      </svg>
    );
  }

  return (
    <img
      src={getItemSpriteUrl(itemSlug)}
      alt={label}
      width={size}
      height={size}
      style={{ imageRendering: 'auto', objectFit: 'contain' }}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};
