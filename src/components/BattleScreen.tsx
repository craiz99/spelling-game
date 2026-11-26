import React, { useCallback, useEffect, useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import { getZoneById } from '../data/curriculum';
import type { EeveeMood, PlayerProgress, ZoneId } from '../data/types';
import {
  completeBattleWordBlending,
  completeBattleWordSpelling,
  createBattleState,
  finishBattleMoveAnimation,
  getCurrentBattleWord,
  type BattleState,
} from '../engine/battleEngine';
import { getEncouragement } from '../engine/encouragementEngine';
import {
  buildWordChallenge,
  resolveEffectiveScaffold,
  type WordChallengeState,
} from '../engine/phonicsEngine';
import { EeveeAvatar } from './EeveeAvatar';
import { ElkoninBoard } from './ElkoninBoard';
import { PawSlideBlender } from './PawSlideBlender';
import { ItemSprite, PokemonSprite } from './PokemonSprite';
import { BackChevronIcon, SparkleIcon, StarIcon } from './SwitchIcons';

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
  const [victoryReported, setVictoryReported] = useState(false);

  // Introduce each new word aloud automatically so 5yo never has to read instructions
  useEffect(() => {
    if (battle.phase !== 'spelling' || !currentWord) return;
    const scaffold = resolveEffectiveScaffold(
      progress.settings.scaffoldMode,
      progress.wordMastery[currentWord.id],
    );
    setChallenge(buildWordChallenge(currentWord, scaffold));
    setEeveeMood('happy');
    setCoachText(
      `Spell ${currentWord.focusWord}! ${currentWord.pokemonBridge}`,
    );
    void speechEngine.speakWordIntroduction(
      currentWord.displayWord,
      currentWord.everydaySentence,
      currentWord.focusWord,
    );
    // Only re-initialize when moving to a new word index or battle restart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.currentWordIndex, battle.words]);

  // Handle joyful Partner Move burst timing
  useEffect(() => {
    if (battle.phase !== 'move-animation') return undefined;
    soundEffects.playAttackSparkle(battle.activeMove.elementType);
    setEeveeMood('cheering');
    setCoachText(battle.activeMove.spokenCallout);
    void speechEngine.speak(battle.activeMove.spokenCallout);

    const timer = window.setTimeout(() => {
      setBattle((prev) => finishBattleMoveAnimation(prev));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [battle.phase, battle.activeMove]);

  // Report victory once when Star Hearts are all filled
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
    const praise = getEncouragement('smooth-blend', battle.currentWordIndex);
    setCoachText(praise.text);
    setEeveeMood(praise.eeveeMood);
    setBattle((prev) => completeBattleWordBlending(prev));
  }, [battle.currentWordIndex, onBlendDone]);

  const handlePlayAgain = () => {
    const fresh = createBattleState(
      zoneId,
      progress.wordMastery,
      progress.selectedMoveId,
    );
    setVictoryReported(false);
    setBattle(fresh);
  };

  return (
    <main className="battle-screen" aria-label={`Zone ${zone.id}: ${zone.name}`}>
      {/* Top Stage Header with Star Hearts Meter (Zero HP Bars, Zero Timers!) */}
      <div className="stage-header">
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

        <div className="stage-title-pill">
          Zone {zone.id} · {zone.name}
        </div>

        <div
          className="star-hearts-meter"
          aria-label={`Star Hearts: ${battle.starHeartsFilled} of ${battle.targetStarHearts}`}
        >
          <span className="star-hearts-meter__label">Star Hearts</span>
          {Array.from({ length: battle.targetStarHearts }).map((_, idx) => (
            <StarIcon
              key={idx}
              size={22}
              filled={idx < battle.starHeartsFilled}
            />
          ))}
        </div>
      </div>

      {/* Sunlit Meadow Battle Stage */}
      <section className="battle-arena" aria-label="Eevee encounter arena">
        <div className="battle-arena__side">
          <EeveeAvatar
            size={118}
            mood={eeveeMood}
            equipped={progress.equippedAccessories}
          />
          <button
            type="button"
            className="battle-plate"
            style={{ textAlign: 'left' }}
            onClick={() => void speechEngine.speak(coachText)}
            title="Tap to hear Eevee again"
          >
            <div className="battle-plate__name-row">
              <span className="battle-plate__name">Eevee</span>
              <span className={`type-pill type-pill--${battle.activeMove.elementType}`}>
                {battle.activeMove.name}
              </span>
            </div>
            <p className="battle-plate__speech">{coachText}</p>
          </button>
        </div>

        {currentWord && battle.phase !== 'victory' && (
          <div className="battle-arena__side">
            <div className="battle-plate" style={{ textAlign: 'right' }}>
              <div
                className="battle-plate__name-row"
                style={{ justifyContent: 'flex-end' }}
              >
                <span className="battle-plate__name">{currentWord.pokemonName}</span>
                {currentWord.elementType && (
                  <span className={`type-pill type-pill--${currentWord.elementType}`}>
                    {currentWord.elementType}
                  </span>
                )}
              </div>
              <p className="battle-plate__sub">{currentWord.pokemonBridge}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {currentWord.itemSlug && (
                <div
                  className="switch-card"
                  style={{ padding: '8px', borderRadius: '16px' }}
                >
                  <ItemSprite
                    itemSlug={currentWord.itemSlug}
                    label={currentWord.displayWord}
                    accentColor={zone.accentColor}
                    size={44}
                  />
                </div>
              )}
              <PokemonSprite
                pokemonId={currentWord.pokemonId}
                name={currentWord.pokemonName}
                size={110}
              />
            </div>
          </div>
        )}

        {/* Partner Move Celebration Overlay */}
        {battle.phase === 'move-animation' && (
          <div className="move-burst-banner" role="status">
            <span className={`type-pill type-pill--${battle.activeMove.elementType}`}>
              Partner Move!
            </span>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <SparkleIcon size={26} color={battle.activeMove.accentColor} />
              <span>{battle.activeMove.name}!</span>
              <SparkleIcon size={26} color={battle.activeMove.accentColor} />
            </div>
          </div>
        )}
      </section>

      {/* Active Phase Workspace */}
      {battle.phase === 'spelling' && currentWord && (
        <ElkoninBoard
          challenge={challenge}
          letterAudioMode={progress.settings.letterAudioMode}
          onChallengeChange={setChallenge}
          onCoachMessage={handleCoachMessage}
          onWordBuilt={handleWordBuilt}
        />
      )}

      {battle.phase === 'blending' && currentWord && (
        <section className="work-panel">
          <PawSlideBlender
            units={currentWord.units}
            focusWord={currentWord.focusWord}
            displayWord={currentWord.displayWord}
            prefixDisplay={currentWord.prefixDisplay}
            suffixDisplay={currentWord.suffixDisplay}
            blendingStyle={progress.settings.blendingStyle}
            successiveChunkCues={currentWord.successiveChunkCues}
            onBlendComplete={handleBlendComplete}
          />
        </section>
      )}

      {battle.phase === 'victory' && (
        <section
          className="work-panel"
          data-testid="battle-victory-panel"
          aria-label="Battle Victory Celebration"
        >
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '1.9rem',
            }}
          >
            Zone {zone.id} Star Victory!
          </h2>
          <p
            style={{
              margin: 0,
              fontWeight: 800,
              fontSize: '1.05rem',
              color: 'var(--ink-secondary)',
            }}
          >
            You earned +{battle.totalStarsEarned} Star Stickers and met new Kanto friends!
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '18px',
            }}
          >
            {battle.words.map((w) => (
              <div
                key={w.id}
                className="pokemon-book-card"
                style={{ minWidth: '124px' }}
              >
                <PokemonSprite
                  pokemonId={w.pokemonId}
                  name={w.pokemonName}
                  size={74}
                />
                <span>{w.displayWord}</span>
              </div>
            ))}
          </div>

          <div className="action-row">
            <button
              id="btn-victory-play-again"
              type="button"
              className="switch-cta switch-cta--emerald"
              onClick={handlePlayAgain}
            >
              Play More Words
            </button>
            <button
              id="btn-victory-map"
              type="button"
              className="switch-cta switch-cta--blue"
              onClick={onExit}
            >
              Back to Kanto Map
            </button>
          </div>
        </section>
      )}
    </main>
  );
};
