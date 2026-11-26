import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

describe('End-to-End UI Flows — Let\'s Go, Spell with Eevee!', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('dismisses the welcome audio-unlock overlay and displays all 6 Kanto zones', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /let's go!/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /let's go!/i }));

    expect(screen.getByText('Pallet Town')).toBeInTheDocument();
    expect(screen.getByText('Viridian Forest')).toBeInTheDocument();
    expect(screen.getByText('Pewter City')).toBeInTheDocument();
    expect(screen.getByText('Pokémon Center')).toBeInTheDocument();
    expect(screen.getByText('Cerulean Gym')).toBeInTheDocument();
    expect(screen.getByText("Eevee's Kanto Gym")).toBeInTheDocument();
  });

  it('plays a Zone 1 battle word using Eevee Help and reaches the Paw-Slide Blender', () => {
    render(<App skipWelcome />);
    fireEvent.click(document.getElementById('zone-card-1')!);

    expect(screen.getByText(/Zone 1 · Pallet Town/i)).toBeInTheDocument();
    // Starter mode has 1 missing box -> 1 click on Eevee Help completes spelling and enters Paw-Slide!
    fireEvent.click(document.getElementById('btn-eevee-help')!);

    expect(screen.getByTestId('paw-slide-blender')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /slide & blend together/i }),
    ).toBeInTheDocument();
  });

  it('opens Switch Menu Trainer, switches decks, toggles Reading Mode, and uses Eevee Help', () => {
    render(<App skipWelcome />);
    fireEvent.click(document.getElementById('btn-open-menu-trainer')!);

    expect(screen.getByText('Switch Menu Trainer')).toBeInTheDocument();

    const toggle = document.getElementById('btn-reading-mode-toggle')!;
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(document.getElementById('menu-deck-battle')!);
    expect(screen.getByText('FIGHT')).toBeInTheDocument();
    expect(screen.getByText('RUN')).toBeInTheDocument();

    fireEvent.click(document.getElementById('btn-menu-eevee-help')!);
    expect(screen.getByTestId('paw-slide-blender')).toBeInTheDocument();
  });

  it('opens Eevee\'s Blending Dojo and shows word chain progression', () => {
    render(<App skipWelcome />);
    fireEvent.click(document.getElementById('btn-open-blending-dojo')!);

    expect(screen.getByText("Eevee's Blending Dojo")).toBeInTheDocument();
    expect(screen.getByText('SUN → RUN → FUN → FAN')).toBeInTheDocument();
    expect(screen.getByTestId('paw-slide-blender')).toBeInTheDocument();
  });

  it('opens Sticker Book, Eevee Closet, and Grown-Up Settings via keyboard Enter + Unlock All 6 Zones', () => {
    render(<App skipWelcome />);

    // Sticker Book
    fireEvent.click(document.getElementById('hud-sticker-book-btn')!);
    expect(screen.getByText('Trainer Sticker Book')).toBeInTheDocument();
    fireEvent.click(document.getElementById('btn-close-sticker-book')!);

    // Eevee Closet
    fireEvent.click(document.getElementById('hud-closet-btn')!);
    expect(screen.getByText("Eevee's Closet & Partner Moves")).toBeInTheDocument();
    fireEvent.click(document.getElementById('btn-close-closet')!);

    // Zone 6 is locked initially
    expect(document.getElementById('zone-card-6')).toBeDisabled();

    // Grown-Up Settings opened via keyboard Enter on gear button
    const gearBtn = document.getElementById('hud-settings-gear-btn')!;
    fireEvent.keyDown(gearBtn, { key: 'Enter' });
    expect(screen.getByText('Grown-Up Settings & Progress')).toBeInTheDocument();

    // Enable Unlock All 6 Zones
    fireEvent.click(document.getElementById('toggle-unlock-all-zones')!);
    fireEvent.click(document.getElementById('btn-close-settings')!);

    expect(document.getElementById('zone-card-6')).not.toBeDisabled();
  });
});
