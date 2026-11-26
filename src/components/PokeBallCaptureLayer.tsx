import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SparkleIcon, StarIcon } from './SwitchIcons';

export type CaptureBeat = 'arc' | 'impact' | 'drop' | 'wobble' | 'caught';

export interface PokeBallCaptureLayerProps {
  arenaRef: React.RefObject<HTMLElement | null>;
  eeveeRef: React.RefObject<HTMLElement | null>;
  targetRef: React.RefObject<HTMLElement | null>;
  targetName: string;
  onHitTarget?: () => void;
  onCaughtLock?: () => void;
}

interface TrajectoryCoords {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  groundY: number;
  nameplateTop: number;
}

/**
 * Detailed Switch-style Poké Ball with live center-button indicator states:
 * - 'idle': glossy white center button
 * - 'wiggle-pulse': warm red pulsing button while rocking on each of the 3 wiggles
 * - 'caught-light': bright glowing cyan-emerald capture lock-in light on the front!
 */
const AnimatedCaptureBall: React.FC<{
  buttonState: 'idle' | 'wiggle-pulse' | 'caught-light';
  size?: number;
}> = ({ buttonState, size = 62 }) => {
  const isPulse = buttonState === 'wiggle-pulse';
  const isCaught = buttonState === 'caught-light';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      {/* Top red hemisphere */}
      <circle cx="32" cy="32" r="28" fill="#E64545" stroke="#1E2B3C" strokeWidth="3.2" />
      {/* Glossy top highlight */}
      <ellipse cx="23" cy="18" rx="8" ry="4.5" transform="rotate(-24 23 18)" fill="#FFFFFF" opacity="0.45" />
      {/* Bottom white hemisphere */}
      <path d="M4.2 32 A27.8 27.8 0 0 0 59.8 32 Z" fill="#F8FAFC" />
      {/* Center dark band */}
      <line x1="4" y1="32" x2="60" y2="32" stroke="#1E2B3C" strokeWidth="4.6" />
      {/* Center button outer housing */}
      <circle cx="32" cy="32" r="10.2" fill="#FFFFFF" stroke="#1E2B3C" strokeWidth="3.4" />
      {/* Front center button indicator light! */}
      <circle
        cx="32"
        cy="32"
        r={isCaught ? '6.2' : '5.2'}
        fill={isCaught ? '#34D399' : isPulse ? '#F43F5E' : '#E2E8F0'}
        stroke={isCaught ? '#A7F3D0' : '#475569'}
        strokeWidth={isCaught ? '1.8' : '1.2'}
      />
      {isCaught && (
        <>
          <circle cx="32" cy="32" r="3" fill="#FFFFFF" opacity="0.95" />
          <circle cx="32" cy="32" r="15" stroke="#6EE7B7" strokeWidth="2.4" opacity="0.85" />
        </>
      )}
    </svg>
  );
};

/**
 * Authentic Pokémon: Let's Go, Eevee! 5-beat target-locked Poké Ball capture physics:
 * 1. Arc (0–420ms): Parabolic throw dead-center onto the wild Pokémon
 * 2. Impact (420–720ms): Red-gold capture ring flashes while Pokémon shrinks inside
 * 3. Drop (720–980ms): Ball drops & bounces onto the target's ground shadow
 * 4. 3 Distinct Wiggles (980–2480ms): 3 crisp wiggles (500ms each: 260ms rock + 240ms pause)
 *    with pulsing red center button
 * 5. Front Capture Light Lock-In (2480ms+): Bright glowing green/white light on the front
 *    center button + click fanfare + 3 golden stars bursting above!
 */
