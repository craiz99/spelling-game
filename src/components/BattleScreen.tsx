import React, { useCallback, useEffect, useRef, useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import { getZoneById } from '../data/curriculum';
import { resolveWordPictureSlug } from '../data/wordPictures';
import type {
  EeveeMood,
  PartnerMoveId,
  PlayerProgress,
  ZoneId,
} from '../data/types';
import {
  completeBattleWordBlending,
  completeBattleWordSpelling,
  completeClinicMedicinePick,
  createBattleState,
  finishBattleMoveAnimation,
  getCurrentBattleWord,
  setBattleActiveMove,
  triggerBattlePayoffAction,
  type BattleState,
} from '../engine/battleEngine';
import { getEncouragement } from '../engine/encouragementEngine';
import { getUnlockedMoves } from '../engine/milestoneEngine';
import { getLandmarkByZone, getSceneUrl } from '../engine/overworldEngine';
import {
  buildWordChallenge,
  resolveEffectiveScaffold,
  type WordChallengeState,
} from '../engine/phonicsEngine';
import { EeveeAvatar } from './EeveeAvatar';
import { ElkoninBoard } from './ElkoninBoard';
import { PawSlideBlender } from './PawSlideBlender';
import { PokeBallCaptureLayer } from './PokeBallCaptureLayer';
import { ItemSprite, PokemonSprite } from './PokemonSprite';
import { SceneVfxLayer } from './SceneVfxLayer';
import {
  BackChevronIcon,
  HeartIcon,
  PokeBallIcon,
  SpeakerIcon,
  SparkleIcon,
  StarIcon,
} from './SwitchIcons';
import { WordPictureCard } from './WordPictureCard';

interface BattleScreenProps {
  zoneId: ZoneId;
  progress: PlayerProgress;
  onRecordWord: (wordId: string, meta: { usedHelp: boolean; wrongAttempts: number }) => void;
  onBlendDone: () => void;
  onBattleComplete: (battle: BattleState) => void;
  onExit: () => void;
}

export const BattleScreen: React.FC<BattleScreenProps> = ({
  zoneId,
  progress,
  onRecordWord,
  onBlendDone,
  onBattleComplete,
  onExit,
}) => {
  const zone = getZoneById(zoneId);
  const landmark = getLandmarkByZone(zoneId);
  const sceneUrl = getSceneUrl(landmark.sceneFile);
  const unlockedMoves = getUnlockedMoves(progress.totalStars);

  const [battle, setBattle] = useState<BattleState>(() =>
    createBattleState(zoneId, progress.wordMastery, progress.selectedMoveId),
  );

  const currentWord = getCurrentBattleWord(battle);

  const [challenge, setChallenge] = useState<WordChallengeState>(() => {
    const first = getCurrentBattleWord(battle)!;
    const scaffold = resolveEffectiveScaffold(
      progress.settings.scaffoldMode,
      progress.wordMastery[first.id],
    );
    return buildWordChallenge(first, scaffold);
  });

  const [eeveeMood, setEeveeMood] = useState<EeveeMood>('happy');
  const [clinicWrongCount, setClinicWrongCount] = useState(0);
  const [targetShrunk, setTargetShrunk] = useState(false);
  const [victoryReported, setVictoryReported] = useState(false);

  // Refs for exact target-locked Poké Ball trajectory physics
  const arenaRef = useRef<HTMLElement | null>(null);
  const eeveeRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);

  // Introduce each new word or clinic patient aloud automatically
  useEffect(() => {
    if (!currentWord) return;
    setClinicWrongCount(0);
    setTargetShrunk(false);

    if (battle.phase === 'clinic-pick' && battle.clinicPatient) {
      setEeveeMood('encouraging');
      void speechEngine.speak(battle.clinicPatient.prompt);
      return;
    }

    if (battle.phase === 'spelling') {
      const scaffold = resolveEffectiveScaffold(
        progress.settings.scaffoldMode,
        progress.wordMastery[currentWord.id],
      );
      setChallenge(buildWordChallenge(currentWord, scaffold));
      setEeveeMood('happy');
      void speechEngine.speakWordIntroduction(
        currentWord.displayWord,
        currentWord.everydaySentence,
        currentWord.focusWord,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.currentWordIndex, battle.phase, battle.words]);

  // Play town-specific VFX sound & transition after payoff animation
  useEffect(() => {
    if (battle.phase !== 'move-animation' || !currentWord) return undefined;
    setEeveeMood('cheering');

    if (battle.challengeMode === 'wild-catch' || battle.challengeMode === 'forest-trail') {
      soundEffects.playPokeBallThrow();
      const catchBell = window.setTimeout(() => {
        soundEffects.playCatchSuccess();
        void speechEngine.speak(`Gotcha! ${currentWord.pokemonName} joined your team!`);
      }, 1580);
      const doneTimer = window.setTimeout(() => {
        setBattle((prev) => finishBattleMoveAnimation(prev));
      }, 2250);
      return () => {
        window.clearTimeout(catchBell);
        window.clearTimeout(doneTimer);
      };
    }

    if (battle.challengeMode === 'clinic-heal') {
      soundEffects.playHealingChime();
      void speechEngine.speak(`All better! ${currentWord.pokemonName} feels great again!`);
      const doneTimer = window.setTimeout(() => {
        setBattle((prev) => finishBattleMoveAnimation(prev));
      }, 1650);
      return () => window.clearTimeout(doneTimer);
    }

    if (battle.challengeMode === 'mart-quest') {
      soundEffects.playCorrectPop();
      void speechEngine.speak(`Packed ${currentWord.displayWord} into your bag!`);
      const doneTimer = window.setTimeout(() => {
        setBattle((prev) => finishBattleMoveAnimation(prev));
      }, 1500);
      return () => window.clearTimeout(doneTimer);
    }

    soundEffects.playAttackSparkle(battle.activeMove.elementType);
    void speechEngine.speak(battle.activeMove.spokenCallout);

    const timer = window.setTimeout(() => {
      setBattle((prev) => finishBattleMoveAnimation(prev));
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [battle.phase, battle.challengeMode, battle.activeMove, currentWord]);

  // Report victory once when all Star Hearts are filled
  useEffect(() => {
    if (battle.phase !== 'victory' || victoryReported) return;
    setVictoryReported(true);
    soundEffects.playVictoryFanfare();
    const praise = getEncouragement('battle-victory');
    setEeveeMood(praise.eeveeMood);
    void speechEngine.speak(praise.speech);
    onBattleComplete(battle);
  }, [battle, victoryReported, onBattleComplete]);

  const handleCoachMessage = useCallback(
    (_text: string, speech: string, mood: 'happy' | 'encouraging' | 'proud' | 'sparkle') => {
      setEeveeMood(mood);
      void speechEngine.speak(speech);
    },
    [],
  );

  const handleClinicPick = (cardId: string) => {
    if (!battle.clinicPatient) return;
    if (cardId === battle.clinicPatient.targetCurative.id) {
      soundEffects.playCorrectPop();
      setEeveeMood('sparkle');
      setBattle((prev) => completeClinicMedicinePick(prev));
      return;
    }

    const nextWrong = clinicWrongCount + 1;
    setClinicWrongCount(nextWrong);
    if (nextWrong >= 3) {
      soundEffects.playCorrectPop();
      setBattle((prev) => completeClinicMedicinePick(prev));
    } else if (nextWrong === 2) {
      soundEffects.playHintSparkle();
      void speechEngine.speak(
        `Look for the glowing bottle! ${battle.clinicPatient.targetCurative.spokenHint}`,
      );
    } else {
      soundEffects.playGentleWoodChime();
      void speechEngine.speak(
        `Good try! ${battle.clinicPatient.targetCurative.spokenHint}`,
      );
    }
  };

  const handleWordBuilt = useCallback(
    (meta: { usedHelp: boolean; wrongAttempts: number }) => {
      if (!currentWord) return;
      onRecordWord(currentWord.id, meta);

      const event =
        !meta.usedHelp && meta.wrongAttempts === 0
          ? 'first-try-word'
          : meta.usedHelp
            ? 'help-used-word'
            : 'perseverance-word';
      const praise = getEncouragement(event, battle.currentWordIndex);
      setEeveeMood(praise.eeveeMood);
      void speechEngine.speak(praise.speech);

      setBattle((prev) => completeBattleWordSpelling(prev, meta));
    },
    [battle.currentWordIndex, currentWord, onRecordWord],
  );

  const handleBlendComplete = useCallback(() => {
    onBlendDone();
    setEeveeMood('cheering');
    const prompt =
      battle.challengeMode === 'wild-catch' || battle.challengeMode === 'forest-trail'
        ? `Tap the Poké Ball to catch ${currentWord?.pokemonName ?? 'your pal'}!`
        : battle.challengeMode === 'clinic-heal'
          ? `Tap Heal to cure ${currentWord?.pokemonName ?? 'your pal'}!`
          : battle.challengeMode === 'mart-quest'
            ? `Tap Pack to put it in your bag!`
            : `Tap ${battle.activeMove.name}!`;
    void speechEngine.speak(prompt);
    setBattle((prev) => completeBattleWordBlending(prev));
  }, [battle.activeMove.name, battle.challengeMode, currentWord, onBlendDone]);

  const handleTriggerPayoff = () => {
    setBattle((prev) => triggerBattlePayoffAction(prev));
  };

  const handlePickMove = (moveId: PartnerMoveId) => {
    soundEffects.playTileTap();
    setBattle((prev) => setBattleActiveMove(prev, moveId));
  };

  const handlePlayAgain = () => {
    const fresh = createBattleState(
      zoneId,
      progress.wordMastery,
      progress.selectedMoveId,
    );
    setVictoryReported(false);
    setTargetShrunk(false);
    setBattle(fresh);
  };

  const isCatchMode =
    battle.challengeMode === 'wild-catch' || battle.challengeMode === 'forest-trail';
  const isCatchAnimation = battle.phase === 'move-animation' && isCatchMode;
  const isLunging =
    battle.phase === 'move-animation' &&
    (battle.challengeMode === 'gym-battle' || battle.challengeMode === 'champion-gauntlet');

  return (
    <main
      className="scene-viewport"
      style={{ backgroundImage: `url("${sceneUrl}")` }}
      aria-label={`Zone ${zone.id}: ${zone.name}`}
    >
      <div className="scene-scrim" />

      {/* Minimal Top Bar: < | Town Name | 3 Stars */}
      <div className="scene-top-bar">
        <button
          id="btn-battle-back"
          type="button"
          className="switch-pill-btn"
          onClick={() => {
            speechEngine.stop();
            onExit();
          }}
        >
          <BackChevronIcon size={18} />
          <span>Map</span>
        </button>

        <div className="stage-title-pill">{zone.name}</div>

        <div
          className="star-hearts-meter"
          aria-label={`Star Hearts: ${battle.starHeartsFilled} of ${battle.targetStarHearts}`}
        >
          {Array.from({ length: battle.targetStarHearts }).map((_, idx) => (
            <StarIcon
              key={idx}
              size={22}
              filled={idx < battle.starHeartsFilled}
            />
          ))}
        </div>
      </div>

      {/* Upper Full-Bleed Painted Kanto Arena */}
      <section ref={arenaRef} className="scene-arena" aria-label={`${zone.name} arena`}>
        {/* Left Side: Eevee on Sunlit Ground Shadow */}
        <div
          ref={eeveeRef}
          className={`scene-actor scene-actor--left ${isLunging ? 'scene-actor--lunge' : ''}`}
        >
          <div className="actor-ground-shadow" />
          <EeveeAvatar
            size={150}
            mood={eeveeMood}
            equipped={progress.equippedAccessories}
          />
        </div>

        {/* Right Side: Wild Pokémon / Clinic Patient / Gym Opponent */}
        {currentWord && battle.phase !== 'victory' && (
          <div
            ref={targetRef}
            className={`scene-actor scene-actor--right ${
              targetShrunk ? 'scene-actor--shrunk' : ''
            } ${battle.phase === 'action-ready' && isCatchMode ? 'scene-actor--clickable' : ''}`}
            onClick={() => {
              if (battle.phase === 'action-ready' && isCatchMode) {
                handleTriggerPayoff();
              }
            }}
          >
            <div className="actor-ground-shadow" />
            <div className="scene-target-visual">
              {currentWord.itemSlug && battle.challengeMode === 'mart-quest' && (
                <div className="floating-item-orb">
                  <ItemSprite
                    itemSlug={currentWord.itemSlug}
                    label={currentWord.displayWord}
                    accentColor={zone.accentColor}
                    size={46}
                  />
                </div>
              )}
              <PokemonSprite
                pokemonId={currentWord.pokemonId}
                name={currentWord.pokemonName}
                size={146}
              />
            </div>

            {battle.clinicPatient && (
              <div className="actor-nameplate">
                <span className={`status-pill status-pill--${battle.clinicPatient.status}`}>
                  {battle.clinicPatient.status}
                </span>
              </div>
            )}
          </div>
        )}

        {/* True Target-Locked 5-Beat Poké Ball Capture Physics */}
        {isCatchAnimation && currentWord && (
          <PokeBallCaptureLayer
            arenaRef={arenaRef}
            eeveeRef={eeveeRef}
            targetRef={targetRef}
            targetName={currentWord.pokemonName}
            onHitTarget={() => setTargetShrunk(true)}
          />
        )}

        {/* Non-Catch Town Payoff VFX (Nurse Joy Heal, Mart Pack, Gym Elemental Moves) */}
        {battle.phase === 'move-animation' && !isCatchMode && currentWord && (
          <SceneVfxLayer
            mode={battle.challengeMode}
            moveName={battle.activeMove.name}
            elementType={battle.activeMove.elementType}
            itemSlug={battle.clinicPatient?.targetCurative.itemSlug ?? currentWord.itemSlug}
            targetLabel={currentWord.pokemonName}
          />
        )}
      </section>

      {/* Bottom Compact Floating Nintendo Switch Action Tray */}
      <section className="scene-bottom-drawer scene-bottom-drawer--minimal" aria-label="Challenge controls">
        {/* Optional Move Picker Pills for Gym Battles */}
        {(battle.challengeMode === 'gym-battle' ||
          battle.challengeMode === 'champion-gauntlet') &&
          unlockedMoves.length > 1 &&
          battle.phase === 'spelling' && (
            <div className="mini-move-picker" role="group" aria-label="Choose Eevee move">
              {unlockedMoves.slice(-3).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`mini-move-pill ${
                    battle.activeMove.id === m.id ? 'mini-move-pill--active' : ''
                  }`}
                  onClick={() => handlePickMove(m.id)}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}

        {/* Zone 4 Clinic Step 1: Pick the right curative bottle */}
        {battle.phase === 'clinic-pick' && battle.clinicPatient && (
          <div className="drawer-inner-center">
            <button
              type="button"
              className="icon-circle-btn icon-circle-btn--blue"
              style={{ width: '48px', height: '48px' }}
              onClick={() => void speechEngine.speak(battle.clinicPatient!.prompt)}
              aria-label="Hear patient hint"
            >
              <SpeakerIcon size={22} color="#FFFFFF" />
            </button>
            <div className="clinic-tray" role="group" aria-label="Nurse Joy Medicine Pocket">
              {battle.clinicPatient.choices.map((med) => {
                const isTarget = med.id === battle.clinicPatient!.targetCurative.id;
                return (
                  <button
                    key={med.id}
                    id={`clinic-med-${med.id}`}
                    type="button"
                    className={`menu-card-btn ${
                      clinicWrongCount >= 2 && isTarget ? 'switch-cursor-glow' : ''
                    }`}
                    onClick={() => handleClinicPick(med.id)}
                  >
                    <span
                      className="menu-card-btn__strip"
                      style={{ background: med.accentColor }}
                    />
                    <span className="menu-card-btn__icon">
                      <ItemSprite
                        itemSlug={med.itemSlug}
                        label={med.label}
                        accentColor={med.accentColor}
                        size={38}
                      />
                    </span>
                    <span className="menu-card-btn__label">{med.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Spelling Stage: Picture Card + Elkonin Boxes + Ceramic Keycaps + Icon Buttons */}
        {battle.phase === 'spelling' && currentWord && (
          <ElkoninBoard
            challenge={challenge}
            letterAudioMode={progress.settings.letterAudioMode}
            onChallengeChange={setChallenge}
            onCoachMessage={handleCoachMessage}
            onWordBuilt={handleWordBuilt}
          />
        )}

        {/* 2-Step Successive / Continuous Paw-Slide Blending Stage */}
        {battle.phase === 'blending' && currentWord && (
          <div className="blending-with-picture">
            <WordPictureCard
              pictureSlug={resolveWordPictureSlug(currentWord)}
              itemSlug={currentWord.itemSlug}
              pokemonId={currentWord.pokemonId}
              label={currentWord.displayWord}
              caption={currentWord.focusWord}
              size="sm"
              onTap={() =>
                void speechEngine.speak(currentWord.displayWord.toLowerCase())
              }
            />
            <PawSlideBlender
              units={currentWord.units}
              focusWord={currentWord.focusWord}
              displayWord={currentWord.displayWord}
              prefixDisplay={currentWord.prefixDisplay}
              suffixDisplay={currentWord.suffixDisplay}
              blendingStyle={progress.settings.blendingStyle}
              successiveChunkCues={currentWord.successiveChunkCues}
              compact
              onBlendComplete={handleBlendComplete}
            />
          </div>
        )}

        {/* Stable Word Reward Card during Move/Capture Animation (prevents layout jump!) */}
        {battle.phase === 'move-animation' && currentWord && (
          <div className="drawer-inner-center" style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <WordPictureCard
                pictureSlug={resolveWordPictureSlug(currentWord)}
                itemSlug={currentWord.itemSlug}
                pokemonId={currentWord.pokemonId}
                label={currentWord.displayWord}
                caption={currentWord.displayWord}
                size="sm"
                onTap={() => void speechEngine.speak(currentWord.displayWord.toLowerCase())}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <StarIcon size={28} filled />
                  <StarIcon size={34} filled />
                  <StarIcon size={28} filled />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.55rem',
                    fontWeight: 800,
                    color: 'var(--ink-primary)',
                  }}
                >
                  {currentWord.displayWord}!
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Town Payoff Button */}
        {battle.phase === 'action-ready' && currentWord && (
          <div className="drawer-inner-center" style={{ padding: '18px 0 14px' }}>
            <button
              id="btn-town-payoff-action"
              type="button"
              className={`switch-cta switch-cta--payoff ${
                isCatchMode
                  ? 'switch-cta--red'
                  : battle.challengeMode === 'clinic-heal'
                    ? 'switch-cta--emerald'
                    : 'switch-cta--blue'
              }`}
              onClick={handleTriggerPayoff}
            >
              {isCatchMode ? (
                <>
                  <PokeBallIcon size={28} color="#FFFFFF" />
                  <span>Throw Poké Ball!</span>
                </>
              ) : battle.challengeMode === 'clinic-heal' ? (
                <>
                  <HeartIcon size={24} color="#FFFFFF" />
                  <span>Heal {currentWord.pokemonName}!</span>
                </>
              ) : battle.challengeMode === 'mart-quest' ? (
                <>
                  <SparkleIcon size={24} color="#FFFFFF" />
                  <span>Pack in Bag!</span>
                </>
              ) : (
                <>
                  <SparkleIcon size={24} color="#FFFFFF" />
                  <span>{battle.activeMove.name}!</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Victory Celebration Drawer */}
        {battle.phase === 'victory' && (
          <div
            className="drawer-inner-center"
            data-testid="battle-victory-panel"
            aria-label="Battle Victory Celebration"
          >
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
              }}
            >
              {zone.name} ★ +{battle.totalStarsEarned}
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {battle.words.map((w) => (
                <div key={w.id} className="victory-pal-chip">
                  <PokemonSprite pokemonId={w.pokemonId} name={w.pokemonName} size={52} />
                  <span>{w.displayWord}</span>
                </div>
              ))}
            </div>

            <div className="action-row">
              <button
                id="btn-victory-map"
                type="button"
                className="switch-cta switch-cta--emerald"
                onClick={onExit}
              >
                Kanto Map
              </button>
              <button
                id="btn-victory-play-again"
                type="button"
                className="switch-cta switch-cta--blue"
                onClick={handlePlayAgain}
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
