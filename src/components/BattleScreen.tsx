import React, { useCallback, useEffect, useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import { getZoneById } from '../data/curriculum';
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
  const [coachText, setCoachText] = useState<string>('');
  const [clinicWrongCount, setClinicWrongCount] = useState(0);
  const [victoryReported, setVictoryReported] = useState(false);

  // Introduce each new word or clinic patient aloud automatically
  useEffect(() => {
    if (!currentWord) return;
    setClinicWrongCount(0);

    if (battle.phase === 'clinic-pick' && battle.clinicPatient) {
      setEeveeMood('encouraging');
      setCoachText(battle.clinicPatient.prompt);
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
      const modeVerb =
        battle.challengeMode === 'wild-catch'
          ? `Spell ${currentWord.focusWord} to catch ${currentWord.pokemonName}!`
          : battle.challengeMode === 'forest-trail'
            ? `Clearing ${battle.currentWordIndex + 1}/3: Spell ${currentWord.focusWord} to befriend ${currentWord.pokemonName}!`
            : battle.challengeMode === 'mart-quest'
              ? `Poké Mart Order: Spell ${currentWord.focusWord} to pack your bag!`
              : battle.challengeMode === 'clinic-heal'
                ? `Spell ${currentWord.focusWord} to activate the cure for ${currentWord.pokemonName}!`
                : `Spell ${currentWord.focusWord} to power Eevee's ${battle.activeMove.name}!`;
      setCoachText(modeVerb);
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
      const callout = `Gotcha! ${currentWord.pokemonName} joined your team!`;
      setCoachText(callout);
      const catchBell = window.setTimeout(() => {
        soundEffects.playCatchSuccess();
        void speechEngine.speak(callout);
      }, 650);
      const doneTimer = window.setTimeout(() => {
        setBattle((prev) => finishBattleMoveAnimation(prev));
      }, 1750);
      return () => {
        window.clearTimeout(catchBell);
        window.clearTimeout(doneTimer);
      };
    }

    if (battle.challengeMode === 'clinic-heal') {
      soundEffects.playHealingChime();
      const callout = `All better! ${currentWord.pokemonName} feels great again!`;
      setCoachText(callout);
      void speechEngine.speak(callout);
      const doneTimer = window.setTimeout(() => {
        setBattle((prev) => finishBattleMoveAnimation(prev));
      }, 1650);
      return () => window.clearTimeout(doneTimer);
    }

    if (battle.challengeMode === 'mart-quest') {
      soundEffects.playCorrectPop();
      const callout = `Packed ${currentWord.displayWord} into your Adventure Bag!`;
      setCoachText(callout);
      void speechEngine.speak(callout);
      const doneTimer = window.setTimeout(() => {
        setBattle((prev) => finishBattleMoveAnimation(prev));
      }, 1500);
      return () => window.clearTimeout(doneTimer);
    }

    soundEffects.playAttackSparkle(battle.activeMove.elementType);
    setCoachText(battle.activeMove.spokenCallout);
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
    setCoachText(praise.text);
    void speechEngine.speak(praise.speech);
    onBattleComplete(battle);
  }, [battle, victoryReported, onBattleComplete]);

  const handleCoachMessage = useCallback(
    (text: string, speech: string, mood: 'happy' | 'encouraging' | 'proud' | 'sparkle') => {
      setCoachText(text);
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
      const hint = `Look for the glowing bottle! ${battle.clinicPatient.targetCurative.spokenHint}`;
      setCoachText(hint);
      void speechEngine.speak(hint);
    } else {
      soundEffects.playGentleWoodChime();
      const hint = `Good try! ${battle.clinicPatient.targetCurative.spokenHint}`;
      setCoachText(hint);
      void speechEngine.speak(hint);
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
      setCoachText(praise.text);
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
        ? `Awesome blend! Tap Throw Poké Ball to catch ${currentWord?.pokemonName ?? 'your pal'}!`
        : battle.challengeMode === 'clinic-heal'
          ? `Smooth blend! Tap Heal Now to cure ${currentWord?.pokemonName ?? 'your pal'}!`
          : battle.challengeMode === 'mart-quest'
            ? `Smooth blend! Tap Pack in Bag to collect your item!`
            : `Smooth blend! Tap Launch ${battle.activeMove.name}!`;
    setCoachText(prompt);
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
    setBattle(fresh);
  };

  const isCatching =
    battle.phase === 'move-animation' &&
    (battle.challengeMode === 'wild-catch' || battle.challengeMode === 'forest-trail');
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

      {/* Top Floating Switch Stage Pills */}
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
          <span>Kanto Map</span>
        </button>

        <div className="stage-title-pill">{zone.name}</div>

        <div
          className="star-hearts-meter"
          aria-label={`Star Hearts: ${battle.starHeartsFilled} of ${battle.targetStarHearts}`}
        >
          <span className="star-hearts-meter__label">
            {battle.challengeMode === 'forest-trail' ? 'Trail' : 'Stars'}
          </span>
          {Array.from({ length: battle.targetStarHearts }).map((_, idx) => (
            <StarIcon
              key={idx}
              size={20}
              filled={idx < battle.starHeartsFilled}
            />
          ))}
        </div>
      </div>

      {/* Upper Full-Bleed Painted Kanto Arena (Characters + Live VFX, ZERO Duplicate Text Boxes!) */}
      <section className="scene-arena" aria-label={`${zone.name} arena`}>
        {/* Left Side: Eevee on Sunlit Ground Shadow */}
        <div className={`scene-actor scene-actor--left ${isLunging ? 'scene-actor--lunge' : ''}`}>
          <div className="actor-ground-shadow" />
          <EeveeAvatar
            size={146}
            mood={eeveeMood}
            equipped={progress.equippedAccessories}
          />
          <div className="actor-nameplate">
            <span className="actor-nameplate__name">Eevee</span>
            <span className={`type-pill type-pill--${battle.activeMove.elementType}`}>
              {battle.activeMove.name}
            </span>
          </div>
        </div>

        {/* Right Side: Wild Pokémon / Clinic Patient / Gym Opponent */}
        {currentWord && battle.phase !== 'victory' && (
          <div className={`scene-actor scene-actor--right ${isCatching ? 'scene-actor--caught' : ''}`}>
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
                size={142}
              />
            </div>
            <div className="actor-nameplate">
              <span className="actor-nameplate__name">{currentWord.pokemonName}</span>
              {battle.clinicPatient && (
                <span className={`status-pill status-pill--${battle.clinicPatient.status}`}>
                  {battle.clinicPatient.status}
                </span>
              )}
              {!battle.clinicPatient && currentWord.elementType && (
                <span className={`type-pill type-pill--${currentWord.elementType}`}>
                  {currentWord.elementType}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Animated Poké Ball Throw / Nurse Joy Heal / Mart Pack / Elemental Move VFX */}
        {battle.phase === 'move-animation' && currentWord && (
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
      <section className="scene-bottom-drawer" aria-label="Challenge controls">
        {/* Single Crisp Coach Line (Zero Duplicate Boxes!) */}
        {battle.phase !== 'victory' && (
          <div className="drawer-coach-bar">
            <button
              type="button"
              className="drawer-coach-btn"
              onClick={() => void speechEngine.speak(coachText)}
              title="Tap to hear Eevee again"
            >
              <SpeakerIcon size={18} />
              <span>{coachText}</span>
            </button>

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
          </div>
        )}

        {/* Zone 4 Clinic Step 1: Pick the right curative bottle */}
        {battle.phase === 'clinic-pick' && battle.clinicPatient && (
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
        )}

        {/* Spelling Stage (Elkonin Boxes + Ceramic Keycaps) */}
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
          <div className="drawer-inner-center">
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

        {/* Interactive Town Payoff Button (Throw Poké Ball / Heal / Pack Bag / Launch Move!) */}
        {battle.phase === 'action-ready' && currentWord && (
          <div className="drawer-inner-center" style={{ padding: '14px 0 8px' }}>
            <button
              id="btn-town-payoff-action"
              type="button"
              className={`switch-cta switch-cta--payoff ${
                battle.challengeMode === 'wild-catch' || battle.challengeMode === 'forest-trail'
                  ? 'switch-cta--red'
                  : battle.challengeMode === 'clinic-heal'
                    ? 'switch-cta--emerald'
                    : 'switch-cta--blue'
              }`}
              onClick={handleTriggerPayoff}
            >
              {battle.challengeMode === 'wild-catch' ||
              battle.challengeMode === 'forest-trail' ? (
                <>
                  <PokeBallIcon size={28} color="#FFFFFF" />
                  <span>Throw Poké Ball at {currentWord.pokemonName}!</span>
                </>
              ) : battle.challengeMode === 'clinic-heal' ? (
                <>
                  <HeartIcon size={24} color="#FFFFFF" />
                  <span>
                    Heal {currentWord.pokemonName} with{' '}
                    {battle.clinicPatient?.targetCurative.label ?? 'Medicine'}!
                  </span>
                </>
              ) : battle.challengeMode === 'mart-quest' ? (
                <>
                  <SparkleIcon size={24} color="#FFFFFF" />
                  <span>Pack {currentWord.displayWord} into Bag!</span>
                </>
              ) : (
                <>
                  <SparkleIcon size={24} color="#FFFFFF" />
                  <span>Launch {battle.activeMove.name}!</span>
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
                fontSize: '1.65rem',
              }}
            >
              {zone.name} Complete! +{battle.totalStarsEarned} ★
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
                  <PokemonSprite pokemonId={w.pokemonId} name={w.pokemonName} size={56} />
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
                Continue on Kanto Map!
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
