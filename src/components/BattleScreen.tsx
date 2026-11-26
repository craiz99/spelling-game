import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import type { AlphabetLetterDef } from '../data/alphabet';
import type {
  EeveeMood,
  MapNodeId,
  MenuCardItem,
  PartnerMoveId,
  PlayerProgress,
  ZoneId,
} from '../data/types';
import { resolveWordPictureSlug } from '../data/wordPictures';
import {
  completeBattleWordBlending,
  completeBattleWordSpelling,
  completeClinicMedicinePick,
  completeLetterCatchEncounter,
  completeSwitchMenuPick,
  createBattleState,
  finishBattleMoveAnimation,
  getCurrentBattleWord,
  setBattleActiveMove,
  triggerBattlePayoffAction,
  type BattleState,
} from '../engine/battleEngine';
import { getUnlockedMoves, isZoneUnlocked } from '../engine/milestoneEngine';
import { getLandmarkById, getLandmarkByZone, getSceneUrl } from '../engine/overworldEngine';
import { buildWordChallenge, resolveEffectiveScaffold } from '../engine/phonicsEngine';
import { AmbientSceneLayer } from './AmbientSceneLayer';
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
  landmarkId?: MapNodeId;
  progress: PlayerProgress;
  onRecordWord: (
    wordId: string,
    meta: { usedHelp: boolean; wrongAttempts: number; focusWord?: string },
  ) => void;
  onPokemonCaught: (pokemonId: number, townName: string) => void;
  onMasterLetter: (letter: string, pokemonId: number, townName: string) => void;
  onMenuWin: () => void;
  onBlendDone: () => void;
  onBattleComplete: (battle: BattleState) => void;
  onExit: () => void;
}

const SwitchMenuCardIcon: React.FC<{ item: MenuCardItem }> = ({ item }) => {
  if (item.itemSlug) {
    return (
      <ItemSprite
        itemSlug={item.itemSlug}
        label={item.label}
        accentColor={item.accentColor}
        size={38}
      />
    );
  }
  switch (item.iconType) {
    case 'fight':
    case 'attack':
      return <SparkleIcon size={24} color={item.accentColor} />;
    case 'party':
    case 'ball':
      return <PokeBallIcon size={26} color={item.accentColor} />;
    case 'map':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={item.accentColor} strokeWidth="2.2" aria-hidden="true">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      );
    case 'bag':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={item.accentColor} strokeWidth="2.2" aria-hidden="true">
          <path d="M6 7h12l1 14H5L6 7z" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case 'save':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={item.accentColor} strokeWidth="2.2" aria-hidden="true">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
        </svg>
      );
    case 'run':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={item.accentColor} strokeWidth="2.2" aria-hidden="true">
          <polyline points="13 17 18 12 13 7" />
          <polyline points="6 17 11 12 6 7" />
        </svg>
      );
    default:
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={item.accentColor} strokeWidth="2.2" aria-hidden="true">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <circle cx="12" cy="11" r="3" />
        </svg>
      );
  }
};

