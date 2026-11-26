import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import { ALPHABET_LETTERS, type AlphabetLetterDef } from '../data/alphabet';
import { areMirrorConfusable, getPhonemeInfo } from '../data/phonemes';
import type { EeveeMood, PlayerProgress } from '../data/types';
import { getSceneUrl } from '../engine/overworldEngine';
import { EeveeAvatar } from './EeveeAvatar';
import { PokeBallCaptureLayer } from './PokeBallCaptureLayer';
import { PokemonSprite } from './PokemonSprite';
import {
  BackChevronIcon,
  PawPrintIcon,
  PokeBallIcon,
  SpeakerIcon,
  StarIcon,
} from './SwitchIcons';
import { WordPictureCard } from './WordPictureCard';

interface LetterLabScreenProps {
  progress: PlayerProgress;
  onMasterLetter: (letter: string, pokemonId: number) => void;
  onExit: () => void;
}

type LabMode = 'explore' | 'catch';
type CatchPhase = 'guess' | 'throwing' | 'caught';

function buildLetterChoices(target: AlphabetLetterDef): AlphabetLetterDef[] {
  const candidates = ALPHABET_LETTERS.filter(
    (item) =>
      item.letter !== target.letter &&
      !areMirrorConfusable(item.letter, target.letter),
  );
  // Deterministic friendly spread across the alphabet
  const startIdx = (target.letter.charCodeAt(0) * 5) % Math.max(1, candidates.length);
  const distractors: AlphabetLetterDef[] = [];
  for (let i = 0; i < candidates.length && distractors.length < 3; i += 1) {
    const pick = candidates[(startIdx + i * 7) % candidates.length]!;
    if (!distractors.some((d) => d.letter === pick.letter)) {
      distractors.push(pick);
    }
  }
  return [target, ...distractors].sort((a, b) => a.letter.localeCompare(b.letter));
}

/**
 * Professor Oak's A–Z Letter Lab:
 * - Explore Mode: Full alphabetical A–Z sound board with painted Word Picture Cards
 * - A–Z Catch Mode: Hear a letter sound + see its picture, tap the matching letter,
 *   and launch a target-locked Poké Ball to catch the Pokémon & star that letter!
 */
