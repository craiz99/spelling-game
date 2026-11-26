import React, { useEffect, useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import type { LetterAudioMode, PhonemeUnit, WordEntry } from '../data/types';
import { resolveWordPictureSlug } from '../data/wordPictures';
import {
  evaluateTileSelection,
  findCorrectTileIdForActiveBox,
  findTileIdByKey,
  getPointOfErrorHint,
  triggerEeveeHelp,
  triggerIdleHint,
  type WordChallengeState,
} from '../engine/phonicsEngine';
import { getSuccessiveBlendSequence } from '../engine/blendingEngine';
import { HeartIcon, PawPrintIcon, SpeakerIcon, SparkleIcon } from './SwitchIcons';
import { WordPictureCard } from './WordPictureCard';

interface ElkoninBoardProps {
  challenge: WordChallengeState;
  letterAudioMode: LetterAudioMode;
  onChallengeChange: (next: WordChallengeState) => void;
  onCoachMessage: (text: string, speech: string, mood: 'happy' | 'encouraging' | 'proud' | 'sparkle') => void;
  onWordBuilt: (meta: { usedHelp: boolean; wrongAttempts: number }) => void;
}

const IDLE_HINT_MS = 6500;

/**
 * Picture + First-Letter minimal Switch Elkonin spelling tray:
 * - Left: Painted Word Picture Card (or official Curative Bottle in Zone 4!)
 * - Center: Ceramic Elkonin letter boxes (with first letter pre-filled in Starter mode
 *   and subtle team underline connecting digraph letter pairs) + Single-Letter ceramic tiles
 * - Right: Big round tactile Speaker, Sound-Out, and Eevee Help icon buttons
 */
export const ElkoninBoard: React.FC<ElkoninBoardProps> = ({
  challenge,
  letterAudioMode,
  onChallengeChange,
  onCoachMessage,
  onWordBuilt,
}) => {
  const [wiggleTileId, setWiggleTileId] = useState<string | null>(null);

  const word: WordEntry = challenge.word;
  const activeUnits = challenge.units;
  const correctTileId = findCorrectTileIdForActiveBox(challenge);
  const pictureSlug = resolveWordPictureSlug(word);

  // 6.5s idle safety net: gently shows the golden sparkle beacon & ghost letter
  useEffect(() => {
    if (challenge.isComplete || challenge.showBeacon) return undefined;
    const timer = window.setTimeout(() => {
      const hinted = triggerIdleHint(challenge);
      onChallengeChange(hinted);
      soundEffects.playHintSparkle();
      void speechEngine.speakUiCue(
        'glow_hint',
        `Take your time! Look for the glowing letter!`,
      );
    }, IDLE_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [challenge, onChallengeChange]);

  const handleBoxTap = (unit: PhonemeUnit, isFilled: boolean) => {
    soundEffects.playTileTap();
    if (unit.isHeartWord && unit.heartHint) {
      void speechEngine.speakHeartHint(unit.heartHint);
      return;
    }
    void speechEngine.speakPhoneme(
      unit.phonemeKey,
      unit.letters,
      letterAudioMode,
      !isFilled,
    );
  };

  const handleTileSelect = (tileId: string) => {
    const outcome = evaluateTileSelection(challenge, tileId);
    if (outcome.result === 'ignored') return;

    onChallengeChange(outcome.state);

    if (outcome.result === 'correct') {
      soundEffects.playCorrectPop();
      if (outcome.chosenTile) {
        void speechEngine.speakPhoneme(
          outcome.chosenTile.phonemeKey,
          outcome.chosenTile.letters,
          letterAudioMode,
        );
      }
      if (outcome.state.isComplete) {
        onWordBuilt({
          usedHelp: outcome.state.usedHelp,
          wrongAttempts: outcome.state.totalWrongAttempts,
        });
      }
      return;
    }

    if (outcome.result === 'wrong-tier-1' && outcome.chosenTile && outcome.expectedUnit) {
      soundEffects.playGentleWoodChime();
      setWiggleTileId(tileId);
      window.setTimeout(() => setWiggleTileId(null), 380);
      const hint = getPointOfErrorHint(
        outcome.chosenTile,
        outcome.expectedUnit,
        word.focusWord,
        1,
      );
      onCoachMessage(hint, hint, 'encouraging');
      return;
    }

    if (outcome.result === 'wrong-tier-2' && outcome.chosenTile && outcome.expectedUnit) {
      soundEffects.playHintSparkle();
      setWiggleTileId(tileId);
      window.setTimeout(() => setWiggleTileId(null), 380);
      void speechEngine.speakUiCue(
        'glow_hint',
        `Look for the glowing letter!`,
      );
      return;
    }

    if (outcome.result === 'auto-assist-tier-3' && outcome.expectedUnit) {
      soundEffects.playCorrectPop();
      void speechEngine.speakUiCue(
        'teamwork',
        `Great teamwork! Eevee placed that letter for you!`,
      );
      if (outcome.state.isComplete) {
        onWordBuilt({
          usedHelp: true,
          wrongAttempts: outcome.state.totalWrongAttempts,
        });
      }
    }
  };

  const handleEeveeHelp = () => {
    const { state: nextState, placedUnit } = triggerEeveeHelp(challenge);
    if (!placedUnit) return;
    soundEffects.playCorrectPop();
    onChallengeChange(nextState);
    void speechEngine.speakUiCue(
      'teamwork',
      `Great teamwork! Eevee placed that letter for you!`,
    );
    if (nextState.isComplete) {
      onWordBuilt({
        usedHelp: true,
        wrongAttempts: nextState.totalWrongAttempts,
      });
    }
  };

  const handleHearWord = () => {
    soundEffects.playTileTap();
    void speechEngine.speakWordIntroduction(
      word.displayWord,
      word.everydaySentence,
      word.focusWord,
    );
  };

  const handleSoundItOut = () => {
    soundEffects.playTileTap();
    const cues = getSuccessiveBlendSequence(
      word.units,
      word.focusWord,
      'successive',
      word.successiveChunkCues,
    );
    const clipSequence = cues.map((cue) => {
      if (cue.isFinalWord) {
        const clean = word.displayWord.trim().toLowerCase();
        return { clipKey: `word:${clean}`, fallbackText: word.displayWord };
      }
      const unit = word.units[cue.stepIndex];
      return {
        clipKey: speechEngine.resolveBlendClipKey(cue.speechText, unit?.phonemeKey),
        fallbackText: cue.speechText,
      };
    });
    void speechEngine.playClipSequence(clipSequence, 130);
  };

  // Full desktop keyboard support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (challenge.isComplete) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      const matchedId = findTileIdByKey(challenge, e.key);
      if (matchedId) {
        e.preventDefault();
        handleTileSelect(matchedId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const isLongWord = activeUnits.length >= 6;

  return (
    <div className="minimal-battle-tray" aria-label={`Spell ${word.displayWord}`}>
      {/* Left: Painted Word Picture Card (or Official Curative Medicine Image in Zone 4) */}
      <WordPictureCard
        pictureSlug={pictureSlug}
        itemSlug={word.itemSlug}
        pokemonId={word.pokemonId}
        label={word.displayWord}
        size="md"
        onTap={handleHearWord}
      />

      {/* Center: Ceramic Elkonin Letter Boxes (First Letter Pre-Filled!) + Single-Letter Tiles */}
      <div className="minimal-battle-tray__center">
        <div
          className={`elkonin-row ${isLongWord ? 'elkonin-row--compact' : ''}`}
          role="group"
          aria-label="Elkonin sound boxes"
        >
          {word.prefixDisplay && (
            <span className="focus-affix" aria-hidden="true">
              {word.prefixDisplay}
            </span>
          )}

          {activeUnits.map((unit, idx) => {
            const isFilled = challenge.filledMask[idx] ?? false;
            const isActive = challenge.activeIndex === idx;
            const showGhost = isActive && challenge.showGhostLetter;
            const hasTeam = Boolean(unit.teamGroupId);
            const prevSameTeam =
              hasTeam && idx > 0 && activeUnits[idx - 1]?.teamGroupId === unit.teamGroupId;
            const nextSameTeam =
              hasTeam &&
              idx < activeUnits.length - 1 &&
              activeUnits[idx + 1]?.teamGroupId === unit.teamGroupId;

            return (
              <button
                key={`${word.id}-box-${idx}`}
                id={`elkonin-box-${idx}`}
                type="button"
                onClick={() => handleBoxTap(unit, isFilled)}
                className={`elkonin-box ${isLongWord ? 'elkonin-box--sm' : ''} ${
                  isFilled
                    ? 'elkonin-box--filled'
                    : isActive
                      ? 'elkonin-box--empty elkonin-box--active switch-cursor-glow'
                      : 'elkonin-box--empty'
                } ${hasTeam ? 'elkonin-box--team' : ''} ${
                  prevSameTeam ? 'elkonin-box--team-left' : ''
                } ${nextSameTeam ? 'elkonin-box--team-right' : ''}`}
                aria-label={
                  isFilled
                    ? `Letter box ${idx + 1}: ${unit.letters}. Tap to hear sound.`
                    : `Missing letter box ${idx + 1}. Tap to hear a sound hint.`
                }
              >
                {isFilled ? (
                  <span>{unit.letters}</span>
                ) : showGhost ? (
                  <span className="elkonin-ghost">{unit.letters}</span>
                ) : (
                  <span style={{ color: '#94A3B8', fontSize: isLongWord ? '1.25rem' : '1.5rem' }}>
                    ?
                  </span>
                )}

                {unit.isHeartWord && (
                  <span
                    className="heart-badge"
                    title={unit.heartHint || 'Heart Word'}
                    aria-label="Heart Word hint"
                  >
                    <HeartIcon size={12} color="#E11D48" />
                  </span>
                )}
              </button>
            );
          })}

          {word.suffixDisplay && (
            <span className="focus-affix" aria-hidden="true">
              {word.suffixDisplay}
            </span>
          )}
        </div>

        <div className="tile-tray" role="group" aria-label="Letter sound tiles">
          {challenge.tiles.map((tile) => {
            const isBeaconTarget =
              challenge.showBeacon && !tile.used && tile.id === correctTileId;
            const isWiggling = wiggleTileId === tile.id;

            return (
              <button
                key={tile.id}
                id={`tile-${tile.id}`}
                type="button"
                disabled={tile.used}
                onClick={() => handleTileSelect(tile.id)}
                className={`phoneme-tile ${isBeaconTarget ? 'switch-cursor-glow' : ''} ${
                  isWiggling ? 'phoneme-tile--wiggle' : ''
                }`}
                aria-label={`Letter tile ${tile.letters}`}
              >
                {tile.letters}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Big Tactile Round Icon Buttons (Speaker, Sound Out, Eevee Help) */}
      <div className="minimal-battle-tray__actions">
        <button
          id="btn-hear-word"
          type="button"
          className="icon-circle-btn icon-circle-btn--blue"
          onClick={handleHearWord}
          aria-label="Hear Word"
          title="Hear Word"
        >
          <SpeakerIcon size={26} color="#FFFFFF" />
        </button>

        <button
          id="btn-sound-it-out"
          type="button"
          className="icon-circle-btn icon-circle-btn--sky"
          onClick={handleSoundItOut}
          aria-label="Sound It Out"
          title="Sound It Out"
        >
          <SparkleIcon size={24} color="#2C98F0" />
        </button>

        <button
          id="btn-eevee-help"
          type="button"
          className="icon-circle-btn icon-circle-btn--caramel"
          onClick={handleEeveeHelp}
          aria-label="Eevee Help"
          title="Eevee Help"
        >
          <PawPrintIcon size={26} color="#FFFFFF" />
        </button>
      </div>
    </div>
  );
};