export const BattleScreen: React.FC<BattleScreenProps> = ({
  zoneId,
  landmarkId,
  progress,
  onRecordWord,
  onPokemonCaught,
  onMasterLetter,
  onMenuWin,
  onBlendDone,
  onBattleComplete,
  onExit,
}) => {
  const landmark = landmarkId ? getLandmarkById(landmarkId) : getLandmarkByZone(zoneId);
  const stageTitle = landmark.name;
  const unlockedMoves = useMemo(
    () => getUnlockedMoves(progress.totalStars),
    [progress.totalStars],
  );
  const unlockedZones = useMemo(
    () => ([1, 2, 3, 4, 5, 6] as ZoneId[]).filter((z) => isZoneUnlocked(z, progress)),
    [progress],
  );

  const [battle, setBattle] = useState<BattleState>(() =>
    createBattleState(zoneId, progress.wordMastery, progress.selectedMoveId, Math.random, {
      landmarkId: landmark.id,
      caughtPokemonIds: progress.caughtPokemonIds,
      masteredLetters: progress.masteredLetters,
      unlockedZones,
    }),
  );

  const currentWord = getCurrentBattleWord(battle);
  const activeLetterDef =
    (battle.phase === 'letter-catch' ||
      (battle.phase === 'move-animation' && battle.letterCatchActive)) &&
    battle.letterEncounter
      ? battle.letterEncounter.targetLetter
      : null;

  const [challenge, setChallenge] = useState(() => {
    const first = battle.words[0]!;
    const scaffold = resolveEffectiveScaffold(
      progress.settings.scaffoldMode,
      progress.wordMastery[first.id],
    );
    return buildWordChallenge(first, scaffold, Math.random, progress.settings.tileMode);
  });

  const [eeveeMood, setEeveeMood] = useState<EeveeMood>('happy');
  const [victoryReported, setVictoryReported] = useState(false);
  const [pickWrongCount, setPickWrongCount] = useState(0);
  const [wiggleLetter, setWiggleLetter] = useState<string | null>(null);
  const [targetShrunk, setTargetShrunk] = useState(false);

  const arenaRef = useRef<HTMLElement | null>(null);
  const eeveeRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);

  // Introduce each encounter aloud using 100% consistent Ava Neural voice
  useEffect(() => {
    setPickWrongCount(0);
    setWiggleLetter(null);
    setTargetShrunk(false);

    if (battle.phase === 'letter-catch' && battle.letterEncounter) {
      const def = battle.letterEncounter.targetLetter;
      setEeveeMood('happy');
      const fallback = def.isEndingSound
        ? `Which letter makes the ${def.letter} sound, at the end of ${def.keyword}?`
        : `Which letter makes the ${def.letter} sound, like ${def.keyword}?`;
      void speechEngine.speakLetter(def.letter, true, fallback);
      return;
    }

    if (!currentWord) return;

    if (battle.phase === 'clinic-pick' && battle.clinicPatient) {
      setEeveeMood('encouraging');
      void speechEngine.speakClinicPrompt(currentWord.id, battle.clinicPatient.prompt);
      return;
    }

    if (battle.phase === 'menu-pick' && battle.menuEncounter) {
      setEeveeMood('happy');
      void speechEngine.speakMenuCard(
        battle.menuEncounter.targetCard.id,
        'prompt',
        battle.menuEncounter.prompt,
      );
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

  const isCatchMode =
    battle.challengeMode === 'wild-catch' ||
    battle.challengeMode === 'forest-trail' ||
    battle.challengeMode === 'city-challenge';

  const isCatchAnimation =
    battle.phase === 'move-animation' && (isCatchMode || battle.letterCatchActive);

  // Play town-specific VFX sound, save catch immediately, and advance after animation
  useEffect(() => {
    if (battle.phase !== 'move-animation') return undefined;
    setEeveeMood('cheering');

    // Integrated A–Z Wild Letter Catch payoff!
    if (battle.letterCatchActive && battle.letterEncounter) {
      const target = battle.letterEncounter.targetLetter;
      soundEffects.playPokeBallThrow();
      const catchBell = window.setTimeout(() => {
        soundEffects.playCatchSuccess();
        void speechEngine.speakCaught(target.pokemonName);
        onMasterLetter(target.letter, target.pokemonId, stageTitle);
      }, 2480);
      const doneTimer = window.setTimeout(() => {
        setBattle((prev) => finishBattleMoveAnimation(prev));
      }, 3300);
      return () => {
        window.clearTimeout(catchBell);
        window.clearTimeout(doneTimer);
      };
    }

    if (!currentWord) return undefined;

    if (isCatchMode) {
      soundEffects.playPokeBallThrow();
      // Beat 5 (2480ms): After 3 distinct wiggles, front capture light clicks on & saves catch immediately!
      const catchBell = window.setTimeout(() => {
        soundEffects.playCatchSuccess();
        void speechEngine.speakCaught(currentWord.pokemonName);
        onPokemonCaught(currentWord.pokemonId, stageTitle);
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
      onPokemonCaught(currentWord.pokemonId, stageTitle);
      const doneTimer = window.setTimeout(() => {
        setBattle((prev) => finishBattleMoveAnimation(prev));
      }, 1750);
      return () => window.clearTimeout(doneTimer);
    }

    // Pewter Rock Gym, Cerulean Water Gym, Champion Stadium — Elemental Move Battle!
    soundEffects.playAttackSparkle(battle.activeMove.elementType);
    void speechEngine.speakMoveCallout(battle.activeMove.id, battle.activeMove.spokenCallout);
    onPokemonCaught(currentWord.pokemonId, stageTitle);

    const timer = window.setTimeout(() => {
      setBattle((prev) => finishBattleMoveAnimation(prev));
    }, 1700);
    return () => window.clearTimeout(timer);
  }, [
    battle.phase,
    battle.challengeMode,
    battle.activeMove,
    battle.letterCatchActive,
    battle.letterEncounter,
    currentWord,
    isCatchMode,
    onMasterLetter,
    onPokemonCaught,
    stageTitle,
  ]);

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
      void speechEngine.speakUiCue('try_again', speech);
    },
    [],
  );

  const handleClinicPick = (cardId: string) => {
    if (!battle.clinicPatient) return;
    if (cardId === battle.clinicPatient.targetCurative.id) {
      soundEffects.playCorrectPop();
      setEeveeMood('sparkle');
      onMenuWin();
      setBattle((prev) => completeClinicMedicinePick(prev));
      return;
    }

    const nextWrong = pickWrongCount + 1;
    setPickWrongCount(nextWrong);
    if (nextWrong >= 3) {
      soundEffects.playCorrectPop();
      onMenuWin();
      setBattle((prev) => completeClinicMedicinePick(prev));
    } else if (nextWrong === 2) {
      soundEffects.playHintSparkle();
      void speechEngine.speakMenuCard(
        battle.clinicPatient.targetCurative.id,
        'glow',
        `Look for the glowing bottle! ${battle.clinicPatient.targetCurative.spokenHint}`,
      );
    } else {
      soundEffects.playGentleWoodChime();
      void speechEngine.speakMenuCard(
        battle.clinicPatient.targetCurative.id,
        'hint',
        `Good try! ${battle.clinicPatient.targetCurative.spokenHint}`,
      );
    }
  };

  const handleSwitchMenuPick = (cardId: string) => {
    if (!battle.menuEncounter) return;
    const target = battle.menuEncounter.targetCard;
    if (cardId === target.id) {
      soundEffects.playCorrectPop();
      setEeveeMood('sparkle');
      onMenuWin();
      setBattle((prev) => completeSwitchMenuPick(prev));
      return;
    }

    const nextWrong = pickWrongCount + 1;
    setPickWrongCount(nextWrong);
    if (nextWrong >= 3) {
      soundEffects.playCorrectPop();
      onMenuWin();
      setBattle((prev) => completeSwitchMenuPick(prev));
    } else if (nextWrong === 2) {
      soundEffects.playHintSparkle();
      void speechEngine.speakMenuCard(
        target.id,
        'glow',
        `Look for the glowing card! ${target.spokenHint}`,
      );
    } else {
      soundEffects.playGentleWoodChime();
      void speechEngine.speakMenuCard(target.id, 'hint', `Good try! ${target.spokenHint}`);
    }
  };

  const handleLetterCatchPick = (picked: AlphabetLetterDef) => {
    if (battle.phase !== 'letter-catch' || !battle.letterEncounter) return;
    const target = battle.letterEncounter.targetLetter;
    if (picked.letter === target.letter) {
      soundEffects.playCorrectPop();
      setBattle((prev) => completeLetterCatchEncounter(prev));
      return;
    }

    const nextWrong = pickWrongCount + 1;
    setPickWrongCount(nextWrong);
    setWiggleLetter(picked.letter);
    window.setTimeout(() => setWiggleLetter(null), 380);

    if (nextWrong === 1) {
      soundEffects.playGentleWoodChime();
      setEeveeMood('encouraging');
      void speechEngine.speakUiCue('try_again', `Good try! Listen closely and try another letter!`);
    } else if (nextWrong === 2) {
      soundEffects.playHintSparkle();
      setEeveeMood('encouraging');
      void speechEngine.speakUiCue('glow_hint', `Take your time! Look for the glowing letter!`);
    } else {
      soundEffects.playCorrectPop();
      setBattle((prev) => completeLetterCatchEncounter(prev));
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
    if (isCatchMode) {
      void speechEngine.speakUiCue('throw_ball', 'Awesome blend! Tap the Poké Ball to throw!');
    } else if (battle.challengeMode === 'clinic-heal') {
      void speechEngine.speakUiCue('heal_now', 'Smooth blend! Tap Heal to help your Pokémon!');
    } else {
      void speechEngine.speakUiCue('launch_move', 'Smooth blend! Tap your move to shine in battle!');
    }
    setBattle((prev) => completeBattleWordBlending(prev));
  }, [battle.challengeMode, isCatchMode, onBlendDone]);

  const handleTriggerPayoff = () => {
    setBattle((prev) => triggerBattlePayoffAction(prev));
  };

  const handlePickMove = (moveId: PartnerMoveId) => {
    soundEffects.playTileTap();
    setBattle((prev) => setBattleActiveMove(prev, moveId));
  };

  const handlePlayAgain = () => {
    soundEffects.playTileTap();
    const fresh = createBattleState(
      zoneId,
      progress.wordMastery,
      progress.selectedMoveId,
      Math.random,
      {
        landmarkId: landmark.id,
        caughtPokemonIds: progress.caughtPokemonIds,
        masteredLetters: progress.masteredLetters,
        unlockedZones,
      },
    );
    setBattle(fresh);
    setVictoryReported(false);
    setTargetShrunk(false);
    const first = fresh.words[0]!;
    const scaffold = resolveEffectiveScaffold(
      progress.settings.scaffoldMode,
      progress.wordMastery[first.id],
    );
    setChallenge(buildWordChallenge(first, scaffold, Math.random, progress.settings.tileMode));
  };

  const isLunging = battle.phase === 'move-animation';

  // Active right-side Pokémon (either integrated A–Z wild letter Pokémon or current word Pokémon)
  const displayPokemonId = activeLetterDef?.pokemonId ?? currentWord?.pokemonId ?? 25;
  const displayPokemonName = activeLetterDef?.pokemonName ?? currentWord?.pokemonName ?? 'Pikachu';
  const displayElementType = activeLetterDef ? undefined : currentWord?.elementType;
  const ambientBiome =
    landmark.id === 'saffron'
      ? 'pewter'
      : zoneId === 1
        ? 'pallet'
        : zoneId === 2
          ? 'viridian'
          : zoneId === 3
            ? 'pewter'
            : zoneId === 4
              ? 'center'
              : zoneId === 5
                ? 'cerulean'
                : 'champion';

  return (
    <main
      className="scene-viewport"
      style={{ backgroundImage: `url("${getSceneUrl(landmark.sceneFile)}")` }}
      aria-label={`${stageTitle} challenge`}
    >
      <div className="scene-scrim" />
      <AmbientSceneLayer biome={ambientBiome} />

      {/* Top Minimal Floating Pill Bar */}
      <div className="scene-top-bar">
        <button
          id="btn-battle-back"
          type="button"
          className="switch-pill-btn"
          onClick={() => {
            soundEffects.playTileTap();
            speechEngine.stop();
            onExit();
          }}
        >
          <BackChevronIcon size={17} />
          <span>Map</span>
        </button>

        <div className="scene-zone-pill">
          <span className="scene-zone-pill__name">{stageTitle}</span>
        </div>

        <div
          className="star-hearts-meter"
          aria-label={`Progress: ${battle.starHeartsFilled} of ${battle.targetStarHearts} stars`}
        >
          {Array.from({ length: battle.targetStarHearts }).map((_, idx) => (
            <StarIcon
              key={`heart-${idx}`}
              size={22}
              filled={idx < battle.starHeartsFilled}
            />
          ))}
        </div>
      </div>

      {/* Upper Living Painted Kanto Arena */}
      <section ref={arenaRef} className="scene-arena" aria-label={`${stageTitle} arena`}>
        {/* Left Side: Partner Eevee (Nameplate Above Sprite) */}
        <div
          ref={eeveeRef}
          className={`scene-actor scene-actor--left ${isLunging ? 'scene-actor--lunge' : ''}`}
        >
          <div className="actor-nameplate">
            <span className="actor-nameplate__name">Eevee</span>
          </div>
          <div className="actor-ground-shadow" />
          <EeveeAvatar
            size={150}
            mood={eeveeMood}
            equipped={progress.equippedAccessories}
          />
        </div>

        {/* Right Side: Wild Pokémon / Sick Clinic Patient / Gym Challenger with Nameplate ABOVE Sprite! */}
        {(currentWord || activeLetterDef) && battle.phase !== 'victory' && (
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
            {/* Always-Visible Tappable Pokémon Nameplate ABOVE Sprite (never obscured by Poké Ball!) */}
            <button
              type="button"
              className="actor-nameplate actor-nameplate--btn"
              data-testid="target-pokemon-nameplate"
              onClick={(e) => {
                e.stopPropagation();
                soundEffects.playTileTap();
                void speechEngine.speakPokemon(displayPokemonName);
              }}
              aria-label={`Hear Pokémon name ${displayPokemonName}`}
            >
              <span className="actor-nameplate__name">{displayPokemonName}</span>
              {!activeLetterDef && battle.clinicPatient && (
                <span className={`status-pill status-pill--${battle.clinicPatient.status}`}>
                  {battle.clinicPatient.statusLabel}
                </span>
              )}
              {!activeLetterDef && !battle.clinicPatient && displayElementType && (
                <span className={`type-pill type-pill--${displayElementType}`}>
                  {displayElementType}
                </span>
              )}
              <SpeakerIcon size={14} color="#2C98F0" />
            </button>

            <div className="actor-ground-shadow" />
            <div
              className={`scene-target-visual ${
                !activeLetterDef && battle.clinicPatient && battle.phase !== 'move-animation'
                  ? `scene-target-visual--${battle.clinicPatient.status.toLowerCase()}`
                  : ''
              }`}
            >
              <PokemonSprite
                pokemonId={displayPokemonId}
                name={displayPokemonName}
                size={146}
              />

              {/* Live Animated Status Effect Overlay on Sick Clinic Patients! */}
              {!activeLetterDef && battle.clinicPatient && (
                <StatusEffectOverlay
                  status={battle.clinicPatient.status}
                  cured={battle.phase === 'move-animation'}
                />
              )}
            </div>
          </div>
        )}

        {/* Authentic 3-Wiggle + Front Capture Light Poké Ball Physics */}
        {isCatchAnimation && (
          <PokeBallCaptureLayer
            arenaRef={arenaRef}
            eeveeRef={eeveeRef}
            targetRef={targetRef}
            targetName={displayPokemonName}
            onHitTarget={() => setTargetShrunk(true)}
          />
        )}

        {/* Clinic Healing & Gym Elemental Move VFX */}
        {battle.phase === 'move-animation' && !isCatchAnimation && currentWord && (
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

        {/* Integrated A–Z Wild Letter Catch right inside every town! */}
        {battle.phase === 'letter-catch' && battle.letterEncounter && (
          <div className="minimal-battle-tray" data-testid="integrated-letter-catch">
            <WordPictureCard
              pictureSlug={battle.letterEncounter.targetLetter.pictureSlug}
              label={battle.letterEncounter.targetLetter.keyword}
              size="md"
              onTap={() => {
                const def = battle.letterEncounter!.targetLetter;
                const fb = def.isEndingSound
                  ? `Which letter makes the ${def.letter} sound, at the end of ${def.keyword}?`
                  : `Which letter makes the ${def.letter} sound, like ${def.keyword}?`;
                void speechEngine.speakLetter(def.letter, true, fb);
              }}
            />

            <div className="minimal-battle-tray__center">
              <div className="tile-tray" role="group" aria-label="Pick the matching letter to throw a Poké Ball">
                {battle.letterEncounter.choices.map((choice) => {
                  const isTarget = choice.letter === battle.letterEncounter!.targetLetter.letter;
                  const isGlow = pickWrongCount >= 2 && isTarget;
                  const isWiggle = wiggleLetter === choice.letter;
                  return (
                    <button
                      key={choice.letter}
                      id={`letter-catch-tile-${choice.letter}`}
                      type="button"
                      className={`phoneme-tile ${isGlow ? 'switch-cursor-glow' : ''} ${
                        isWiggle ? 'phoneme-tile--wiggle' : ''
                      }`}
                      onClick={() => handleLetterCatchPick(choice)}
                      aria-label={`Letter ${choice.letter}`}
                    >
                      {choice.letter}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="minimal-battle-tray__actions">
              <button
                id="btn-letter-catch-hear"
                type="button"
                className="icon-circle-btn icon-circle-btn--blue"
                onClick={() => {
                  const def = battle.letterEncounter!.targetLetter;
                  const fb = def.isEndingSound
                    ? `Which letter makes the ${def.letter} sound, at the end of ${def.keyword}?`
                    : `Which letter makes the ${def.letter} sound, like ${def.keyword}?`;
                  void speechEngine.speakLetter(def.letter, true, fb);
                }}
                aria-label="Hear letter sound"
              >
                <SpeakerIcon size={26} color="#FFFFFF" />
              </button>
            </div>
          </div>
        )}

        {/* Integrated Nintendo Switch Menu Pick (flows immediately into spelling that menu item!) */}
        {battle.phase === 'menu-pick' && battle.menuEncounter && (
          <div className="drawer-inner-center" data-testid="integrated-menu-pick">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                id="btn-menu-pick-hear"
                type="button"
                className="icon-circle-btn icon-circle-btn--blue"
                style={{ width: '44px', height: '44px' }}
                onClick={() =>
                  void speechEngine.speakMenuCard(
                    battle.menuEncounter!.targetCard.id,
                    'prompt',
                    battle.menuEncounter!.prompt,
                  )
                }
                aria-label="Hear Switch menu prompt"
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
                {battle.menuEncounter.prompt}
              </span>
            </div>

            <div className="clinic-tray" role="group" aria-label="Nintendo Switch Menu Choices">
              {battle.menuEncounter.choices.map((card) => {
                const isTarget = card.id === battle.menuEncounter!.targetCard.id;
                return (
                  <button
                    key={card.id}
                    id={`switch-menu-${card.id}`}
                    type="button"
                    className={`menu-card-btn ${
                      pickWrongCount >= 2 && isTarget ? 'switch-cursor-glow' : ''
                    }`}
                    onClick={() => handleSwitchMenuPick(card.id)}
                  >
                    <span
                      className="menu-card-btn__strip"
                      style={{ background: card.accentColor }}
                    />
                    <span className="menu-card-btn__icon">
                      <SwitchMenuCardIcon item={card} />
                    </span>
                    <span className="menu-card-btn__label">{card.label}</span>
                    {card.elementType && (
                      <span className={`type-pill type-pill--${card.elementType}`}>
                        {card.elementType}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
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
                onClick={() =>
                  void speechEngine.speakClinicPrompt(
                    currentWord?.id ?? '',
                    battle.clinicPatient!.prompt,
                  )
                }
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
                      pickWrongCount >= 2 && isTarget ? 'switch-cursor-glow' : ''
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

        {/* Stable Reward Card during Move/Capture Animation */}
        {battle.phase === 'move-animation' && (activeLetterDef || currentWord) && (
          <div className="drawer-inner-center" style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              {activeLetterDef ? (
                <WordPictureCard
                  pictureSlug={activeLetterDef.pictureSlug}
                  label={activeLetterDef.keyword}
                  caption={`${activeLetterDef.letter} ${activeLetterDef.lower}`}
                  size="sm"
                  onTap={() => void speechEngine.speakLetter(activeLetterDef.letter, false)}
                />
              ) : (
                currentWord && (
                  <WordPictureCard
                    pictureSlug={resolveWordPictureSlug(currentWord)}
                    itemSlug={currentWord.itemSlug}
                    pokemonId={currentWord.pokemonId}
                    label={currentWord.displayWord}
                    caption={currentWord.displayWord}
                    size="sm"
                    onTap={() => void speechEngine.speakWord(currentWord.displayWord)}
                  />
                )
              )}
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
                  {activeLetterDef
                    ? `${activeLetterDef.letter} — ${activeLetterDef.keyword.toUpperCase()}!`
                    : `${currentWord?.displayWord}!`}
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
              {stageTitle} Complete! ★ +{battle.totalStarsEarned}
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
