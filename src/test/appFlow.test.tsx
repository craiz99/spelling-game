import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';

describe("End-to-End UI Flows — Let's Go, Spell with Eevee! V3", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('dismisses the welcome audio-unlock overlay and displays the interactive Kanto Regional Map', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /let's go!/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /let's go!/i }));

    expect(screen.getByTestId('map-eevee-walker')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pallet Town' })).toBeInTheDocument();
    expect(document.getElementById('btn-open-letter-lab')).toBeInTheDocument();
    expect(document.getElementById('zone-card-2')).toBeInTheDocument();
    expect(document.getElementById('zone-card-6')).toBeInTheDocument();
  });

  it('enters Pallet Town, shows painted Word Picture Card, spells with Eevee Help, and reaches Paw-Slide Blending', () => {
    render(<App skipWelcome />);
    fireEvent.click(document.getElementById('btn-arrival-launch')!);

    expect(screen.getByText('Pallet Town')).toBeInTheDocument();
    expect(screen.getByTestId('word-picture-card')).toBeInTheDocument();

    fireEvent.click(document.getElementById('btn-eevee-help')!);

    expect(screen.getByTestId('paw-slide-blender')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /slide & blend together/i }),
    ).toBeInTheDocument();
  });

  it("walks to Oak's A–Z Lab, opens all 26 letters A–Z, and switches to A–Z Catch mode", () => {
    vi.useFakeTimers();
    render(<App skipWelcome />);
    fireEvent.click(document.getElementById('btn-open-letter-lab')!);
    expect(screen.getByRole('heading', { name: "Oak's A–Z Lab" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(900);
    });
    fireEvent.click(document.getElementById('btn-arrival-launch')!);

    expect(screen.getByTestId('az-letter-grid')).toBeInTheDocument();
    expect(document.getElementById('az-tile-A')).toBeInTheDocument();
    expect(document.getElementById('az-tile-Z')).toBeInTheDocument();
    expect(screen.getByTestId('active-letter-glyph')).toHaveTextContent('A a');

    fireEvent.click(document.getElementById('az-tile-S')!);
    expect(screen.getByTestId('active-letter-glyph')).toHaveTextContent('S s');

    fireEvent.click(document.getElementById('btn-play-az-catch')!);
    expect(screen.getByTestId('word-picture-card')).toBeInTheDocument();
  });

  it('selects Menu Camp and Blending Dojo landmarks on the Kanto Regional Map', () => {
    render(<App skipWelcome />);
    fireEvent.click(document.getElementById('btn-open-menu-trainer')!);
    expect(screen.getByRole('heading', { name: 'Menu Camp' })).toBeInTheDocument();

    fireEvent.click(document.getElementById('btn-open-blending-dojo')!);
    expect(screen.getByRole('heading', { name: 'Blending Dojo' })).toBeInTheDocument();
  });

  it('opens Sticker Book, Eevee Closet, and Grown-Up Settings with Audio Diagnostics + Unlock All 6 Zones', () => {
    render(<App skipWelcome />);

    fireEvent.click(document.getElementById('hud-sticker-book-btn')!);
    expect(screen.getByText('Trainer Sticker Book')).toBeInTheDocument();
    fireEvent.click(document.getElementById('btn-close-sticker-book')!);

    fireEvent.click(document.getElementById('hud-closet-btn')!);
    expect(screen.getByText("Eevee's Closet & Partner Moves")).toBeInTheDocument();
    fireEvent.click(document.getElementById('btn-close-closet')!);

    expect(document.getElementById('zone-card-6')).toHaveClass('map-node--locked');

    const gearBtn = document.getElementById('hud-settings-gear-btn')!;
    fireEvent.keyDown(gearBtn, { key: 'Enter' });
    expect(screen.getByText('Grown-Up Settings & Progress')).toBeInTheDocument();
    expect(screen.getByTestId('audio-diagnostics')).toBeInTheDocument();

    fireEvent.click(document.getElementById('toggle-unlock-all-zones')!);
    fireEvent.click(document.getElementById('btn-close-settings')!);

    expect(document.getElementById('zone-card-6')).not.toHaveClass('map-node--locked');
  });
});
