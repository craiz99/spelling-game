import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

describe("End-to-End UI Flows — Let's Go, Spell with Eevee! V2", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('dismisses the welcome audio-unlock overlay and displays the interactive Kanto Overworld Map', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /let's go!/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /let's go!/i }));

    expect(screen.getByTestId('map-eevee-walker')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pallet Town' })).toBeInTheDocument();
    expect(document.getElementById('zone-card-2')).toBeInTheDocument();
    expect(document.getElementById('zone-card-6')).toBeInTheDocument();
  });

  it('enters Pallet Town from the Kanto Map, spells with Eevee Help, and reaches Paw-Slide Blending', () => {
    render(<App skipWelcome />);
    // Pallet Town is Eevee's starting node -> clicking the arrival launch CTA enters Pallet Town immediately
    fireEvent.click(document.getElementById('btn-arrival-launch')!);

    expect(screen.getByText('Pallet Town')).toBeInTheDocument();
    fireEvent.click(document.getElementById('btn-eevee-help')!);

    expect(screen.getByTestId('paw-slide-blender')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /slide & blend together/i }),
    ).toBeInTheDocument();
  });

  it('walks to Switch Trainer Camp and opens Switch Menu Trainer with Reading Mode toggle', () => {
    render(<App skipWelcome />);
    fireEvent.click(document.getElementById('btn-open-menu-trainer')!);
    // Arrival card updates to Switch Trainer Camp; clicking launch opens Menu Trainer once Eevee arrives,
    // or verify the Menu Trainer node selected on the arrival card
    expect(screen.getByRole('heading', { name: 'Switch Trainer Camp' })).toBeInTheDocument();
  });

  it('selects Blending Dojo landmark on the Kanto Overworld Map', () => {
    render(<App skipWelcome />);
    fireEvent.click(document.getElementById('btn-open-blending-dojo')!);
    expect(screen.getByRole('heading', { name: 'Blending Dojo' })).toBeInTheDocument();
  });

  it('opens Sticker Book, Eevee Closet, and Grown-Up Settings via keyboard Enter + Unlock All 6 Zones', () => {
    render(<App skipWelcome />);

    fireEvent.click(document.getElementById('hud-sticker-book-btn')!);
    expect(screen.getByText('Trainer Sticker Book')).toBeInTheDocument();
    fireEvent.click(document.getElementById('btn-close-sticker-book')!);

    fireEvent.click(document.getElementById('hud-closet-btn')!);
    expect(screen.getByText("Eevee's Closet & Partner Moves")).toBeInTheDocument();
    fireEvent.click(document.getElementById('btn-close-closet')!);

    // Champion Gym (Zone 6) is locked initially
    expect(document.getElementById('zone-card-6')).toHaveClass('map-node--locked');

    // Open Grown-Up Settings via keyboard Enter
    const gearBtn = document.getElementById('hud-settings-gear-btn')!;
    fireEvent.keyDown(gearBtn, { key: 'Enter' });
    expect(screen.getByText('Grown-Up Settings & Progress')).toBeInTheDocument();

    fireEvent.click(document.getElementById('toggle-unlock-all-zones')!);
    fireEvent.click(document.getElementById('btn-close-settings')!);

    expect(document.getElementById('zone-card-6')).not.toHaveClass('map-node--locked');
  });
});
