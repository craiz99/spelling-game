import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import { ALPHABET_LETTERS, type AlphabetLetterDef } from '../data/alphabet';
import { areMirrorConfusable, getPhonemeInfo } from '../data/phonemes';
import type { EeveeMood, PlayerProgress } from '../data/types';
import { getSceneUrl } from '../engine/overworldEngine';
import { AmbientSceneLayer } from './AmbientSceneLayer';
import { EeveeAvatar } from './EeveeAvatar';
import { PokeBallCaptureLayer } from './PokeBallCaptureLayer';
import { PokemonSprite } from './PokemonSprite';
import {
  BackChevronIcon,
  PawPrintIcon,
  SpeakerIcon,
  StarIcon,
} from './SwitchIcons';
import { WordPictureCard } from './WordPictureCard';

interface LetterLabScreenProps {
  progress: PlayerProgress;
  onMasterLetter: (letter: string, pokemonId: number) => void;
  onExit: () => void;
}

type CatchPhase = 'guess' | 'throwing' | 'caught';

function buildLetterChoices(target: AlphabetLetterDef): AlphabetLetterDef[] {
  const candidates = ALPHABET_LETTERS.filter(
    (item) =>
      item.letter !== target.letter &&
      !areMirrorConfusable(item.letter, target.letter),
  );
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
 * Oak's A–Z Alphabet Safari!
 * Launches directly into active Wild Pokémon Letter Catching (no boring passive soundboard!):
 * - Compact interactive A–Z progress ribbon along the top (tap any letter to hunt it!)
 * - Wild Pokémon appears in the sunlit meadow/safari scene with its name visible
 * - Hear the warm neural human voice ask for the letter sound + see the painted picture
 * - Pick the matching ceramic letter tile -> 3-wiggle + front-light Poké Ball capture!
 */
export const LetterLabScreen: React.FC<LetterLabScreenProps> = ({
  progress,
  onMasterLetter,
  onExit,
}) => {
  const masteredSet = useMemo(
    () => new Set(progress.masteredLetters),
    [progress.masteredLetters],
  );

  // Start on the first unmastered letter so play always feels fresh!
  const [selectedIndex, setSelectedIndex] = useState<number>(() => {
    const idx = ALPHABET_LETTERS.findIndex((item) => !progress.masteredLetters.includes(item.letter));
    return idx >= 0 ? idx : 0;
  });
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
  const catchChoices = useMemo(() => buildLetterChoices(currentLetter), [currentLetter]);

  const speakSafariPrompt = useCallback((def: AlphabetLetterDef) => {
    const info = getPhonemeInfo(def.phonemeKey);
    const fallback = def.isEndingSound
      ? `Which letter makes the ${info.ttsCue} sound at the end of ${def.keyword}?`
      : `Which letter makes the ${info.ttsCue} sound, like ${def.keyword}?`;
    void speechEngine.speakLetter(def.letter, true, fallback);
  }, []);

  useEffect(() => {
    if (catchPhase === 'guess') {
      setWrongCount(0);
      setTargetShrunk(false);
      setMood('happy');
      speakSafariPrompt(currentLetter);
    }
  }, [catchPhase, currentLetter, speakSafariPrompt]);

  const triggerSuccessfulCatch = useCallback(() => {
    setCatchPhase('throwing');
    setMood('cheering');
    soundEffects.playPokeBallThrow();

    // Beat 5 (2480ms): Front capture light locks in!
    window.setTimeout(() => {
      soundEffects.playCatchSuccess();
      void speechEngine.speakCaught(currentLetter.pokemonName);
      onMasterLetter(currentLetter.letter, currentLetter.pokemonId);
    }, 2480);

    window.setTimeout(() => {
      setCatchPhase('caught');
    }, 3250);
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
      setMood('encouraging');
      void speechEngine.speakUiCue(
        'try_again',
        `Good try! Find ${currentPhoneme.ttsCue} like ${currentLetter.keyword}!`,
      );
    } else if (nextWrong === 2) {
      soundEffects.playHintSparkle();
      setMood('encouraging');
      void speechEngine.speakUiCue(
        'glow_hint',
        `Look for the glowing letter ${currentLetter.letter}!`,
      );
    } else {
      soundEffects.playCorrectPop();
      triggerSuccessfulCatch();
    }
  };

  const handleNextCatchLetter = () => {
    soundEffects.playTileTap();
    // Advance to next unmastered letter (or cycle cleanly)
    const nextUnmastered = ALPHABET_LETTERS.findIndex(
      (item, idx) => idx > selectedIndex && !masteredSet.has(item.letter),
    );
    if (nextUnmastered >= 0) {
      setSelectedIndex(nextUnmastered);
    } else {
      setSelectedIndex((prev) => (prev + 1) % ALPHABET_LETTERS.length);
    }
    setCatchPhase('guess');
  };

  return (
    <main
      className="scene-viewport letter-lab-viewport"
      style={{ backgroundImage: `url("${getSceneUrl('scene-pallet-meadow.jpg')}")` }}
      aria-label="Oak's A to Z Alphabet Safari"
    >
      <div className="scene-scrim" />
      <AmbientSceneLayer biome="safari" />

      {/* Top Bar: < Map | Oak's A–Z Safari | ★ 0/26 */}
      <div className="scene-top-bar">
        <button
          id="btn-lab-back"
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

        <div className="stage-title-pill">Oak&apos;s A–Z Safari</div>

        <div className="star-hearts-meter" aria-label={`Letters mastered: ${progress.masteredLetters.length} of 26`}>
          <StarIcon size={20} filled />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.96rem' }}>
            {progress.masteredLetters.length} / 26
          </span>
        </div>
      </div>

      {/* Compact Interactive A–Z Progress Ribbon (tap any letter to hunt it!) */}
      <div className="az-ribbon" role="group" aria-label="Alphabet A through Z progress" data-testid="az-letter-grid">
        {ALPHABET_LETTERS.map((item, idx) => {
          const isCurrent = idx === selectedIndex;
          const isMastered = masteredSet.has(item.letter);
          return (
            <button
              key={item.letter}
              id={`az-tile-${item.letter}`}
              type="button"
              className={`az-ribbon__chip ${isCurrent ? 'az-ribbon__chip--active' : ''} ${
                isMastered ? 'az-ribbon__chip--done' : ''
              }`}
              onClick={() => {
                if (catchPhase === 'throwing') return;
                soundEffects.playTileTap();
                setSelectedIndex(idx);
                setCatchPhase('guess');
              }}
              aria-label={`Hunt letter ${item.letter}${isMastered ? ' mastered' : ''}`}
            >
              {item.letter}
            </button>
          );
        })}
      </div>

      {/* Active Safari Catch Arena: Eevee vs Wild Pokémon with Visible Nameplate */}
      <section ref={arenaRef} className="scene-arena" aria-label="A to Z Safari Arena">
        <div ref={eeveeRef} className="scene-actor scene-actor--left">
          <div className="actor-ground-shadow" />
          <EeveeAvatar
            size={150}
            mood={mood}
            equipped={progress.equippedAccessories}
          />
          <div className="actor-nameplate">
            <span className="actor-nameplate__name">Eevee</span>
          </div>
        </div>

        <div
          ref={targetRef}
          className={`scene-actor scene-actor--right ${targetShrunk ? 'scene-actor--shrunk' : ''}`}
        >
          <div className="actor-ground-shadow" />
          <div className="scene-target-visual">
            <PokemonSprite
              pokemonId={currentLetter.pokemonId}
              name={currentLetter.pokemonName}
              size={146}
            />
          </div>
          <button
            type="button"
            className="actor-nameplate actor-nameplate--btn"
            onClick={() => {
              soundEffects.playTileTap();
              void speechEngine.speakPokemon(currentLetter.pokemonName);
            }}
            aria-label={`Hear Pokémon name ${currentLetter.pokemonName}`}
          >
            <span className="actor-nameplate__name">{currentLetter.pokemonName}</span>
            <SpeakerIcon size={14} color="#2C98F0" />
          </button>
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

      {/* Bottom Minimal Switch Safari Catch Tray */}
      <section className="scene-bottom-drawer scene-bottom-drawer--minimal">
        {catchPhase === 'caught' ? (
          <div className="drawer-inner-center" style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <WordPictureCard
                pictureSlug={currentLetter.pictureSlug}
                label={currentLetter.keyword}
                caption={`${currentLetter.letter} ${currentLetter.lower}`}
                size="sm"
                onTap={() => void speechEngine.speakLetter(currentLetter.letter, false)}
              />
              <button
                id="btn-next-az-catch"
                type="button"
                className="switch-cta switch-cta--emerald"
                style={{ minHeight: '60px', padding: '12px 28px', fontSize: '1.14rem' }}
                onClick={handleNextCatchLetter}
              >
                <StarIcon size={22} filled />
                <span>Next Wild Pal!</span>
              </button>
            </div>
          </div>
        ) : catchPhase === 'throwing' ? (
          <div className="drawer-inner-center" style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <WordPictureCard
                pictureSlug={currentLetter.pictureSlug}
                label={currentLetter.keyword}
                caption={`${currentLetter.letter} ${currentLetter.lower}`}
                size="sm"
                onTap={() => void speechEngine.speakLetter(currentLetter.letter, false)}
              />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.2rem',
                  fontWeight: 800,
                  color: 'var(--ink-primary)',
                }}
              >
                {currentLetter.letter} {currentLetter.lower} — {currentLetter.keyword.toUpperCase()}!
              </span>
            </div>
          </div>
        ) : (
          <div className="minimal-battle-tray">
            <WordPictureCard
              pictureSlug={currentLetter.pictureSlug}
              label={currentLetter.keyword}
              size="md"
              onTap={() => speakSafariPrompt(currentLetter)}
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
                  speakSafariPrompt(currentLetter);
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
                  void speechEngine.speakLetter(currentLetter.letter, false);
                }}
                aria-label="Eevee Help"
              >
                <PawPrintIcon size={26} color="#FFFFFF" />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