export const PokeBallCaptureLayer: React.FC<PokeBallCaptureLayerProps> = ({
  arenaRef,
  eeveeRef,
  targetRef,
  targetName,
  onHitTarget,
  onCaughtLock,
}) => {
  const [coords, setCoords] = useState<TrajectoryCoords>({
    startX: 170,
    startY: 160,
    targetX: 740,
    targetY: 165,
    groundY: 220,
    nameplateTop: 80,
  });
  const [beat, setBeat] = useState<CaptureBeat>('arc');
  const [wiggleNum, setWiggleNum] = useState(0);
  const [isRocking, setIsRocking] = useState(false);
  const [ballPos, setBallPos] = useState<{ x: number; y: number; rot: number; scale: number }>({
    x: 170,
    y: 160,
    rot: 0,
    scale: 0.9,
  });

  const hitFiredRef = useRef(false);
  const lockFiredRef = useRef(false);
  const onHitRef = useRef(onHitTarget);
  const onLockRef = useRef(onCaughtLock);
  onHitRef.current = onHitTarget;
  onLockRef.current = onCaughtLock;

  useLayoutEffect(() => {
    const arenaEl = arenaRef.current;
    const eeveeEl = eeveeRef.current;
    const targetEl = targetRef.current;

    if (!arenaEl || !eeveeEl || !targetEl) return;

    const aRect = arenaEl.getBoundingClientRect();
    const eRect = eeveeEl.getBoundingClientRect();
    const tRect = targetEl.getBoundingClientRect();
    // Measure the actual Pokémon sprite box (below the nameplate) so the Poké Ball
    // arcs directly into the sprite and settles on the ground without ever touching the nameplate!
    const spriteEl = targetEl.querySelector('.scene-target-visual');
    const sRect = spriteEl ? spriteEl.getBoundingClientRect() : tRect;

    if (aRect.width < 40 || sRect.width < 20) return;

    const measured: TrajectoryCoords = {
      startX: eRect.left - aRect.left + eRect.width * 0.65,
      startY: eRect.top - aRect.top + eRect.height * 0.48,
      targetX: sRect.left - aRect.left + sRect.width * 0.5,
      targetY: sRect.top - aRect.top + sRect.height * 0.5,
      groundY: sRect.bottom - aRect.top - 22,
      nameplateTop: tRect.top - aRect.top,
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
    lockFiredRef.current = false;
    setBeat('arc');
    setWiggleNum(0);
    setIsRocking(false);

    const startTime = performance.now();
    let rafId = 0;

    const peakX = (coords.startX + coords.targetX) * 0.52;
    const peakY = Math.min(coords.startY, coords.targetY) - 115;

    const tick = (now: number) => {
      const elapsed = now - startTime;

      if (elapsed < 420) {
        // Beat 1: Parabolic arc straight into target center
        const t = elapsed / 420;
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

      if (elapsed < 720) {
        // Beat 2: Impact & glowing red-gold capture ring centered on target
        setBeat('impact');
        const t = (elapsed - 420) / 300;
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

      if (elapsed < 980) {
        // Beat 3: Drop & bounce onto target ground shadow
        setBeat('drop');
        const t = (elapsed - 720) / 260;
        const bounce =
          t < 0.72
            ? (t / 0.72) * (t / 0.72)
            : 1 - Math.sin(((t - 0.72) / 0.28) * Math.PI) * 0.16;
        const y = coords.targetY + (coords.groundY - coords.targetY) * bounce;
        setBallPos({ x: coords.targetX, y, rot: 0, scale: 1 });
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (elapsed < 2480) {
        // Beat 4: 3 distinct Pokémon-style wiggles (500ms each: 260ms rock + 240ms suspenseful pause)
        setBeat('wobble');
        const wobbleElapsed = elapsed - 980;
        const currentWiggle = Math.min(3, Math.floor(wobbleElapsed / 500) + 1);
        const phaseInWiggle = wobbleElapsed % 500;
        setWiggleNum(currentWiggle);

        if (phaseInWiggle < 260) {
          // Crisp rock left -> right -> center
          const rt = phaseInWiggle / 260;
          const angle = Math.sin(rt * Math.PI * 2) * (currentWiggle === 3 ? 20 : 24);
          const shiftX = Math.sin(rt * Math.PI * 2) * 5;
          setIsRocking(true);
          setBallPos({ x: coords.targetX + shiftX, y: coords.groundY, rot: angle, scale: 1 });
        } else {
          // Suspenseful still pause between wiggles
          setIsRocking(false);
          setBallPos({ x: coords.targetX, y: coords.groundY, rot: 0, scale: 1 });
        }

        rafId = window.requestAnimationFrame(tick);
        return;
      }

      // Beat 5 (2480ms+): Caught! Front center button lights up bright green-white + golden stars!
      if (!lockFiredRef.current) {
        lockFiredRef.current = true;
        onLockRef.current?.();
      }
      setBeat('caught');
      setIsRocking(false);
      setWiggleNum(3);
      setBallPos({ x: coords.targetX, y: coords.groundY, rot: 0, scale: 1.06 });
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [coords]);

  const buttonState =
    beat === 'caught' ? 'caught-light' : beat === 'wobble' && isRocking ? 'wiggle-pulse' : 'idle';

  return (
    <div
      className="capture-vfx-layer"
      role="status"
      aria-label={`Catching ${targetName}`}
      data-testid="pokeball-capture-layer"
      data-beat={beat}
      data-wiggle={wiggleNum}
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
          style={{ left: `${coords.targetX}px`, top: `${coords.groundY + 26}px` }}
        />
      )}

      {/* Radiant front capture-lock glow behind the Poké Ball after the 3rd wiggle */}
      {beat === 'caught' && (
        <div
          className="capture-front-light-aura"
          style={{ left: `${coords.targetX}px`, top: `${coords.groundY}px` }}
          data-testid="capture-front-light"
        />
      )}

      {/* Target-locked Poké Ball with live center-button indicator */}
      <div
        className={`capture-pokeball ${beat === 'caught' ? 'capture-pokeball--caught' : ''}`}
        style={{
          left: `${ballPos.x}px`,
          top: `${ballPos.y}px`,
          transform: `translate(-50%, -50%) rotate(${ballPos.rot}deg) scale(${ballPos.scale})`,
        }}
        data-testid="capture-pokeball"
      >
        <AnimatedCaptureBall buttonState={buttonState} size={62} />
      </div>

      {/* Beat 5: Golden star burst directly above the locked Poké Ball */}
      {beat === 'caught' && (
        <div
          className="capture-stars-burst"
          style={{ left: `${coords.targetX}px`, top: `${coords.groundY - 50}px` }}
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
          style={{
            left: `${coords.targetX}px`,
            top: `${Math.max(8, coords.nameplateTop - 66)}px`,
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          Gotcha! {targetName}!
        </div>
      )}
    </div>
  );
};