export const LetterLabScreen: React.FC<LetterLabScreenProps> = ({
  progress,
  onMasterLetter,
  onExit,
}) => {
  const [mode, setMode] = useState<LabMode>('explore');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [catchPhase, setCatchPhase] = useState<CatchPhase>('guess');
  const [wrongCount, setWrongCount] = useState(0);
  const [wiggleLetter, setWiggleLetter] = useState<string | null>(null);
  const [targetShrunk, setTargetShrunk] = useState(false);
  const [mood, setMood] = useState<EeveeMood>('happy');

  const arenaRef = useRef<HTMLElement | null>(null);
  const eeveeRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);

  const currentLetter = ALPHABET_LETTERS[selectedIndex] ?? ALPHABET_LETTERS[0]!;
  const currentPhoneme = getPhonemeInfo(currentLetter.phonemeKey);
  const masteredSet = useMemo(
    () => new Set(progress.masteredLetters),
    [progress.masteredLetters],
  );
  const catchChoices = useMemo(
    () => buildLetterChoices(currentLetter),
    [currentLetter],
  );

  const speakLetterCard = useCallback((def: AlphabetLetterDef, forCatch = false) => {
    const info = getPhonemeInfo(def.phonemeKey);
    if (forCatch) {
      if (def.isEndingSound) {
        void speechEngine.speak(
          `Which letter makes the ${info.ttsCue} sound at the end of ${def.keyword}?`,
        );
      } else {
        void speechEngine.speak(
          `Which letter makes the ${info.ttsCue} sound, like ${def.keyword}?`,
        );
      }
      return;
    }

    if (def.isEndingSound) {
      void speechEngine.speak(
        `${def.letter} says ${info.ttsCue}, like at the end of ${def.keyword}!`,
      );
    } else {
      void speechEngine.speak(
        `${def.letter} says ${info.ttsCue}, like ${def.keyword}!`,
      );
    }
  }, []);

  useEffect(() => {
    if (mode === 'explore') {
      speakLetterCard(currentLetter, false);
    }
  }, [mode, selectedIndex, currentLetter, speakLetterCard]);

  useEffect(() => {
    if (mode === 'catch' && catchPhase === 'guess') {
      setWrongCount(0);
      setTargetShrunk(false);
      setMood('happy');
      speakLetterCard(currentLetter, true);
    }
  }, [mode, catchPhase, currentLetter, speakLetterCard]);

  const startCatchMode = () => {
    soundEffects.playCorrectPop();
    // Pick the first unmastered letter (or keep current if all 26 mastered)
    const firstUnmastered = ALPHABET_LETTERS.findIndex(
      (item) => !masteredSet.has(item.letter),
    );
    if (firstUnmastered >= 0) {
      setSelectedIndex(firstUnmastered);
    }
    setCatchPhase('guess');
    setMode('catch');
  };

  const triggerSuccessfulCatch = useCallback(() => {
    setCatchPhase('throwing');
    setMood('cheering');
    soundEffects.playPokeBallThrow();

    window.setTimeout(() => {
      soundEffects.playCatchSuccess();
      const info = getPhonemeInfo(currentLetter.phonemeKey);
      void speechEngine.speak(
        `Gotcha! ${currentLetter.letter} says ${info.ttsCue}, like ${currentLetter.keyword}!`,
      );
    }, 1580);

    window.setTimeout(() => {
      onMasterLetter(currentLetter.letter, currentLetter.pokemonId);
      setCatchPhase('caught');
    }, 2150);
  }, [currentLetter, onMasterLetter]);

  const handleCatchPick = (picked: AlphabetLetterDef) => {
    if (catchPhase !== 'guess') return;

    if (picked.letter === currentLetter.letter) {
      soundEffects.playCorrectPop();
      triggerSuccessfulCatch();
      return;
    }

    const nextWrong = wrongCount + 1;
    setWrongCount(nextWrong);
    setWiggleLetter(picked.letter);
    window.setTimeout(() => setWiggleLetter(null), 380);

    if (nextWrong === 1) {
      soundEffects.playGentleWoodChime();
      const pickedInfo = getPhonemeInfo(picked.phonemeKey);
      setMood('encouraging');
      void speechEngine.speak(
        `That is ${picked.letter}, ${pickedInfo.ttsCue}. Find ${currentPhoneme.ttsCue} like ${currentLetter.keyword}!`,
      );
    } else if (nextWrong === 2) {
      soundEffects.playHintSparkle();
      setMood('encouraging');
      void speechEngine.speak(
        `Look for the glowing letter ${currentLetter.letter}! ${currentPhoneme.ttsCue}, like ${currentLetter.keyword}!`,
      );
    } else {
      soundEffects.playCorrectPop();
      triggerSuccessfulCatch();
    }
  };

  const handleNextCatchLetter = () => {
    soundEffects.playTileTap();
    setSelectedIndex((prev) => (prev + 1) % ALPHABET_LETTERS.length);
    setCatchPhase('guess');
  };

  return (
    <main
      className="scene-viewport letter-lab-viewport"
      style={{ backgroundImage: `url("${getSceneUrl('scene-oaks-lab.jpg')}")` }}
      aria-label="Professor Oak's A to Z Letter Lab"
    >
      <div className="scene-scrim" />

      {/* Minimal Top Bar: < | A - Z | ★ 0/26 */}
      <div className="scene-top-bar">
        <button
          id="btn-lab-back"
          type="button"
          className="switch-pill-btn"
          onClick={() => {
            speechEngine.stop();
            if (mode === 'catch') {
              setMode('explore');
            } else {
              onExit();
            }
          }}
        >
          <BackChevronIcon size={18} />
          <span>{mode === 'catch' ? 'A – Z' : 'Map'}</span>
        </button>

        <div className="stage-title-pill">A – Z</div>

        <div className="star-hearts-meter" aria-label={`Letters mastered: ${progress.masteredLetters.length} of 26`}>
          <StarIcon size={20} filled />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.96rem' }}>
            {progress.masteredLetters.length} / 26
          </span>
        </div>
      </div>

      {mode === 'explore' ? (
        <section className="letter-lab-explore" aria-label="A to Z Sound Board">
          {/* Upper Stage: Cheering Eevee + Big Painted Flashcard */}
          <div className="letter-lab-hero">
            <div className="letter-lab-eevee">
              <EeveeAvatar
                size={156}
                mood={mood}
                equipped={progress.equippedAccessories}
              />
            </div>

            <div className="letter-flashcard" data-testid="letter-flashcard">
              <WordPictureCard
                pictureSlug={currentLetter.pictureSlug}
                label={currentLetter.keyword}
                size="lg"
                hideSpeakerBadge
                onTap={() => speakLetterCard(currentLetter, false)}
              />

              <div className="letter-flashcard__footer">
                <span className="letter-flashcard__glyph" data-testid="active-letter-glyph">
                  {currentLetter.letter} {currentLetter.lower}
                </span>

                <button
                  id="btn-lab-speak"
                  type="button"
                  className="icon-circle-btn icon-circle-btn--blue"
                  onClick={() => {
                    soundEffects.playTileTap();
                    speakLetterCard(currentLetter, false);
                  }}
                  aria-label={`Hear letter ${currentLetter.letter}`}
                >
                  <SpeakerIcon size={26} color="#FFFFFF" />
                </button>
              </div>
            </div>
          </div>

          {/* Complete 26-Letter Alphabetical A–Z Ceramic Keycap Grid */}
          <div
            className="az-grid"
            role="group"
            aria-label="Alphabet A through Z"
            data-testid="az-letter-grid"
          >
            {ALPHABET_LETTERS.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isMastered = masteredSet.has(item.letter);
              return (
                <button
                  key={item.letter}
                  id={`az-tile-${item.letter}`}
                  type="button"
                  className={`az-tile ${isSelected ? 'az-tile--selected switch-cursor-glow' : ''} ${
                    isMastered ? 'az-tile--mastered' : ''
                  }`}
                  onClick={() => {
                    soundEffects.playTileTap();
                    setSelectedIndex(idx);
                    setMood('sparkle');
                  }}
                  aria-label={`Letter ${item.letter}${isMastered ? ' mastered' : ''}`}
                >
                  <span>{item.letter}</span>
                  {isMastered && (
                    <span className="az-tile__star" aria-hidden="true">
                      <StarIcon size={14} filled />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Center CTA: Play A–Z Catch! */}
          <div className="letter-lab-cta-row">
            <button
              id="btn-play-az-catch"
              type="button"
              className="switch-cta switch-cta--emerald"
              style={{ minHeight: '58px', padding: '12px 30px', fontSize: '1.15rem' }}
              onClick={startCatchMode}
            >
              <PokeBallIcon size={26} color="#FFFFFF" />
              <span>Play A–Z Catch!</span>
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Catch Mode Upper Arena: Eevee vs Wild Pokémon with Target-Locked Poké Ball Capture */}
          <section ref={arenaRef} className="scene-arena" aria-label="A to Z Catch Arena">
            <div ref={eeveeRef} className="scene-actor scene-actor--left">
              <div className="actor-ground-shadow" />
              <EeveeAvatar
                size={146}
                mood={mood}
                equipped={progress.equippedAccessories}
              />
            </div>

            <div
              ref={targetRef}
              className={`scene-actor scene-actor--right ${
                targetShrunk ? 'scene-actor--shrunk' : ''
              }`}
            >
              <div className="actor-ground-shadow" />
              <div className="scene-target-visual">
                <PokemonSprite
                  pokemonId={currentLetter.pokemonId}
                  name={currentLetter.pokemonName}
                  size={142}
                />
              </div>
            </div>

            {catchPhase === 'throwing' && (
              <PokeBallCaptureLayer
                arenaRef={arenaRef}
                eeveeRef={eeveeRef}
                targetRef={targetRef}
                targetName={currentLetter.pokemonName}
                onHitTarget={() => setTargetShrunk(true)}
              />
            )}
          </section>

          {/* Catch Mode Minimal Bottom Switch Tray */}
          <section className="scene-bottom-drawer scene-bottom-drawer--minimal">
            {catchPhase === 'caught' ? (
              <div className="drawer-inner-center" style={{ padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <WordPictureCard
                    pictureSlug={currentLetter.pictureSlug}
                    label={currentLetter.keyword}
                    caption={`${currentLetter.letter} ${currentLetter.lower}`}
                    size="sm"
                    onTap={() => speakLetterCard(currentLetter, false)}
                  />
                  <button
                    id="btn-next-az-catch"
                    type="button"
                    className="switch-cta switch-cta--emerald"
                    style={{ minHeight: '60px', padding: '12px 28px', fontSize: '1.14rem' }}
                    onClick={handleNextCatchLetter}
                  >
                    <StarIcon size={22} filled />
                    <span>Next Letter!</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="minimal-battle-tray">
                <WordPictureCard
                  pictureSlug={currentLetter.pictureSlug}
                  label={currentLetter.keyword}
                  size="md"
                  onTap={() => speakLetterCard(currentLetter, true)}
                />

                <div className="minimal-battle-tray__center">
                  <div className="tile-tray" role="group" aria-label="Choose matching letter">
                    {catchChoices.map((choice) => {
                      const isTarget = choice.letter === currentLetter.letter;
                      const showBeacon = wrongCount >= 2 && isTarget;
                      return (
                        <button
                          key={choice.letter}
                          id={`catch-letter-${choice.letter}`}
                          type="button"
                          disabled={catchPhase !== 'guess'}
                          className={`phoneme-tile ${showBeacon ? 'switch-cursor-glow' : ''} ${
                            wiggleLetter === choice.letter ? 'phoneme-tile--wiggle' : ''
                          }`}
                          onClick={() => handleCatchPick(choice)}
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
                    id="btn-catch-hear"
                    type="button"
                    className="icon-circle-btn icon-circle-btn--blue"
                    onClick={() => {
                      soundEffects.playTileTap();
                      speakLetterCard(currentLetter, true);
                    }}
                    aria-label="Hear sound again"
                  >
                    <SpeakerIcon size={26} color="#FFFFFF" />
                  </button>

                  <button
                    id="btn-catch-help"
                    type="button"
                    className="icon-circle-btn icon-circle-btn--caramel"
                    onClick={() => {
                      soundEffects.playHintSparkle();
                      setWrongCount(2);
                      void speechEngine.speak(
                        `Tap the glowing ${currentLetter.letter}!`,
                      );
                    }}
                    aria-label="Eevee Help"
                  >
                    <PawPrintIcon size={26} color="#FFFFFF" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
};
