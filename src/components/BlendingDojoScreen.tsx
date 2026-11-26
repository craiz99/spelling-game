import React, { useEffect, useMemo, useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import { areMirrorConfusable, getPhonemeInfo } from '../data/phonemes';
import { WORD_CHAINS } from '../data/wordChains';
import { resolveRawWordPictureSlug } from '../data/wordPictures';
import type { EeveeMood, PlayerProgress } from '../data/types';
import { getSceneUrl } from '../engine/overworldEngine';
import { EeveeAvatar } from './EeveeAvatar';
import { PawSlideBlender } from './PawSlideBlender';
import { PokemonSprite } from './PokemonSprite';
import { BackChevronIcon, PawPrintIcon, SpeakerIcon } from './SwitchIcons';
import { WordPictureCard } from './WordPictureCard';

interface BlendingDojoScreenProps {
  progress: PlayerProgress;
  onBlendDone: () => void;
  onChainComplete: (chainId: string) => void;
  onExit: () => void;
}

const SWAP_VOWELS = [
  { letters: 'A', phonemeKey: 'a_short' },
  { letters: 'E', phonemeKey: 'e_short' },
  { letters: 'I', phonemeKey: 'i_short' },
  { letters: 'O', phonemeKey: 'o_short' },
  { letters: 'U', phonemeKey: 'u_short' },
];

const SWAP_CONSONANTS = [
  { letters: 'S', phonemeKey: 's' },
  { letters: 'M', phonemeKey: 'm' },
  { letters: 'F', phonemeKey: 'f' },
  { letters: 'R', phonemeKey: 'r' },
  { letters: 'N', phonemeKey: 'n' },
  { letters: 'T', phonemeKey: 't' },
  { letters: 'P', phonemeKey: 'p' },
  { letters: 'H', phonemeKey: 'h' },
  { letters: 'B', phonemeKey: 'b' },
];

export const BlendingDojoScreen: React.FC<BlendingDojoScreenProps> = ({
  progress,
  onBlendDone,
  onChainComplete,
  onExit,
}) => {
  const [chainIndex, setChainIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [swapPhase, setSwapPhase] = useState<'swap' | 'blend' | 'complete'>('blend');
  const [wrongCount, setWrongCount] = useState(0);
  const [mood, setMood] = useState<EeveeMood>('happy');

  const chain = WORD_CHAINS[chainIndex] ?? WORD_CHAINS[0]!;
  const step = chain.steps[stepIndex] ?? chain.steps[0]!;

  useEffect(() => {
    const initialPhase = step.changedIndex === null ? 'blend' : 'swap';
    setSwapPhase(initialPhase);
    setWrongCount(0);
    setMood('happy');
    void speechEngine.speak(`${step.spokenPrompt} ${step.everydaySentence}`);
  }, [chainIndex, stepIndex, step]);

  const swapChoices = useMemo(() => {
    if (step.changedIndex === null) return [];
    const targetUnit = step.units[step.changedIndex]!;
    const isVowel = ['A', 'E', 'I', 'O', 'U'].includes(targetUnit.letters);
    const pool = isVowel ? SWAP_VOWELS : SWAP_CONSONANTS;

    const distractors = pool
      .filter(
        (c) =>
          c.letters !== targetUnit.letters &&
          c.letters !== step.previousLetters &&
          !areMirrorConfusable(c.letters, targetUnit.letters),
      )
      .slice(0, 3);

    return [
      { letters: targetUnit.letters, phonemeKey: targetUnit.phonemeKey },
      ...distractors,
    ].sort((a, b) => a.letters.localeCompare(b.letters));
  }, [step]);

  const handleChooseSwap = (letters: string, phonemeKey: string) => {
    if (swapPhase !== 'swap' || step.changedIndex === null) return;
    const expected = step.units[step.changedIndex]!;

    if (letters === expected.letters) {
      soundEffects.playCorrectPop();
      setMood('sparkle');
      const msg = `Yes! You swapped ${step.previousLetters} to ${expected.letters}! Now slide to blend ${step.word}!`;
      void speechEngine.speak(msg);
      setSwapPhase('blend');
      return;
    }

    const nextWrong = wrongCount + 1;
    setWrongCount(nextWrong);
    const chosenInfo = getPhonemeInfo(phonemeKey);
    const expectedInfo = getPhonemeInfo(expected.phonemeKey);

    if (nextWrong === 1) {
      soundEffects.playGentleWoodChime();
      const msg = `That says ${chosenInfo.ttsCue}. For ${step.word}, we need ${expectedInfo.ttsCue} like ${expectedInfo.keyword}!`;
      setMood('encouraging');
      void speechEngine.speak(msg);
    } else if (nextWrong === 2) {
      soundEffects.playHintSparkle();
      const msg = `Look for the glowing tile! We need ${expectedInfo.ttsCue} to make ${step.word}!`;
      setMood('encouraging');
      void speechEngine.speak(msg);
    } else {
      soundEffects.playCorrectPop();
      const msg = `Eevee popped ${expected.letters} right in! Now blend ${step.word}!`;
      setMood('happy');
      void speechEngine.speak(msg);
      setSwapPhase('blend');
    }
  };

  const handleEeveeHelp = () => {
    if (swapPhase !== 'swap' || step.changedIndex === null) return;
    const expected = step.units[step.changedIndex]!;
    soundEffects.playCorrectPop();
    const msg = `Eevee swapped in ${expected.letters}! Now let's slide and blend ${step.word}!`;
    setMood('happy');
    void speechEngine.speak(msg);
    setSwapPhase('blend');
  };

  const handleBlendComplete = () => {
    onBlendDone();
    if (stepIndex + 1 < chain.steps.length) {
      setStepIndex((i) => i + 1);
    } else {
      soundEffects.playVictoryFanfare();
      setSwapPhase('complete');
      setMood('cheering');
      const msg = `Hooray! You finished the whole word chain: ${chain.steps.map((s) => s.word).join(', ')}!`;
      void speechEngine.speak(msg);
      onChainComplete(chain.id);
    }
  };

  const handleSelectChain = (idx: number) => {
    soundEffects.playTileTap();
    setChainIndex(idx);
    setStepIndex(0);
  };

  return (
    <main
      className="scene-viewport"
      style={{ backgroundImage: `url("${getSceneUrl('scene-blending-dojo.jpg')}")` }}
      aria-label="Eevee's Blending Dojo"
    >
      <div className="scene-scrim" />

      <div className="scene-top-bar">
        <button
          id="btn-dojo-back"
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

        <div className="stage-title-pill">Eevee&apos;s Blending Dojo</div>

        <div className="stage-title-pill" style={{ fontSize: '0.88rem' }}>
          {progress.completedChains.length} / {WORD_CHAINS.length} Chains
        </div>
      </div>

      {/* Painted Dojo Veranda Stage with Chain Trail + Eevee & Buddy */}
      <section className="scene-arena scene-arena--dojo">
        <div className="dojo-top-pills">
          <div className="deck-tabs" role="tablist" aria-label="Word chains">
            {WORD_CHAINS.map((c, idx) => {
              const active = idx === chainIndex;
              const done = progress.completedChains.includes(c.id);
              return (
                <button
                  key={c.id}
                  id={`dojo-chain-${c.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`deck-tab ${active ? 'deck-tab--active' : ''}`}
                  style={active ? { borderBottomColor: c.accentColor } : undefined}
                  onClick={() => handleSelectChain(idx)}
                >
                  {done ? '✓ ' : ''}
                  {c.title}
                </button>
              );
            })}
          </div>

          <div className="chain-trail" aria-label="Word chain progress">
            {chain.steps.map((s, idx) => {
              const isDone = idx < stepIndex || swapPhase === 'complete';
              const isActive = idx === stepIndex && swapPhase !== 'complete';
              return (
                <React.Fragment key={`${chain.id}-${s.word}`}>
                  {idx > 0 && <span className="bubble-arrow" style={{ color: '#FFFFFF' }} aria-hidden="true">→</span>}
                  <span
                    className={`chain-step-pill ${
                      isDone
                        ? 'chain-step-pill--done'
                        : isActive
                          ? 'chain-step-pill--active switch-cursor-glow'
                          : ''
                    }`}
                  >
                    {isDone ? `✓ ${s.word}` : isActive ? s.word : '···'}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="scene-actor scene-actor--left">
          <div className="actor-ground-shadow" />
          <EeveeAvatar
            size={128}
            mood={mood}
            equipped={progress.equippedAccessories}
          />
        </div>

        <div className="scene-actor scene-actor--right">
          <div className="actor-ground-shadow" />
          <PokemonSprite pokemonId={step.pokemonId} name={step.word} size={118} />
        </div>
      </section>

      {/* Bottom Floating Switch Dojo Tray */}
      <section className="scene-bottom-drawer scene-bottom-drawer--minimal">
        {swapPhase === 'swap' && step.changedIndex !== null && (
          <div className="minimal-battle-tray">
            <WordPictureCard
              pictureSlug={resolveRawWordPictureSlug(step.word)}
              pokemonId={step.pokemonId}
              label={step.word}
              size="md"
              onTap={() => void speechEngine.speak(`${step.spokenPrompt} ${step.everydaySentence}`)}
            />

            <div className="minimal-battle-tray__center">
              <div className="elkonin-row" aria-label="Single sound swap slots">
                {step.units.map((unit, idx) => {
                  const isTargetSlot = idx === step.changedIndex;
                  return (
                    <div
                      key={`${step.word}-slot-${idx}`}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                    >
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 900,
                          color: isTargetSlot ? 'var(--switch-orange)' : 'transparent',
                          minHeight: '18px',
                        }}
                      >
                        {isTargetSlot && step.previousLetters
                          ? `${step.previousLetters} ↷`
                          : '.'}
                      </span>
                      <button
                        type="button"
                        className={`elkonin-box ${
                          isTargetSlot
                            ? 'elkonin-box--empty elkonin-box--active switch-cursor-glow'
                            : 'elkonin-box--filled'
                        }`}
                        onClick={() => {
                          soundEffects.playTileTap();
                          void speechEngine.speakPhoneme(
                            unit.phonemeKey,
                            unit.letters,
                            progress.settings.letterAudioMode,
                            isTargetSlot,
                          );
                        }}
                      >
                        {isTargetSlot ? (
                          wrongCount >= 2 ? (
                            <span className="elkonin-ghost">{unit.letters}</span>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>?</span>
                          )
                        ) : (
                          unit.letters
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="tile-tray" role="group" aria-label="Sound swap tiles">
                {swapChoices.map((choice) => {
                  const isRight = choice.letters === step.units[step.changedIndex!]!.letters;
                  return (
                    <button
                      key={choice.letters}
                      id={`dojo-tile-${choice.letters}`}
                      type="button"
                      className={`phoneme-tile ${
                        wrongCount >= 2 && isRight ? 'switch-cursor-glow' : ''
                      }`}
                      onClick={() => handleChooseSwap(choice.letters, choice.phonemeKey)}
                    >
                      {choice.letters}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="minimal-battle-tray__actions">
              <button
                id="btn-dojo-hear"
                type="button"
                className="icon-circle-btn icon-circle-btn--blue"
                onClick={() => void speechEngine.speak(`${step.spokenPrompt} ${step.everydaySentence}`)}
                aria-label="Hear Sound"
              >
                <SpeakerIcon size={26} color="#FFFFFF" />
              </button>
              <button
                id="btn-dojo-help"
                type="button"
                className="icon-circle-btn icon-circle-btn--caramel"
                onClick={handleEeveeHelp}
                aria-label="Eevee Help"
              >
                <PawPrintIcon size={26} color="#FFFFFF" />
              </button>
            </div>
          </div>
        )}

        {swapPhase === 'blend' && (
          <div className="blending-with-picture">
            <WordPictureCard
              pictureSlug={resolveRawWordPictureSlug(step.word)}
              pokemonId={step.pokemonId}
              label={step.word}
              caption={step.word}
              size="sm"
              onTap={() => void speechEngine.speak(step.word.toLowerCase())}
            />
            <PawSlideBlender
              units={step.units}
              focusWord={step.word}
              blendingStyle={progress.settings.blendingStyle}
              compact
              onBlendComplete={handleBlendComplete}
            />
          </div>
        )}

        {swapPhase === 'complete' && (
          <div className="action-row" style={{ padding: '12px 0' }}>
            <button
              id="btn-dojo-next-chain"
              type="button"
              className="switch-cta switch-cta--emerald"
              onClick={() => handleSelectChain((chainIndex + 1) % WORD_CHAINS.length)}
            >
              Next Word Chain
            </button>
            <button
              id="btn-dojo-return-map"
              type="button"
              className="switch-cta switch-cta--blue"
              onClick={onExit}
            >
              Kanto Map
            </button>
          </div>
        )}
      </section>
    </main>
  );
};
