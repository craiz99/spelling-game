import React from 'react';

export type SceneBiome =
  | 'world-map'
  | 'pallet'
  | 'viridian'
  | 'pewter'
  | 'center'
  | 'cerulean'
  | 'champion'
  | 'dojo'
  | 'safari';

interface AmbientSceneLayerProps {
  biome: SceneBiome;
}

/**
 * Lightweight 60fps pure-CSS living world & backdrop animations:
 * - Kanto World Map: drifting sunlit clouds, shimmering ocean sparkles, floating golden wind motes
 * - Pallet / Safari: warm sunbeams & drifting dandelion pollen seeds
 * - Viridian Forest: sunlit canopy shafts & drifting emerald leaves
 * - Pewter Rock Gym: dramatic arena spotlight rays & floating golden canyon motes
 * - Pokémon Center: gentle rosy healing sparkles & soft radiant shimmer
 * - Cerulean Gym: rising translucent water bubbles & sunlit pool caustics
 * - Champion Stadium: celebratory golden confetti glints & arena beams
 * - Blending Dojo: drifting pink sakura petals & warm veranda sunbeams
 */
export const AmbientSceneLayer: React.FC<AmbientSceneLayerProps> = ({ biome }) => {
  if (biome === 'world-map') {
    return (
      <div className="ambient-layer ambient-layer--map" aria-hidden="true">
        <span className="ambient-cloud ambient-cloud--1" />
        <span className="ambient-cloud ambient-cloud--2" />
        <span className="ambient-cloud ambient-cloud--3" />
        {[
          { left: '12%', top: '65%', delay: '0s' },
          { left: '48%', top: '72%', delay: '0.9s' },
          { left: '60%', top: '84%', delay: '1.8s' },
          { left: '92%', top: '42%', delay: '1.2s' },
          { left: '72%', top: '57%', delay: '2.3s' },
          { left: '34%', top: '34%', delay: '0.5s' },
        ].map((glint, i) => (
          <span
            key={i}
            className="ambient-water-glint"
            style={{ left: glint.left, top: glint.top, animationDelay: glint.delay }}
          />
        ))}
      </div>
    );
  }

  if (biome === 'cerulean') {
    return (
      <div className="ambient-layer ambient-layer--cerulean" aria-hidden="true">
        <div className="ambient-sunbeam" />
        {[8, 19, 31, 46, 58, 72, 84, 92].map((leftPct, i) => (
          <span
            key={i}
            className="ambient-bubble"
            style={{
              left: `${leftPct}%`,
              width: `${12 + (i % 3) * 7}px`,
              height: `${12 + (i % 3) * 7}px`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${5.5 + (i % 4) * 1.4}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (biome === 'viridian') {
    return (
      <div className="ambient-layer ambient-layer--viridian" aria-hidden="true">
        <div className="ambient-sunbeam" />
        {[10, 24, 38, 54, 68, 82, 91].map((leftPct, i) => (
          <span
            key={i}
            className="ambient-leaf"
            style={{
              left: `${leftPct}%`,
              animationDelay: `${i * 0.9}s`,
              animationDuration: `${6.2 + (i % 3) * 1.6}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (biome === 'dojo') {
    return (
      <div className="ambient-layer ambient-layer--dojo" aria-hidden="true">
        <div className="ambient-sunbeam" />
        {[8, 22, 36, 50, 64, 78, 90].map((leftPct, i) => (
          <span
            key={i}
            className="ambient-petal"
            style={{
              left: `${leftPct}%`,
              animationDelay: `${i * 0.85}s`,
              animationDuration: `${6 + (i % 3) * 1.5}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (biome === 'center') {
    return (
      <div className="ambient-layer ambient-layer--center" aria-hidden="true">
        {[14, 28, 44, 60, 76, 88].map((leftPct, i) => (
          <span
            key={i}
            className="ambient-heal-mote"
            style={{
              left: `${leftPct}%`,
              animationDelay: `${i * 0.75}s`,
              animationDuration: `${4.8 + (i % 3) * 1.2}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (biome === 'pewter') {
    return (
      <div className="ambient-layer ambient-layer--pewter" aria-hidden="true">
        <div className="ambient-spotlight ambient-spotlight--left" />
        <div className="ambient-spotlight ambient-spotlight--right" />
        {[12, 27, 42, 58, 74, 88].map((leftPct, i) => (
          <span
            key={i}
            className="ambient-dust"
            style={{
              left: `${leftPct}%`,
              top: `${22 + (i % 3) * 18}%`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (biome === 'champion') {
    return (
      <div className="ambient-layer ambient-layer--champion" aria-hidden="true">
        <div className="ambient-spotlight ambient-spotlight--left" />
        <div className="ambient-spotlight ambient-spotlight--right" />
        {[10, 21, 33, 45, 57, 69, 81, 92].map((leftPct, i) => (
          <span
            key={i}
            className="ambient-confetti"
            style={{
              left: `${leftPct}%`,
              background: ['#FDE047', '#38BDF8', '#F472B6', '#4ADE80'][i % 4],
              animationDelay: `${i * 0.65}s`,
              animationDuration: `${5 + (i % 3) * 1.3}s`,
            }}
          />
        ))}
      </div>
    );
  }

  // Pallet Meadow & Oak's Safari: sunlit pollen seeds & gentle breeze shafts
  return (
    <div className="ambient-layer ambient-layer--meadow" aria-hidden="true">
      <div className="ambient-sunbeam" />
      {[10, 22, 35, 48, 62, 75, 88].map((leftPct, i) => (
        <span
          key={i}
          className="ambient-pollen"
          style={{
            left: `${leftPct}%`,
            top: `${18 + (i % 4) * 14}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${5.5 + (i % 3) * 1.4}s`,
          }}
        />
      ))}
    </div>
  );
};
