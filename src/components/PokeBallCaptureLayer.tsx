import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PokeBallIcon, SparkleIcon, StarIcon } from './SwitchIcons';

export type CaptureBeat = 'arc' | 'impact' | 'drop' | 'wobble' | 'caught';

export interface PokeBallCaptureLayerProps {
  arenaRef: React.RefObject<HTMLElement | null>;
  eeveeRef: React.RefObject<HTMLElement | null>;
  targetRef: React.RefObject<HTMLElement | null>;
  targetName: string;
  onHitTarget?: () => void;
}

interface TrajectoryCoords {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  groundY: number;
}

/**
 * True target-locked 5-beat Poké Ball capture animation!
 * Dynamically measures Eevee's and the wild Pokémon's exact bounding rects
 * inside the arena so the Poké Ball ALWAYS arcs dead-center onto the target,
 * opens a red-gold capture ring, pulls the Pokémon inside, drops onto its
 * ground shadow, wobbles 3 times, and bursts with golden catch stars.
 */
export const PokeBallCaptureLayer: React.FC<PokeBallCaptureLayerProps> = ({
  arenaRef,
  eeveeRef,
  targetRef,
  targetName,
  onHitTarget,
}) => {
  const [coords, setCoords] = useState<TrajectoryCoords>({
    startX: 170,
    startY: 160,
    targetX: 740,
    targetY: 145,
    groundY: 205,
  });
  const [beat, setBeat] = useState<CaptureBeat>('arc');
  const [ballPos, setBallPos] = useState<{ x: number; y: number; rot: number; scale: number }>({
    x: 170,
    y: 160,
    rot: 0,
    scale: 0.9,
  });
  const hitFiredRef = useRef(false);
  const onHitRef = useRef(onHitTarget);
  onHitRef.current = onHitTarget;

  useLayoutEffect(() => {
    const arenaEl = arenaRef.current;
    const eeveeEl = eeveeRef.current;
    const targetEl = targetRef.current;

    if (!arenaEl || !eeveeEl || !targetEl) return;

    const aRect = arenaEl.getBoundingClientRect();
    const eRect = eeveeEl.getBoundingClientRect();
    const tRect = targetEl.getBoundingClientRect();

    if (aRect.width < 40 || tRect.width < 20) return;

    const measured: TrajectoryCoords = {
      startX: eRect.left - aRect.left + eRect.width * 0.65,
      startY: eRect.top - aRect.top + eRect.height * 0.36,
      targetX: tRect.left - aRect.left + tRect.width * 0.5,
      targetY: tRect.top - aRect.top + tRect.height * 0.44,
      groundY: tRect.bottom - aRect.top - 28,
    };

    setCoords(measured);
    setBallPos({
      x: measured.startX,
      y: measured.startY,
      rot: 0,
      scale: 0.92,
    });
  }, [arenaRef, eeveeRef, targetRef]);

  useEffect(() => {
    hitFiredRef.current = false;
    setBeat('arc');

    const startTime = performance.now();
    let rafId = 0;

    const peakX = (coords.startX + coords.targetX) * 0.52;
    const peakY = Math.min(coords.startY, coords.targetY) - 115;

    const tick = (now: number) => {
      const elapsed = now - startTime;

      if (elapsed < 440) {
        // Beat 1: Parabolic arc straight into target center
        const t = elapsed / 440;
        const ease = 1 - Math.pow(1 - t, 1.45);
        const inv = 1 - ease;
        const x =
          inv * inv * coords.startX +
          2 * inv * ease * peakX +
          ease * ease * coords.targetX;
        const y =
          inv * inv * coords.startY +
          2 * inv * ease * peakY +
          ease * ease * coords.targetY;
        const scale = 0.88 + Math.sin(ease * Math.PI) * 0.24;
        setBallPos({ x, y, rot: ease * 540, scale });
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (!hitFiredRef.current) {
        hitFiredRef.current = true;
        onHitRef.current?.();
      }

      if (elapsed < 760) {
        // Beat 2: Impact & glowing red-gold capture ring centered on target
        setBeat('impact');
        const t = (elapsed - 440) / 320;
        const recoilY = coords.targetY - Math.sin(t * Math.PI) * 26;
        setBallPos({
          x: coords.targetX,
          y: recoilY,
          rot: 540 + t * 180,
          scale: 1.08 - t * 0.06,
        });
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (elapsed < 1020) {
        // Beat 3: Drop & bounce onto target ground shadow
        setBeat('drop');
        const t = (elapsed - 760) / 260;
        const bounce = t < 0.72 ? (t / 0.72) * (t / 0.72) : 1 - Math.sin(((t - 0.72) / 0.28) * Math.PI) * 0.16;
        const y = coords.targetY + (coords.groundY - coords.targetY) * bounce;
        setBallPos({ x: coords.targetX, y, rot: 720, scale: 1 });
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (elapsed < 1620) {
        // Beat 4: 3 suspenseful left-right wobbles on the ground
        setBeat('wobble');
        const t = (elapsed - 1020) / 600;
        const wobbleAngle = Math.sin(t * Math.PI * 6) * (22 * (1 - t * 0.35));
        setBallPos({ x: coords.targetX, y: coords.groundY, rot: wobbleAngle, scale: 1 });
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      // Beat 5: Caught! Click & golden star burst
      setBeat('caught');
      setBallPos({ x: coords.targetX, y: coords.groundY, rot: 0, scale: 1.05 });
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [coords]);

  return (
    <div
      className="capture-vfx-layer"
      role="status"
      aria-label={`Catching ${targetName}`}
      data-testid="pokeball-capture-layer"
      data-beat={beat}
    >
      {/* Red-gold Let's Go capture ring right on top of the Pokémon during impact */}
      {beat === 'impact' && (
        <div
          className="capture-ring-burst"
          style={{ left: `${coords.targetX}px`, top: `${coords.targetY}px` }}
          data-testid="capture-impact-ring"
        >
          <div className="capture-ring-outer" />
          <div className="capture-ring-flash" />
          <span className="capture-spark capture-spark--1">
            <SparkleIcon size={24} color="#FDE047" />
          </span>
          <span className="capture-spark capture-spark--2">
            <SparkleIcon size={20} color="#F97316" />
          </span>
          <span className="capture-spark capture-spark--3">
            <SparkleIcon size={22} color="#38BDF8" />
          </span>
        </div>
      )}

      {/* Ground shadow under settled Poké Ball */}
      {(beat === 'drop' || beat === 'wobble' || beat === 'caught') && (
        <div
          className="capture-ball-shadow"
          style={{ left: `${coords.targetX}px`, top: `${coords.groundY + 24}px` }}
        />
      )}

      {/* Target-locked Poké Ball */}
      <div
        className={`capture-pokeball ${beat === 'caught' ? 'capture-pokeball--caught' : ''}`}
        style={{
          left: `${ballPos.x}px`,
          top: `${ballPos.y}px`,
          transform: `translate(-50%, -50%) rotate(${ballPos.rot}deg) scale(${ballPos.scale})`,
        }}
        data-testid="capture-pokeball"
      >
        <PokeBallIcon size={58} color="#E64545" />
      </div>

      {/* Beat 5: Golden star burst directly above the captured Poké Ball */}
      {beat === 'caught' && (
        <div
          className="capture-stars-burst"
          style={{ left: `${coords.targetX}px`, top: `${coords.groundY - 46}px` }}
          data-testid="capture-stars-burst"
        >
          <span className="capture-star capture-star--left">
            <StarIcon size={28} filled />
          </span>
          <span className="capture-star capture-star--mid">
            <StarIcon size={36} filled />
          </span>
          <span className="capture-star capture-star--right">
            <StarIcon size={28} filled />
          </span>
        </div>
      )}

      {beat === 'caught' && (
        <div
          className="vfx-callout-pill vfx-callout-pill--catch"
          style={{ left: `${coords.targetX}px`, top: `${Math.max(12, coords.targetY - 102)}px`, transform: 'translateX(-50%)' }}
        >
          Gotcha!
        </div>
      )}
    </div>
  );
};
