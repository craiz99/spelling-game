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
import { getUnlockedMoves } from '../engine/milestoneEngine';
import { getLandmarkByZone, getSceneUrl } from '../engine/overworldEngine';
import {
  buildWordChallenge,
  resolveEffectiveScaffold,
  type WordChallengeState,
} from '../engine/phonicsEngine';
import { AmbientSceneLayer, type SceneBiome } from './AmbientSceneLayer';
import { EeveeAvatar } from './EeveeAvatar';
import { ElkoninBoard } from './ElkoninBoard';
import { PawSlideBlender } from './PawSlideBlender';
import { PokeBallCaptureLayer } from './PokeBallCaptureLayer';
import { ItemSprite, PokemonSprite } from './PokemonSprite';
import { SceneVfxLayer } from './SceneVfxLayer';
import { StatusEffectOverlay } from './StatusEffectOverlay';
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
  onRecordWord: (
    wordId: string,
    meta: { usedHelp: boolean; wrongAttempts: number; focusWord: string },
  ) => void;
  onPokemonCaught: (pokemonId: number, townName: string) => void;
  onBlendDone: () => void;
  onBattleComplete: (battle: BattleState) => void;
  onExit: () => void;
}

const ZONE_BIOME: Record<ZoneId, SceneBiome> = {
  1: 'pallet',
  2: 'viridian',
  3: 'pewter',
  4: 'center',
  5: 'cerulean',
  6: 'champion',
};

