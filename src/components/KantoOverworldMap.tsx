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
import { AmbientSceneLayer } from './AmbientSceneLayer';
import { EeveeAvatar } from './EeveeAvatar';
import { PokemonSprite } from './PokemonSprite';
import { LockIcon, PokeBallIcon, SparkleIcon, StarIcon } from './SwitchIcons';

interface KantoOverworldMapProps {
  progress: PlayerProgress;
  onArriveNode: (nodeId: MapNodeId) => void;
  onEnterLocation: (zoneId: ZoneId, landmarkId: MapNodeId) => void;
  onOpenBlendingDojo: () => void;
}

export const KantoOverworldMap: React.FC<KantoOverworldMapProps> = ({
  progress,
  onArriveNode,
  onEnterLocation,
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
    if (landmark.kind === 'city') {
      onEnterLocation(3, landmark.id);
      return;
    }
    if (landmark.zoneId) {
      onEnterLocation(landmark.zoneId, landmark.id);
    }
  };

  const travelToLandmark = (target: MapLandmark) => {
    const unlocked = isLandmarkUnlocked(target, progress);
    if (!unlocked) {
      soundEffects.playGentleWoodChime();
      void speechEngine.speakTown(
        target.id,
        true,
        `${target.name} is next! Finish the glowing town first.`,
      );
      return;
    }

    // If Eevee is already standing at this landmark, enter right away
    if (target.id === eeveeNodeId && !isWalking) {
      setSelectedNodeId(target.id);
      launchLandmark(target);
      return;
    }

    clearWalkTimers();
    const path = computeRoutePath(eeveeNodeId, target.id);
    setSelectedNodeId(target.id);
    setIsWalking(true);

    const stepDelayMs = 310;
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
            void speechEngine.speakTown(target.id, false, `${target.name}!`);
          }, 240);
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
        {/* Expansive Painted Regional Kanto Map */}
        <img
          src={getSceneUrl('kanto-world-map.jpg')}
          alt="Kanto Adventure Region Map"
          className="overworld-map-img"
          draggable={false}
        />

        {/* Living Drifting Clouds & Sparkling Ocean Glints */}
        <AmbientSceneLayer biome="world-map" />

        {/* Subtle Glowing Dotted Adventure Roads */}
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
                stroke={bothUnlocked ? '#FFF9D6' : 'rgba(255,255,255,0.4)'}
                strokeWidth={bothUnlocked ? '0.8' : '0.55'}
                strokeDasharray="1.6 1.6"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Interactive Regional Kanto Town & Activity Pins */}
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
              aria-label={`${landmark.name}${unlocked ? '' : ' (Locked)'}`}
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
                  <LockIcon size={15} />
                ) : landmark.kind === 'tall-grass' ? (
                  <SparkleIcon size={17} color="#2EB56B" />
                ) : (
                  <PokeBallIcon size={19} color={landmark.accentColor} />
                )}
              </span>

              <span className="map-node__label">
                <span>{landmark.name}</span>
                {landmark.kind === 'town' && unlocked && (
                  <span className="map-node__stars" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <StarIcon key={i} size={10} filled={i < stars} />
                    ))}
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {/* Animated Walking Eevee Standing Directly on the Regional Kanto Road */}
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
              size={76}
              mood={isWalking ? 'cheering' : 'idle'}
              equipped={progress.equippedAccessories}
            />
          </div>
        </div>

        {/* Ultra-Clean Minimal Bottom-Right Town Arrival Card (Zero Paragraphs!) */}
        <section
          className="town-arrival-card town-arrival-card--compact"
          aria-label={`Selected destination: ${selectedLandmark.name}`}
        >
          <div
            className="town-arrival-card__accent"
            style={{ background: selectedLandmark.accentColor }}
          />
          <div className="town-arrival-card__content">
            <div className="town-arrival-card__header">
              <div>
                <h1 className="town-arrival-card__title">{selectedLandmark.name}</h1>
                {selectedLandmark.kind === 'town' ? (
                  <div className="town-arrival-card__stars" aria-label={`${selectedStars} of 3 stars`}>
                    {[0, 1, 2].map((i) => (
                      <StarIcon key={i} size={17} filled={i < selectedStars} />
                    ))}
                  </div>
                ) : (
                  <div className="town-arrival-card__sub">{selectedLandmark.challengeTitle}</div>
                )}
              </div>
              <PokemonSprite
                pokemonId={selectedLandmark.featuredPokemonId}
                name={selectedLandmark.featuredPokemonName}
                size={60}
              />
            </div>

            <button
              id="btn-arrival-launch"
              type="button"
              disabled={!selectedUnlocked || isWalking}
              className="switch-cta switch-cta--emerald"
              style={{ width: '100%', minHeight: '50px', fontSize: '1.1rem' }}
              onClick={() => launchLandmark(selectedLandmark)}
            >
              <span>{isWalking ? '…' : selectedLandmark.ctaLabel}</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
};
