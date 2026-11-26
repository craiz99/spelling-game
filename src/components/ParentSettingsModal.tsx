import React, { useEffect, useState } from 'react';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine, type VoiceOption } from '../audio/speechEngine';
import { CURRICULUM_WORDS } from '../data/curriculum';
import type {
  BlendingStyle,
  LetterAudioMode,
  ParentSettings,
  PlayerProgress,
  ScaffoldMode,
  VoiceSpeed,
} from '../data/types';
import { SpeakerIcon } from './SwitchIcons';

interface ParentSettingsModalProps {
  progress: PlayerProgress;
  onUpdateSettings: (patch: Partial<ParentSettings>) => void;
  onResetAll: () => void;
  onClose: () => void;
}

export const ParentSettingsModal: React.FC<ParentSettingsModalProps> = ({
  progress,
  onUpdateSettings,
  onResetAll,
  onClose,
}) => {
  const { settings } = progress;
  const [voices, setVoices] = useState<VoiceOption[]>(() =>
    speechEngine.getAvailableVoices(),
  );
  const [confirmResetStep, setConfirmResetStep] = useState(false);
  const [diagTick, setDiagTick] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setVoices(speechEngine.getAvailableVoices());
      setDiagTick((t) => t + 1);
    };
    refresh();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
      return () => {
        window.speechSynthesis.removeEventListener?.('voiceschanged', refresh);
      };
    }
    return undefined;
  }, []);

  const masteredCount = CURRICULUM_WORDS.filter(
    (w) => progress.wordMastery[w.id]?.status === 'mastered',
  ).length;
  const learningCount = CURRICULUM_WORDS.filter(
    (w) => progress.wordMastery[w.id]?.status === 'learning',
  ).length;

  const diagnostics = speechEngine.getDiagnostics();
  void diagTick;

  const handleTestVoice = () => {
    soundEffects.unlock();
    soundEffects.playCorrectPop();
    void speechEngine.speak(
      'Hi friend! Let us blend the sounds in sun. sss ... suh ... sun!',
      { interrupt: false },
    );
    setDiagTick((t) => t + 1);
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Grown-Up Settings"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel" style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Grown-Up Settings &amp; Progress</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.84rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
              Tailored for a 5-year-old learning letter sounds and smooth blending
            </p>
          </div>
          <button
            id="btn-close-settings"
            type="button"
            className="switch-pill-btn"
            onClick={onClose}
          >
            Done
          </button>
        </div>

        {/* Scaffold Mode */}
        <div className="settings-group">
          <div style={{ fontWeight: 900, fontSize: '0.94rem' }}>
            Spelling Scaffold Mode
          </div>
          <div className="segmented-control">
            {(
              [
                ['auto', 'Auto-Adaptive'],
                ['extra-help', 'Extra Help (1 Blank)'],
                ['builder', 'Builder (2 Blanks)'],
                ['explorer', 'Explorer (All Blanks)'],
              ] as [ScaffoldMode, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={`seg-btn ${settings.scaffoldMode === val ? 'seg-btn--active' : ''}`}
                onClick={() => onUpdateSettings({ scaffoldMode: val })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Blending Style (Research-Backed Successive vs Continuous) */}
        <div className="settings-group">
          <div style={{ fontWeight: 900, fontSize: '0.94rem' }}>
            Paw-Slide Blending Style
          </div>
          <div className="segmented-control">
            {(
              [
                ['successive', '2-Step Successive (Recommended for Blending)'],
                ['continuous', 'Smooth Continuous'],
              ] as [BlendingStyle, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={`seg-btn ${settings.blendingStyle === val ? 'seg-btn--active' : ''}`}
                onClick={() => onUpdateSettings({ blendingStyle: val })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Guidance Configuration */}
        <div className="settings-group">
          <div className="settings-row">
            <span style={{ fontWeight: 900, fontSize: '0.94rem' }}>
              Voice Guidance &amp; Audio
            </span>
            <button
              id="btn-test-voice"
              type="button"
              className="seg-btn seg-btn--active"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={handleTestVoice}
            >
              <SpeakerIcon size={16} color="#FFFFFF" />
              <span>Test Voice &amp; Chimes</span>
            </button>
          </div>

          <div
            data-testid="audio-diagnostics"
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--ink-secondary)',
              background: '#ffffff',
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-soft)',
            }}
          >
            Speech API: {diagnostics.speechSupported ? 'Ready' : 'Unavailable'} · Voices detected:{' '}
            {diagnostics.voiceCount} · Active voice: {diagnostics.activeVoiceName}
          </div>

          <div className="settings-row">
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--ink-secondary)' }}>
              Letter Audio
            </span>
            <div className="segmented-control">
              {(
                [
                  ['phonics', 'Pure Phonics Sounds'],
                  ['names-and-sounds', 'Letter Names + Sounds'],
                ] as [LetterAudioMode, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`seg-btn ${settings.letterAudioMode === val ? 'seg-btn--active' : ''}`}
                  onClick={() => onUpdateSettings({ letterAudioMode: val })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-row">
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--ink-secondary)' }}>
              Voice Speed
            </span>
            <div className="segmented-control">
              {(
                [
                  ['slow', 'Slow & Clear'],
                  ['normal', 'Normal'],
                ] as [VoiceSpeed, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`seg-btn ${settings.voiceSpeed === val ? 'seg-btn--active' : ''}`}
                  onClick={() => onUpdateSettings({ voiceSpeed: val })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {voices.length > 0 && (
            <div className="settings-row">
              <label
                htmlFor="voice-picker-select"
                style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--ink-secondary)' }}
              >
                Preferred Voice
              </label>
              <select
                id="voice-picker-select"
                value={settings.preferredVoiceUri}
                onChange={(e) =>
                  onUpdateSettings({ preferredVoiceUri: e.target.value })
                }
                style={{
                  minHeight: '40px',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--border-medium)',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  maxWidth: '280px',
                }}
              >
                <option value="">Auto-Select Clearest Voice</option>
                {voices.map((v) => (
                  <option key={v.uri} value={v.uri}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="settings-row">
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
              <input
                type="checkbox"
                checked={settings.voiceEnabled}
                onChange={(e) =>
                  onUpdateSettings({ voiceEnabled: e.target.checked })
                }
              />
              Voice Guidance On
            </label>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
              <input
                type="checkbox"
                checked={settings.chimesEnabled}
                onChange={(e) =>
                  onUpdateSettings({ chimesEnabled: e.target.checked })
                }
              />
              Gentle Chimes &amp; Fanfares On
            </label>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
              <input
                id="toggle-unlock-all-zones"
                type="checkbox"
                checked={settings.unlockAllZones}
                onChange={(e) =>
                  onUpdateSettings({ unlockAllZones: e.target.checked })
                }
              />
              Unlock All 6 Zones
            </label>
          </div>
        </div>

        {/* Word & Letter Mastery Summary */}
        <div className="settings-group">
          <div style={{ fontWeight: 900, fontSize: '0.94rem' }}>
            Learning Progress Summary
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '10px',
              textAlign: 'center',
            }}
          >
            <div className="switch-card" style={{ padding: '10px', borderRadius: '14px' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#2C98F0' }}>
                {progress.masteredLetters.length}/26
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
                A–Z Letters
              </div>
            </div>
            <div className="switch-card" style={{ padding: '10px', borderRadius: '14px' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#15803D' }}>
                {masteredCount}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
                Mastered
              </div>
            </div>
            <div className="switch-card" style={{ padding: '10px', borderRadius: '14px' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#C78D4E' }}>
                {learningCount + progress.totalBlends}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
                Practice Steps
              </div>
            </div>
            <div className="switch-card" style={{ padding: '10px', borderRadius: '14px' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#B45309' }}>
                {progress.earnedBadges.length}/8
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
                Badges
              </div>
            </div>
          </div>
        </div>

        {/* 2-Step Reset */}
        <div className="settings-row" style={{ paddingTop: '4px' }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
            Progress saves automatically on this device.
          </span>
          {!confirmResetStep ? (
            <button
              id="btn-reset-step-1"
              type="button"
              className="seg-btn"
              style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
              onClick={() => setConfirmResetStep(true)}
            >
              Reset Progress
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="seg-btn"
                onClick={() => setConfirmResetStep(false)}
              >
                Cancel
              </button>
              <button
                id="btn-reset-step-2"
                type="button"
                className="seg-btn"
                style={{ background: '#DC2626', color: '#FFFFFF', borderColor: '#DC2626' }}
                onClick={() => {
                  setConfirmResetStep(false);
                  onResetAll();
                }}
              >
                Yes, Reset Everything
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
