import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';

describe("End-to-End UI Flows — Let's Go, Spell with Eevee! V4", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('dismisses the welcome overlay and displays the interactive Kanto Regional Map with clickable Pokédex HUD', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /let's go!/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /let's go!/i }));

    expect(screen.getByTestId('map-eevee-walker')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pallet Town' })).toBeInTheDocument();
    expect(document.getElementById('hud-pokedex-btn')).toBeInTheDocument();
    expect(document.getElementById('btn-open-letter-lab')).toBeInTheDocument();
  });

  it('enters Pallet Town with Picture + First Letter pre-filled + visible Pokémon nameplate, spells, and reaches Paw-Slide Blending', () => {
    render(<App skipWelcome />);
    fireEvent.click(document.getElementById('btn-arrival-launch')!);

    expect(screen.getByText('Pallet Town')).toBeInTheDocument();
    expect(screen.getByTestId('word-picture-card')).toBeInTheDocument();
    expect(screen.getByTestId('target-pokemon-nameplate')).toBeInTheDocument();
    // First letter (box 0) is ALWAYS pre-filled in Starter mode!
    expect(document.getElementById('elkonin-box-0')).toHaveClass('elkonin-box--filled');

    fireEvent.click(document.getElementById('btn-eevee-help')!);

    expect(screen.getByTestId('paw-slide-blender')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /slide & blend together/i }),
    ).toBeInTheDocument();
  });

  it("walks to Oak's A–Z Safari and launches directly into active Wild Pokémon Letter Catching with A–Z ribbon", () => {
    vi.useFakeTimers();
    render(<App skipWelcome />);
    fireEvent.click(document.getElementById('btn-open-letter-lab')!);
    expect(screen.getByRole('heading', { name: "Oak's A–Z Safari" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(900);
    });
    fireEvent.click(document.getElementById('btn-arrival-launch')!);

    expect(screen.getByTestId('az-letter-grid')).toBeInTheDocument();
    expect(document.getElementById('az-tile-A')).toBeInTheDocument();
    expect(document.getElementById('az-tile-Z')).toBeInTheDocument();
    expect(screen.getByTestId('word-picture-card')).toBeInTheDocument();
  });

  it('opens My Captured Pokémon Pokédex from HUD pill, Eevee Closet, and Grown-Up Settings with Tile Mode + Unlock All', () => {
    render(<App skipWelcome />);

    fireEvent.click(document.getElementById('hud-pokedex-btn')!);
    expect(screen.getByText('My Captured Pokémon')).toBeInTheDocument();
    expect(screen.getByTestId('pokedex-grid')).toBeInTheDocument();
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
