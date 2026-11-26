import React, { useEffect, useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';
import { MENU_DECKS } from '../data/menuDecks';
import type { EeveeMood, MenuCardItem, MenuDeckId, PlayerProgress } from '../data/types';
import {
  createMenuRound,
  evaluateMenuChoice,
  triggerMenuEeveeHelp,
  type MenuRoundState,
} from '../engine/menuTrainerEngine';
import { getSceneUrl } from '../engine/overworldEngine';
import { EeveeAvatar } from './EeveeAvatar';
import { PawSlideBlender } from './PawSlideBlender';
import { ItemSprite } from './PokemonSprite';
import {
  BackChevronIcon,
  PawPrintIcon,
  PokeBallIcon,
  SpeakerIcon,
  SparkleIcon,
} from './SwitchIcons';

interface MenuTrainerScreenProps {
  progress: PlayerProgress;
  onMenuWin: () => void;
  onBlendDone: () => void;
  onExit: () => void;
}

const MenuCardIcon: React.FC<{ item: MenuCardItem; hidden: boolean }> = ({
  item,
  hidden,
}) => {
  if (hidden) {
    return (
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.35rem',
          fontWeight: 700,
          color: '#94A3B8',
        }}
        aria-hidden="true"
      >
        ?
      </span>
    );
  }

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