export const BattleScreen: React.FC<BattleScreenProps> = ({
  zoneId,
  progress,
  onRecordWord,
  onPokemonCaught,
  onBlendDone,
  onBattleComplete,
  onExit,
}) => {
  const zone = getZoneById(zoneId);
  const landmark = getLandmarkByZone(zoneId);
  const sceneUrl = getSceneUrl(landmark.sceneFile);
  const unlockedMoves = getUnlockedMoves(progress.totalStars);

  const [battle, setBattle] = useState<BattleState>(() =>
    createBattleState(
      zoneId,
      progress.wordMastery,
      progress.selectedMoveId,
      Math.random,
      undefined,
      progress.caughtPokemonIds,
    ),
  );

  const currentWord = getCurrentBattleWord(battle);

  const [challenge, setChallenge] = useState<WordChallengeState>(() => {
    const first = getCurrentBattleWord(battle)!;
    const scaffold = resolveEffectiveScaffold(
      progress.settings.scaffoldMode,
      progress.wordMastery[first.id],
    );
    return buildWordChallenge(first, scaffold, Math.random, progress.settings.tileMode);
  });

  const [eeveeMood, setEeveeMood] = useState<EeveeMood>('happy');
  const [clinicWrongCount, setClinicWrongCount] = useState(0);
  const [targetShrunk, setTargetShrunk] = useState(false);
  const [victoryReported, setVictoryReported] = useState(false);

  const arenaRef = useRef<HTMLElement | null>(null);
  const eeveeRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);

  // Introduce each new word or clinic patient aloud automatically using neural human voice
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
      setChallenge(
        buildWordChallenge(currentWord, scaffold, Math.random, progress.settings.tileMode),
      );
      setEeveeMood('happy');
      void speechEngine.speakWordIntroduction(
        currentWord.displayWord,
        currentWord.everydaySentence,
        currentWord.focusWord,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.currentWordIndex, battle.phase, battle.words, progress.settings.tileMode]);

  // Play town-specific VFX sound, save catch immediately, and advance after animation
  useEffect(() => {
    if (battle.phase !== 'move-animation' || !currentWord) return undefined;
    setEeveeMood('cheering');

    if (battle.challengeMode === 'wild-catch' || battle.challengeMode === 'forest-trail') {
      soundEffects.playPokeBallThrow();
      // Beat 5 (2480ms): After 3 distinct wiggles, front capture light clicks on & saves catch immediately!
      const catchBell = window.setTimeout(() => {
        soundEffects.playCatchSuccess();
        void speechEngine.speakCaught(currentWord.pokemonName);
        onPokemonCaught(currentWord.pokemonId, zone.name);
      }, 2480);
      const doneTimer = window.setTimeout(() => {
        setBattle((prev) => finishBattleMoveAnimation(prev));
      }, 3300);
      return () => {
        window.clearTimeout(catchBell);
        window.clearTimeout(doneTimer);
      };
    }

    if (battle.challengeMode === 'clinic-heal') {
      soundEffects.playHealingChime();
      void speechEngine.speakUiCue(
        'all_better',
        `All better! ${currentWord.pokemonName} feels great again!`,
      );
      onPokemonCaught(currentWord.pokemonId, zone.name);
      const doneTimer = window.setTimeout(() => {
        setBattle((prev) => finishBattleMoveAnimation(prev));
      }, 1750);
      return () => window.clearTimeout(doneTimer);
    }

    // Pewter Rock Gym, Cerulean Water Gym, Champion Stadium — Elemental Move Battle!
    soundEffects.playAttackSparkle(battle.activeMove.elementType);
    void speechEngine.speak(battle.activeMove.spokenCallout);
    onPokemonCaught(currentWord.pokemonId, zone.name);

    const timer = window.setTimeout(() => {
      setBattle((prev) => finishBattleMoveAnimation(prev));
    }, 1700);
    return () => window.clearTimeout(timer);
  }, [battle.phase, battle.challengeMode, battle.activeMove, currentWord, onPokemonCaught, zone.name]);

  // Report victory once when all 5 Star Hearts are filled
  useEffect(() => {
    if (battle.phase !== 'victory' || victoryReported) return;
    setVictoryReported(true);
    soundEffects.playVictoryFanfare();
    setEeveeMood('cheering');
    void speechEngine.speakUiCue(
      'stage_win',
      'Hooray! You finished the whole stage! Eevee is so proud of you!',
    );
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
      onRecordWord(currentWord.id, { ...meta, focusWord: currentWord.focusWord });

      const isFirstTry = !meta.usedHelp && meta.wrongAttempts === 0;
      setEeveeMood(isFirstTry ? 'sparkle' : 'happy');
      void speechEngine.speakUiCue(
        isFirstTry ? 'first_try' : 'great_job',
        isFirstTry
          ? 'Woohoo! You spelled it on your first try! Now slide to blend!'
          : "Awesome job! Now slide Eevee's paw to blend the sounds!",
      );

      setBattle((prev) => completeBattleWordSpelling(prev, meta));
    },
    [currentWord, onRecordWord],
  );

  const handleBlendComplete = useCallback(() => {
    onBlendDone();
    setEeveeMood('cheering');
    if (battle.challengeMode === 'wild-catch' || battle.challengeMode === 'forest-trail') {
      void speechEngine.speakUiCue('throw_ball', 'Awesome blend! Tap the Poké Ball to throw!');
    } else if (battle.challengeMode === 'clinic-heal') {
      void speechEngine.speakUiCue('heal_now', 'Smooth blend! Tap Heal to help your Pokémon!');
    } else {
      void speechEngine.speakUiCue('launch_move', 'Smooth blend! Tap your move to shine in battle!');
    }
    setBattle((prev) => completeBattleWordBlending(prev));
  }, [battle.challengeMode, onBlendDone]);

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
      Math.random,
      undefined,
      progress.caughtPokemonIds,
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
      <AmbientSceneLayer biome={ZONE_BIOME[zoneId]} />

      {/* Top Bar: < Map | Town Name | 5 Star Hearts */}
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
              size={20}
              filled={idx < battle.starHeartsFilled}
            />
          ))}
        </div>
      </div>

      {/* Upper Living Painted Kanto Arena */}
      <section ref={arenaRef} className="scene-arena" aria-label={`${zone.name} arena`}>
        {/* Left Side: Partner Eevee */}
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
          <div className="actor-nameplate">
            <span className="actor-nameplate__name">Eevee</span>
          </div>
        </div>

        {/* Right Side: Wild Pokémon / Sick Clinic Patient / Gym Challenger with Visible Nameplate! */}
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
            <div
              className={`scene-target-visual ${
                battle.clinicPatient && battle.phase !== 'move-animation'
                  ? `scene-target-visual--${battle.clinicPatient.status.toLowerCase()}`
                  : ''
              }`}
            >
              <PokemonSprite
                pokemonId={currentWord.pokemonId}
                name={currentWord.pokemonName}
                size={146}
              />

              {/* Live Animated Status Effect Overlay on Sick Clinic Patients! */}
              {battle.clinicPatient && (
                <StatusEffectOverlay
                  status={battle.clinicPatient.status}
                  cured={battle.phase === 'move-animation'}
                />
              )}
            </div>

            {/* Always-Visible Tappable Pokémon Nameplate (tap to hear human pronunciation!) */}
            <button
              type="button"
              className="actor-nameplate actor-nameplate--btn"
              data-testid="target-pokemon-nameplate"
              onClick={(e) => {
                e.stopPropagation();
                soundEffects.playTileTap();
                void speechEngine.speakPokemon(currentWord.pokemonName);
              }}
              aria-label={`Hear Pokémon name ${currentWord.pokemonName}`}
            >
              <span className="actor-nameplate__name">{currentWord.pokemonName}</span>
              {battle.clinicPatient && (
                <span className={`status-pill status-pill--${battle.clinicPatient.status}`}>
                  {battle.clinicPatient.statusLabel}
                </span>
              )}
              {!battle.clinicPatient && currentWord.elementType && (
                <span className={`type-pill type-pill--${currentWord.elementType}`}>
                  {currentWord.elementType}
                </span>
              )}
              <SpeakerIcon size={14} color="#2C98F0" />
            </button>
          </div>
        )}

        {/* Authentic 3-Wiggle + Front Capture Light Poké Ball Physics */}
        {isCatchAnimation && currentWord && (
          <PokeBallCaptureLayer
            arenaRef={arenaRef}
            eeveeRef={eeveeRef}
            targetRef={targetRef}
            targetName={currentWord.pokemonName}
            onHitTarget={() => setTargetShrunk(true)}
          />
        )}

        {/* Clinic Healing & Gym Elemental Move VFX */}
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
        {/* Move Picker Pills for Gym Battles */}
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

        {/* Zone 4 Clinic Step 1: Visually diagnose status effect & pick curative bottle */}
        {battle.phase === 'clinic-pick' && battle.clinicPatient && (
          <div className="drawer-inner-center">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="icon-circle-btn icon-circle-btn--blue"
                style={{ width: '44px', height: '44px' }}
                onClick={() => void speechEngine.speak(battle.clinicPatient!.prompt)}
                aria-label="Hear patient diagnosis"
              >
                <SpeakerIcon size={20} color="#FFFFFF" />
              </button>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: 'var(--ink-primary)',
                }}
              >
                {currentWord?.pokemonName} is {battle.clinicPatient.statusLabel}! Pick the cure:
              </span>
            </div>

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
                        size={40}
                      />
                    </span>
                    <span className="menu-card-btn__label">{med.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Spelling Stage: Picture + First Letter + Single-Letter Tiles */}
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
              onTap={() => void speechEngine.speakWord(currentWord.displayWord)}
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

        {/* Stable Word Reward Card during Move/Capture Animation */}
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
                onTap={() => void speechEngine.speakWord(currentWord.displayWord)}
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
                fontSize: '1.55rem',
              }}
            >
              {zone.name} Complete! ★ +{battle.totalStarsEarned}
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              {battle.words.map((w) => (
                <div key={w.id} className="victory-pal-chip">
                  <PokemonSprite pokemonId={w.pokemonId} name={w.pokemonName} size={46} />
                  <span>{w.pokemonName}</span>
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
                Play More Words
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
