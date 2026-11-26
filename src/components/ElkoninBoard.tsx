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
 * Minimal-text, picture-first Elkonin Sound Box spelling tray matching the approved V3 Switch mockup:
 * - Left: Painted Word Picture Card (tap to hear the word aloud!)
 * - Center: Ceramic Elkonin sound boxes directly above tactile ceramic letter tiles
 * - Right: Big round blue Speaker button (Hear Word) + warm caramel Paw button (Eevee Help!)
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
  const correctTileId = findCorrectTileIdForActiveBox(challenge);
  const pictureSlug = resolveWordPictureSlug(word);

  // 6.5s idle safety net: gently shows the golden sparkle beacon & ghost letter
  useEffect(() => {
    if (challenge.isComplete || challenge.showBeacon) return undefined;
    const timer = window.setTimeout(() => {
      const hinted = triggerIdleHint(challenge);
      onChallengeChange(hinted);
      soundEffects.playHintSparkle();
      const activeUnit =
        challenge.activeIndex !== null ? word.units[challenge.activeIndex] : null;
      if (activeUnit) {
        onCoachMessage(
          word.focusWord,
          `Take your time! Look for the glowing tile to build ${word.focusWord.toLowerCase()}!`,
          'encouraging',
        );
      }
    }, IDLE_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [challenge, onChallengeChange, onCoachMessage, word]);

  const handleBoxTap = (unit: PhonemeUnit, isFilled: boolean) => {
    soundEffects.playTileTap();
    if (unit.isHeartWord && unit.heartHint) {
      void speechEngine.speak(unit.heartHint);
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
      const hint = getPointOfErrorHint(
        outcome.chosenTile,
        outcome.expectedUnit,
        word.focusWord,
        2,
      );
      onCoachMessage(hint, hint, 'encouraging');
      return;
    }

    if (outcome.result === 'auto-assist-tier-3' && outcome.expectedUnit) {
      soundEffects.playCorrectPop();
      onCoachMessage(
        outcome.expectedUnit.letters,
        `Eevee placed that sound for you! Great teamwork!`,
        'happy',
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
    onCoachMessage(
      placedUnit.letters,
      `Eevee placed that sound for you! Great teamwork!`,
      'happy',
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
    const spokenParts = cues.map((c) => c.speechText).join(' ... ');
    void speechEngine.speak(spokenParts, { rateOverride: 0.76 });
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

  return (
    <div className="minimal-battle-tray" aria-label={`Spell ${word.displayWord}`}>
      {/* Left: Painted Word Picture Card (tap to hear word aloud) */}
      <WordPictureCard
        pictureSlug={pictureSlug}
        itemSlug={word.itemSlug}
        pokemonId={word.pokemonId}
        label={word.displayWord}
        size="md"
        onTap={handleHearWord}
      />

      {/* Center: Ceramic Elkonin Boxes + Ceramic Sound Tiles */}
      <div className="minimal-battle-tray__center">
        <div className="elkonin-row" role="group" aria-label="Elkonin sound boxes">
          {word.prefixDisplay && (
            <span className="focus-affix" aria-hidden="true">
              {word.prefixDisplay}
            </span>
          )}

          {word.units.map((unit, idx) => {
            const isFilled = challenge.filledMask[idx] ?? false;
            const isActive = challenge.activeIndex === idx;
            const showGhost = isActive && challenge.showGhostLetter;

            return (
              <button
                key={`${word.id}-box-${idx}`}
                id={`elkonin-box-${idx}`}
                type="button"
                onClick={() => handleBoxTap(unit, isFilled)}
                className={`elkonin-box ${
                  isFilled
                    ? 'elkonin-box--filled'
                    : isActive
                      ? 'elkonin-box--empty elkonin-box--active switch-cursor-glow'
                      : 'elkonin-box--empty'
                }`}
                aria-label={
                  isFilled
                    ? `Sound box ${idx + 1}: ${unit.letters}. Tap to hear sound.`
                    : `Missing sound box ${idx + 1}. Tap to hear a sound hint.`
                }
              >
                {isFilled ? (
                  <span>{unit.letters}</span>
                ) : showGhost ? (
                  <span className="elkonin-ghost">{unit.letters}</span>
                ) : (
                  <span style={{ color: '#94A3B8', fontSize: '1.5rem' }}>?</span>
                )}

                {unit.isHeartWord && (
                  <span
                    className="heart-badge"
                    title={unit.heartHint || 'Heart Word'}
                    aria-label="Heart Word hint"
                  >
                    <HeartIcon size={13} color="#E11D48" />
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