export const MenuTrainerScreen: React.FC<MenuTrainerScreenProps> = ({
  progress,
  onMenuWin,
  onBlendDone,
  onExit,
}) => {
  const [deckId, setDeckId] = useState<MenuDeckId>('medicine');
  const [readingMode, setReadingMode] = useState(false);
  const [round, setRound] = useState<MenuRoundState>(() => createMenuRound('medicine'));
  const [coachText, setCoachText] = useState<string>(round.target.prompt);
  const [mood, setMood] = useState<EeveeMood>('idle');
  const [roundBlended, setRoundBlended] = useState(false);

  useEffect(() => {
    setCoachText(round.target.prompt);
    setMood('happy');
    setRoundBlended(false);
    void speechEngine.speakMenuCard(round.target.id, 'prompt', round.target.prompt);
  }, [round.target]);

  const handleSelectDeck = (nextDeck: MenuDeckId) => {
    soundEffects.playTileTap();
    setDeckId(nextDeck);
    setRound(createMenuRound(nextDeck));
  };

  const handleChooseCard = (cardId: string) => {
    const outcome = evaluateMenuChoice(round, cardId);
    if (outcome.result === 'ignored') return;

    setRound(outcome.state);
    setCoachText(outcome.coachingText);

    if (outcome.result === 'correct' || outcome.result === 'auto-assist-tier-3') {
      soundEffects.playCorrectPop();
      setMood('cheering');
      void speechEngine.speakMenuCard(round.target.id, 'win', outcome.coachingText);
      onMenuWin();
    } else if (outcome.result === 'wrong-tier-1') {
      soundEffects.playGentleWoodChime();
      setMood('encouraging');
      void speechEngine.speakMenuCard(round.target.id, 'hint', outcome.coachingText);
    } else {
      soundEffects.playHintSparkle();
      setMood('encouraging');
      void speechEngine.speakMenuCard(round.target.id, 'glow', outcome.coachingText);
    }
  };

  const handleEeveeHelp = () => {
    const helped = triggerMenuEeveeHelp(round);
    setRound(helped);
    soundEffects.playCorrectPop();
    const msg = `Eevee found ${round.target.label}! Now let's slide and blend it together!`;
    setCoachText(msg);
    setMood('happy');
    void speechEngine.speakMenuCard(round.target.id, 'win', msg);
    onMenuWin();
  };

  const handleNextRound = () => {
    soundEffects.playTileTap();
    setRound(createMenuRound(deckId, round.target.id));
  };

  const handleBlendComplete = () => {
    setRoundBlended(true);
    onBlendDone();
  };

  const bgScene =
    deckId === 'medicine'
      ? 'scene-pokemon-center.jpg'
      : deckId === 'attacks' || deckId === 'battle'
        ? 'scene-cerulean-gym.jpg'
        : 'scene-pewter-mart.jpg';

  return (
    <main
      className="scene-viewport"
      style={{ backgroundImage: `url("${getSceneUrl(bgScene)}")` }}
      aria-label="Let's Go Switch Menu Trainer"
    >
      <div className="scene-scrim" />

      <div className="scene-top-bar">
        <button
          id="btn-menu-back"
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

        <div className="stage-title-pill">Switch Menu Trainer</div>

        <button
          id="btn-reading-mode-toggle"
          type="button"
          role="switch"
          aria-checked={readingMode}
          className="reading-toggle"
          onClick={() => {
            soundEffects.playTileTap();
            setReadingMode((prev) => !prev);
          }}
        >
          <span>Reading Mode</span>
          <span className={`toggle-track ${readingMode ? 'toggle-track--on' : ''}`}>
            <span className="toggle-knob" />
          </span>
        </button>
      </div>

      {/* 4 Switch Pocket Tabs floating over the painted scene */}
      <div className="menu-trainer-body">
        <div className="deck-tabs" role="tablist" aria-label="Menu Trainer decks">
          {MENU_DECKS.map((deck) => {
            const active = deck.id === deckId;
            return (
              <button
                key={deck.id}
                id={`menu-deck-${deck.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                className={`deck-tab ${active ? 'deck-tab--active' : ''}`}
                style={active ? { borderBottomColor: deck.accentColor } : undefined}
                onClick={() => handleSelectDeck(deck.id)}
              >
                {deck.shortTitle}
              </button>
            );
          })}
        </div>

        {/* Prompt Banner */}
        <section
          className="switch-card"
          style={{
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            flexWrap: 'wrap',
            width: '100%',
            maxWidth: '940px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <EeveeAvatar
              size={66}
              mood={mood}
              equipped={progress.equippedAccessories}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                {round.target.statusTag && (
                  <span className={`status-pill status-pill--${round.target.statusTag}`}>
                    {round.target.statusTag}
                  </span>
                )}
                {round.target.elementType && (
                  <span className={`type-pill type-pill--${round.target.elementType}`}>
                    {round.target.elementType}
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
                  {readingMode ? 'Icons hidden — read the letters!' : 'Listen & tap the Switch button!'}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.14rem',
                  fontWeight: 700,
                }}
              >
                {coachText}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              id="btn-menu-replay-prompt"
              type="button"
              className="switch-cta switch-cta--blue"
              style={{ minHeight: '48px', padding: '8px 16px', fontSize: '0.95rem' }}
              onClick={() =>
                void speechEngine.speakMenuCard(
                  round.target.id,
                  'prompt',
                  round.target.prompt,
                )
              }
            >
              <SpeakerIcon size={18} />
              <span>Hear Again</span>
            </button>

            {!round.isSolved && (
              <button
                id="btn-menu-eevee-help"
                type="button"
                className="switch-cta switch-cta--caramel"
                style={{ minHeight: '48px', padding: '8px 16px', fontSize: '0.95rem' }}
                onClick={handleEeveeHelp}
              >
                <PawPrintIcon size={18} color="#FFFFFF" />
                <span>Eevee Help!</span>
              </button>
            )}
          </div>
        </section>

        {/* Switch Menu Grid & Blending Bar */}
        <section className="scene-bottom-drawer" style={{ maxWidth: '940px' }}>
          <div
            className={`menu-grid ${round.cards.length <= 4 ? 'menu-grid--two' : ''}`}
            role="group"
            aria-label="Nintendo Switch menu choices"
          >
            {round.cards.map((item) => {
              const isTarget = item.id === round.target.id;
              const hideIcon = readingMode && !(round.isSolved && isTarget);
              const highlight = (round.showBeacon && isTarget) || (round.isSolved && isTarget);

              return (
                <button
                  key={item.id}
                  id={`menu-card-${item.id}`}
                  type="button"
                  className={`menu-card-btn ${highlight ? 'switch-cursor-glow' : ''}`}
                  onClick={() => handleChooseCard(item.id)}
                >
                  <span
                    className="menu-card-btn__strip"
                    style={{ background: item.accentColor }}
                  />
                  <span className="menu-card-btn__icon">
                    <MenuCardIcon item={item} hidden={hideIcon} />
                  </span>
                  <span>
                    <span className="menu-card-btn__label">{item.label}</span>
                    {item.elementType && !hideIcon && (
                      <span
                        className={`type-pill type-pill--${item.elementType}`}
                        style={{ marginTop: '4px' }}
                      >
                        {item.elementType}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {round.isSolved && (
            <div
              style={{
                width: '100%',
                borderTop: '1.5px solid var(--border-soft)',
                paddingTop: '14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <PawSlideBlender
                units={round.target.units}
                focusWord={round.target.focusWord}
                displayWord={round.target.label}
                blendingStyle={progress.settings.blendingStyle}
                compact
                onBlendComplete={handleBlendComplete}
              />

              <button
                id="btn-menu-next-round"
                type="button"
                className="switch-cta switch-cta--blue"
                onClick={handleNextRound}
              >
                <span>{roundBlended ? 'Next Switch Prompt!' : 'Try Another Menu Word'}</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
