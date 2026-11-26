import React, { useEffect, useRef, useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import { getWordsByZone } from '../data/curriculum';
import type { MapNodeId, PlayerProgress, ZoneId } from '../data/types';
import {
  computeRoutePath,
  getLandmarkById,
  getNextRecommendedNode,
  getSceneUrl,
  isLandmarkUnlocked,
  KANTO_LANDMARKS,
  OVERWORLD_ROADS,
  type MapLandmark,
} from '../engine/overworldEngine';
import { EeveeAvatar } from './EeveeAvatar';
import { PokemonSprite } from './PokemonSprite';
import { LockIcon, PokeBallIcon, SparkleIcon, StarIcon } from './SwitchIcons';

interface KantoOverworldMapProps {
  progress: PlayerProgress;
  onArriveNode: (nodeId: MapNodeId) => void;
  onEnterZone: (zoneId: ZoneId) => void;
  onOpenMenuTrainer: () => void;
  onOpenBlendingDojo: () => void;
}

export const KantoOverworldMap: React.FC<KantoOverworldMapProps> = ({
  progress,
  onArriveNode,
  onEnterZone,
  onOpenMenuTrainer,
  onOpenBlendingDojo,
}) => {
  const [eeveeNodeId, setEeveeNodeId] = useState<MapNodeId>(progress.currentMapNodeId);
  const [selectedNodeId, setSelectedNodeId] = useState<MapNodeId>(progress.currentMapNodeId);
  const [isWalking, setIsWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const walkTimersRef = useRef<number[]>([]);

  const clearWalkTimers = () => {
    walkTimersRef.current.forEach((id) => window.clearTimeout(id));
    walkTimersRef.current = [];
  };

  useEffect(() => clearWalkTimers, []);

  const currentEeveeLandmark = getLandmarkById(eeveeNodeId);
  const selectedLandmark = getLandmarkById(selectedNodeId);
  const recommendedId = getNextRecommendedNode(progress);

  const launchLandmark = (landmark: MapLandmark) => {
    soundEffects.playCorrectPop();
    if (landmark.kind === 'dojo') {
      onOpenBlendingDojo();
      return;
    }
    if (landmark.kind === 'menu-camp') {
      onOpenMenuTrainer();
      return;
    }
    if (landmark.zoneId) {
      onEnterZone(landmark.zoneId);
    }
  };

  const travelToLandmark = (target: MapLandmark) => {
    const unlocked = isLandmarkUnlocked(target, progress);
    if (!unlocked) {
      soundEffects.playGentleWoodChime();
      void speechEngine.speak(
        `${target.name} is next on your journey! Finish the glowing town first, or ask a grown-up to unlock all towns in Settings!`,
      );
      return;
    }

    // If Eevee is already standing right at this landmark, enter immediately!
    if (target.id === eeveeNodeId && !isWalking) {
      setSelectedNodeId(target.id);
      launchLandmark(target);
      return;
    }

    clearWalkTimers();
    const path = computeRoutePath(eeveeNodeId, target.id);
    setSelectedNodeId(target.id);
    setIsWalking(true);

    const stepDelayMs = 340;
    path.slice(1).forEach((stepNodeId, idx) => {
      const prevNode = getLandmarkById(path[idx]!);
      const nextNode = getLandmarkById(stepNodeId);

      const timer = window.setTimeout(() => {
        setFacingLeft(nextNode.x < prevNode.x);
        setEeveeNodeId(stepNodeId);
        soundEffects.playFootstep();

        if (idx === path.length - 2) {
          const doneTimer = window.setTimeout(() => {
            setIsWalking(false);
            onArriveNode(target.id);
            void speechEngine.speak(
              `Welcome to ${target.name}! Tap ${target.ctaLabel} to play!`,
            );
          }, 260);
          walkTimersRef.current.push(doneTimer);
        }
      }, idx * stepDelayMs);

      walkTimersRef.current.push(timer);
    });
  };

  // Keyboard Arrow/WASD navigation across Kanto towns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON')
      ) {
        return;
      }
      if (e.key === 'Enter' && !isWalking) {
        if (isLandmarkUnlocked(selectedLandmark, progress)) {
          launchLandmark(selectedLandmark);
        }
        return;
      }

      const dirMap: Record<string, { dx: number; dy: number }> = {
        ArrowRight: { dx: 1, dy: 0 },
        d: { dx: 1, dy: 0 },
        ArrowLeft: { dx: -1, dy: 0 },
        a: { dx: -1, dy: 0 },
        ArrowUp: { dx: 0, dy: -1 },
        w: { dx: 0, dy: -1 },
        ArrowDown: { dx: 0, dy: 1 },
        s: { dx: 0, dy: 1 },
      };
      const dir = dirMap[e.key];
      if (!dir) return;

      const cur = getLandmarkById(eeveeNodeId);
      let best: MapLandmark | null = null;
      let bestScore = -Infinity;

      for (const cand of KANTO_LANDMARKS) {
        if (cand.id === cur.id || !isLandmarkUnlocked(cand, progress)) continue;
        const vx = cand.x - cur.x;
        const vy = cand.y - cur.y;
        const dist = Math.hypot(vx, vy);
        const dot = (vx / dist) * dir.dx + (vy / dist) * dir.dy;
        if (dot > 0.35) {
          const score = dot * 100 - dist;
          if (score > bestScore) {
            bestScore = score;
            best = cand;
          }
        }
      }

      if (best) {
        e.preventDefault();
        travelToLandmark(best);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const getTownStars = (landmark: MapLandmark): number => {
    if (!landmark.zoneId) return 0;
    const completed = progress.completedZones.includes(landmark.zoneId);
    const words = getWordsByZone(landmark.zoneId);
    const practiced = words.filter((w) => (progress.wordMastery[w.id]?.attempts ?? 0) > 0).length;
    const mastered = words.filter((w) => progress.wordMastery[w.id]?.status === 'mastered').length;
    if (completed) return mastered >= Math.ceil(words.length / 2) ? 3 : 2;
    return practiced > 0 ? 1 : 0;
  };

  const selectedStars = getTownStars(selectedLandmark);
  const selectedUnlocked = isLandmarkUnlocked(selectedLandmark, progress);

  return (
    <main className="overworld-viewport" aria-label="Interactive Kanto Overworld Map">
      <div className="overworld-stage">
        {/* Bespoke Painted 3D-Lit Kanto Peninsula Map */}
        <img
          src={getSceneUrl('kanto-world-map.jpg')}
          alt="Sunlit Kanto Adventure Map"
          className="overworld-map-img"
          draggable={false}
        />

        {/* Glowing Dotted Switch Adventure Roads */}
        <svg
          className="overworld-roads-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {OVERWORLD_ROADS.map(([fromId, toId]) => {
            const a = getLandmarkById(fromId);
            const b = getLandmarkById(toId);
            const bothUnlocked =
              isLandmarkUnlocked(a, progress) && isLandmarkUnlocked(b, progress);
            return (
              <line
                key={`${fromId}-${toId}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={bothUnlocked ? '#FFF9D6' : 'rgba(255,255,255,0.42)'}
                strokeWidth={bothUnlocked ? '0.95' : '0.65'}
                strokeDasharray="1.8 1.8"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Interactive Kanto Town & Side-Trail Nodes */}
        {KANTO_LANDMARKS.map((landmark) => {
          const unlocked = isLandmarkUnlocked(landmark, progress);
          const isSelected = landmark.id === selectedNodeId;
          const isRecommended = landmark.id === recommendedId;
          const isCompleted = Boolean(
            landmark.zoneId && progress.completedZones.includes(landmark.zoneId),
          );
          const stars = getTownStars(landmark);

          return (
            <button
              key={landmark.id}
              id={
                landmark.zoneId && landmark.kind === 'town'
                  ? `zone-card-${landmark.zoneId}`
                  : landmark.kind === 'dojo'
                    ? 'btn-open-blending-dojo'
                    : landmark.kind === 'menu-camp'
                      ? 'btn-open-menu-trainer'
                      : `map-node-${landmark.id}`
              }
              type="button"
              className={`map-node map-node--${landmark.kind} ${
                isSelected ? 'map-node--selected' : ''
              } ${isRecommended ? 'map-node--recommended' : ''} ${
                !unlocked ? 'map-node--locked' : ''
              }`}
              style={{ left: `${landmark.x}%`, top: `${landmark.y}%` }}
              onClick={() => travelToLandmark(landmark)}
              aria-label={`${landmark.name} — ${landmark.challengeTitle}${
                unlocked ? '' : ' (Locked)'
              }`}
            >
              <span
                className="map-node__medallion"
                style={{
                  borderColor: unlocked ? landmark.accentColor : '#94A3B8',
                  background: isCompleted
                    ? '#FEF3C7'
                    : unlocked
                      ? '#FFFFFF'
                      : 'rgba(241, 245, 249, 0.88)',
                }}
              >
                {!unlocked ? (
                  <LockIcon size={16} />
                ) : landmark.kind === 'tall-grass' ? (
                  <SparkleIcon size={18} color="#2EB56B" />
                ) : (
                  <PokeBallIcon size={20} color={landmark.accentColor} />
                )}
              </span>

              <span className="map-node__label">
                <span>{landmark.name}</span>
                {landmark.kind === 'town' && unlocked && (
                  <span className="map-node__stars" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <StarIcon key={i} size={11} filled={i < stars} />
                    ))}
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {/* Animated Walking Eevee Standing Directly on the Painted Kanto Road */}
        <div
          className={`map-eevee-walker ${isWalking ? 'map-eevee-walker--walking' : ''}`}
          style={{
            left: `${currentEeveeLandmark.x}%`,
            top: `${currentEeveeLandmark.y}%`,
          }}
          data-testid="map-eevee-walker"
        >
          <div className="map-eevee-shadow" />
          <div
            className="map-eevee-flip"
            style={{ transform: facingLeft ? 'scaleX(-1)' : 'scaleX(1)' }}
          >
            <EeveeAvatar
              size={84}
              mood={isWalking ? 'cheering' : 'idle'}
              equipped={progress.equippedAccessories}
            />
          </div>
        </div>

        {/* Sleek Floating Switch Town Arrival Card (Bottom-Right) */}
        <section
          className="town-arrival-card"
          aria-label={`Selected destination: ${selectedLandmark.name}`}
        >
          <div
            className="town-arrival-card__accent"
            style={{ background: selectedLandmark.accentColor }}
          />
          <div className="town-arrival-card__content">
            <div className="town-arrival-card__header">
              <div>
                <div className="town-arrival-card__kicker">
                  {selectedLandmark.zoneId && selectedLandmark.kind === 'town'
                    ? `Town ${selectedLandmark.zoneId} of 6`
                    : 'Kanto Side Adventure'}
                </div>
                <h1 className="town-arrival-card__title">{selectedLandmark.name}</h1>
                <div className="town-arrival-card__sub">
                  {selectedLandmark.challengeTitle}
                </div>
              </div>
              <PokemonSprite
                pokemonId={selectedLandmark.featuredPokemonId}
                name={selectedLandmark.featuredPokemonName}
                size={68}
              />
            </div>

            {selectedLandmark.kind === 'town' && (
              <div className="town-arrival-card__stars">
                {[0, 1, 2].map((i) => (
                  <StarIcon key={i} size={18} filled={i < selectedStars} />
                ))}
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--ink-muted)', marginLeft: '4px' }}>
                  {selectedLandmark.description}
                </span>
              </div>
            )}

            <button
              id="btn-arrival-launch"
              type="button"
              disabled={!selectedUnlocked || isWalking}
              className="switch-cta switch-cta--emerald"
              style={{ width: '100%', minHeight: '54px' }}
              onClick={() => launchLandmark(selectedLandmark)}
            >
              <span>
                {isWalking ? 'Eevee is walking…' : selectedLandmark.ctaLabel}
              </span>
            </button>
          </div>
        </section>

        {/* Subtle Bottom-Left Trail Guide Pill */}
        <div className="map-hint-pill">
          <SparkleIcon size={15} color="#F5B82E" />
          <span>Tap any Kanto town to walk Eevee there!</span>
        </div>
      </div>
    </main>
  );
};
