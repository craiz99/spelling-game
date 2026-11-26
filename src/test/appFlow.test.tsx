import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';

describe("End-to-End UI Flows — Let's Go, Spell with Eevee! V6", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('dismisses the welcome overlay and displays the cohesive 9-node Kanto Map with Saffron City (no standalone Safari or Menu Camp)', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /let's go!/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /let's go!/i }));

    expect(screen.getByTestId('map-eevee-walker')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pallet Town' })).toBeInTheDocument();
    expect(document.getElementById('hud-pokedex-btn')).toBeInTheDocument();
    expect(document.getElementById('map-node-saffron')).toBeInTheDocument();
    expect(document.getElementById('btn-open-letter-lab')).toBeNull();
    expect(document.getElementById('btn-open-menu-trainer')).toBeNull();
  });

  it('enters Pallet Town with Picture + First Letter pre-filled + nameplate above Pokémon, spells, and reaches Paw-Slide Blending', () => {
    render(<App skipWelcome />);
    fireEvent.click(document.getElementById('btn-arrival-launch')!);

    expect(screen.getByText('Pallet Town')).toBeInTheDocument();
    expect(screen.getByTestId('word-picture-card')).toBeInTheDocument();
    expect(screen.getByTestId('target-pokemon-nameplate')).toBeInTheDocument();
    expect(document.getElementById('elkonin-box-0')).toHaveClass('elkonin-box--filled');

    fireEvent.click(document.getElementById('btn-eevee-help')!);

    expect(screen.getByTestId('paw-slide-blender')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /slide & blend together/i }),
    ).toBeInTheDocument();
  });

  it('walks to Saffron City and launches into the reused BattleScreen with Saffron City title and visible Pokémon nameplate', () => {
    vi.useFakeTimers();
    render(<App skipWelcome />);
    fireEvent.click(document.getElementById('map-node-saffron')!);
    expect(screen.getByRole('heading', { name: 'Saffron City' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    fireEvent.click(document.getElementById('btn-arrival-launch')!);

    expect(screen.getByText('Saffron City')).toBeInTheDocument();
    expect(screen.getByTestId('target-pokemon-nameplate')).toBeInTheDocument();
  });

  it('opens My Captured Pokémon Pokédex + A–Z Letters tab, Eevee Closet, and Grown-Up Settings', () => {
    render(<App skipWelcome />);

    fireEvent.click(document.getElementById('hud-pokedex-btn')!);
    expect(screen.getByText('My Captured Pokémon')).toBeInTheDocument();
    expect(screen.getByTestId('pokedex-grid')).toBeInTheDocument();

    // Integrated A–Z Alphabet Progress tab right inside Sticker Book!
    fireEvent.click(document.getElementById('tab-az-letters')!);
    expect(screen.getByTestId('sticker-az-grid')).toBeInTheDocument();
    expect(document.getElementById('book-letter-A')).toBeInTheDocument();
    expect(document.getElementById('book-letter-Z')).toBeInTheDocument();
    fireEvent.click(document.getElementById('btn-close-sticker-book')!);

    fireEvent.click(document.getElementById('hud-closet-btn')!);
    expect(screen.getByText("Eevee's Closet & Partner Moves")).toBeInTheDocument();
    fireEvent.click(document.getElementById('btn-close-closet')!);

    expect(document.getElementById('zone-card-6')).toHaveClass('map-node--locked');

    const gearBtn = document.getElementById('hud-settings-gear-btn')!;
    fireEvent.keyDown(gearBtn, { key: 'Enter' });
    expect(screen.getByText('Grown-Up Settings & Progress')).toBeInTheDocument();
    expect(screen.getByText('Letter Tile Style')).toBeInTheDocument();
    expect(screen.getByTestId('audio-diagnostics')).toBeInTheDocument();

    fireEvent.click(document.getElementById('toggle-unlock-all-zones')!);
    fireEvent.click(document.getElementById('btn-close-settings')!);

    expect(document.getElementById('zone-card-6')).not.toHaveClass('map-node--locked');
  });
});
