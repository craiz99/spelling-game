import React, { useCallback, useEffect, useState } from 'react';
import { soundEffects } from './audio/soundEffects';
import { speechEngine } from './audio/speechEngine';
import type {
  AccessoryDef,
  BadgeDef,
  MapNodeId,
  ParentSettings,
  PartnerMoveId,
  PlayerProgress,
  ZoneId,
} from './data/types';
import type { BattleState } from './engine/battleEngine';
import {
  loadProgress,
  recordWordAttempt,
  resetProgress,
  saveProgress,
} from './engine/masteryTracker';
import {
  evaluateNewBadges,
  getHighestUnlockedMove,
} from './engine/milestoneEngine';
import { BadgeCeremonyModal } from './components/BadgeCeremonyModal';
import { BattleScreen } from './components/BattleScreen';
import { BlendingDojoScreen } from './components/BlendingDojoScreen';
import { EeveeClosetModal } from './components/EeveeClosetModal';
import { KantoOverworldMap } from './components/KantoOverworldMap';
import { MenuTrainerScreen } from './components/MenuTrainerScreen';
import { ParentSettingsModal } from './components/ParentSettingsModal';
import { StickerBookModal } from './components/StickerBookModal';
import { TopHud } from './components/TopHud';
import { WelcomeOverlay } from './components/WelcomeOverlay';

type ActiveScreen =
  | { type: 'home' }
  | { type: 'battle'; zoneId: ZoneId }
  | { type: 'menu-trainer' }
  | { type: 'blending-dojo' };

export interface AppProps {
  /** Optional prop for tests to skip the audio-unlock welcome card */
  skipWelcome?: boolean;
}

export const App: React.FC<AppProps> = ({ skipWelcome = false }) => {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [screen, setScreen] = useState<ActiveScreen>({ type: 'home' });
  const [showWelcome, setShowWelcome] = useState<boolean>(!skipWelcome);
  const [openModal, setOpenModal] = useState<'none' | 'sticker-book' | 'closet' | 'settings'>('none');
  const [badgeQueue, setBadgeQueue] = useState<BadgeDef[]>([]);

  useEffect(() => {
    soundEffects.setEnabled(progress.settings.chimesEnabled);
    speechEngine.configure({
      enabled: progress.settings.voiceEnabled,
      speed: progress.settings.voiceSpeed,
      preferredVoiceUri: progress.settings.preferredVoiceUri,
    });
    saveProgress(progress);
  }, [progress]);

  const applyProgressUpdate = useCallback(
    (updater: (prev: PlayerProgress) => PlayerProgress) => {
      setProgress((prev) => {
        const updated = updater(prev);
        const newlyEarned = evaluateNewBadges(updated);
        if (newlyEarned.length === 0) return updated;

        setBadgeQueue((q) => [...q, ...newlyEarned]);
        return {
          ...updated,
          earnedBadges: [
            ...updated.earnedBadges,
            ...newlyEarned.map((b) => b.id),
          ],
        };
      });
    },
    [],
  );

  const handleArriveNode = useCallback((nodeId: MapNodeId) => {
    setProgress((prev) => ({
      ...prev,
      currentMapNodeId: nodeId,
    }));
  }, []);

  const handleRecordWord = useCallback(
    (wordId: string, meta: { usedHelp: boolean; wrongAttempts: number }) => {
      applyProgressUpdate((prev) => recordWordAttempt(prev, wordId, meta));
    },
    [applyProgressUpdate],
  );

  const handleBlendDone = useCallback(() => {
    applyProgressUpdate((prev) => ({
      ...prev,
      totalBlends: prev.totalBlends + 1,
    }));
  }, [applyProgressUpdate]);

  const handleBattleComplete = useCallback(
    (battle: BattleState) => {
      applyProgressUpdate((prev) => {
        const nextStars = prev.totalStars + battle.totalStarsEarned;
        const nextCompletedZones = prev.completedZones.includes(battle.zoneId)
          ? prev.completedZones
          : [...prev.completedZones, battle.zoneId];
        const nextPokemon = Array.from(
          new Set([...prev.caughtPokemonIds, ...battle.caughtPokemonIds]),
        );
        const highestMove = getHighestUnlockedMove(nextStars);

        return {
          ...prev,
          totalStars: nextStars,
          battlesWon: prev.battlesWon + 1,
          bagItemsCount: prev.bagItemsCount + battle.bagItemsEarned,
          completedZones: nextCompletedZones,
          caughtPokemonIds: nextPokemon,
          selectedMoveId: highestMove.id,
        };
      });
    },
    [applyProgressUpdate],
  );

  const handleMenuWin = useCallback(() => {
    applyProgressUpdate((prev) => ({
      ...prev,
      totalStars: prev.totalStars + 1,
      menuTrainerWins: prev.menuTrainerWins + 1,
    }));
  }, [applyProgressUpdate]);

  const handleChainComplete = useCallback(
    (chainId: string) => {
      applyProgressUpdate((prev) => ({
        ...prev,
        totalStars: prev.totalStars + 3,
        completedChains: prev.completedChains.includes(chainId)
          ? prev.completedChains
          : [...prev.completedChains, chainId],
      }));
    },
    [applyProgressUpdate],
  );

  const handleToggleAccessory = useCallback((acc: AccessoryDef) => {
    setProgress((prev) => {
      const currentlyOn = prev.equippedAccessories[acc.slot] === acc.id;
      return {
        ...prev,
        equippedAccessories: {
          ...prev.equippedAccessories,
          [acc.slot]: currentlyOn ? null : acc.id,
        },
      };
    });
  }, []);

  const handleSelectMove = useCallback((moveId: PartnerMoveId) => {
    setProgress((prev) => ({
      ...prev,
      selectedMoveId: moveId,
    }));
  }, []);

  const handleUpdateSettings = useCallback((patch: Partial<ParentSettings>) => {
    setProgress((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...patch,
      },
    }));
  }, []);

  const handleToggleMute = useCallback(() => {
    setProgress((prev) => {
      const mutedNow = !prev.settings.voiceEnabled && !prev.settings.chimesEnabled;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          voiceEnabled: mutedNow,
          chimesEnabled: mutedNow,
        },
      };
    });
  }, []);

  const handleResetAll = useCallback(() => {
    speechEngine.stop();
    const fresh = resetProgress();
    setProgress(fresh);
    setBadgeQueue([]);
    setScreen({ type: 'home' });
    setOpenModal('none');
  }, []);

  const activeBadge = badgeQueue[0] ?? null;
  const voiceMuted = !progress.settings.voiceEnabled && !progress.settings.chimesEnabled;

  return (
    <div className="game-root">
      <TopHud
        totalStars={progress.totalStars}
        bagItemsCount={progress.bagItemsCount}
        voiceMuted={voiceMuted}
        onOpenStickerBook={() => setOpenModal('sticker-book')}
        onOpenCloset={() => setOpenModal('closet')}
        onToggleMute={handleToggleMute}
        onOpenSettings={() => setOpenModal('settings')}
      />

      {screen.type === 'home' && (
        <KantoOverworldMap
          progress={progress}
          onArriveNode={handleArriveNode}
          onEnterZone={(zoneId) => setScreen({ type: 'battle', zoneId })}
          onOpenMenuTrainer={() => setScreen({ type: 'menu-trainer' })}
          onOpenBlendingDojo={() => setScreen({ type: 'blending-dojo' })}
        />
      )}

      {screen.type === 'battle' && (
        <BattleScreen
          zoneId={screen.zoneId}
          progress={progress}
          onRecordWord={handleRecordWord}
          onBlendDone={handleBlendDone}
          onBattleComplete={handleBattleComplete}
          onExit={() => setScreen({ type: 'home' })}
        />
      )}

      {screen.type === 'menu-trainer' && (
        <MenuTrainerScreen
          progress={progress}
          onMenuWin={handleMenuWin}
          onBlendDone={handleBlendDone}
          onExit={() => setScreen({ type: 'home' })}
        />
      )}

      {screen.type === 'blending-dojo' && (
        <BlendingDojoScreen
          progress={progress}
          onBlendDone={handleBlendDone}
          onChainComplete={handleChainComplete}
          onExit={() => setScreen({ type: 'home' })}
        />
      )}

      {showWelcome && (
        <WelcomeOverlay
          equipped={progress.equippedAccessories}
          onStart={() => setShowWelcome(false)}
        />
      )}

      {openModal === 'sticker-book' && (
        <StickerBookModal
          progress={progress}
          onClose={() => setOpenModal('none')}
        />
      )}

      {openModal === 'closet' && (
        <EeveeClosetModal
          progress={progress}
          onToggleAccessory={handleToggleAccessory}
          onSelectMove={handleSelectMove}
          onClose={() => setOpenModal('none')}
        />
      )}

      {openModal === 'settings' && (
        <ParentSettingsModal
          progress={progress}
          onUpdateSettings={handleUpdateSettings}
          onResetAll={handleResetAll}
          onClose={() => setOpenModal('none')}
        />
      )}

      {activeBadge && !showWelcome && (
        <BadgeCeremonyModal
          badge={activeBadge}
          onDismiss={() => setBadgeQueue((q) => q.slice(1))}
        />
      )}
    </div>
  );
};

export default App;
