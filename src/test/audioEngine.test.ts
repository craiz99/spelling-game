import { afterEach, describe, expect, it, vi } from 'vitest';
import { soundEffects } from '../audio/soundEffects';
import { speechEngine } from '../audio/speechEngine';

describe('Bulletproof Audio & Voice Engine', () => {
  const originalSynth = window.speechSynthesis;

  afterEach(() => {
    (window as unknown as { speechSynthesis: SpeechSynthesis }).speechSynthesis = originalSynth;
    vi.restoreAllMocks();
  });

  it('reports Speech API diagnostics cleanly without throwing', () => {
    const diag = speechEngine.getDiagnostics();
    expect(typeof diag.speechSupported).toBe('boolean');
    expect(typeof diag.voiceCount).toBe('number');
    expect(typeof diag.activeVoiceName).toBe('string');
  });

  it('does not call speechSynthesis.cancel() synchronously before speaking on a fresh idle queue', async () => {
    const speakMock = vi.fn((utt: { onend?: () => void }) => {
      setTimeout(() => utt.onend?.(), 5);
    });
    const cancelMock = vi.fn();
    const resumeMock = vi.fn();

    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = {
      speaking: false,
      pending: false,
      paused: true,
      speak: speakMock,
      cancel: cancelMock,
      resume: resumeMock,
      getVoices: () => [],
    };

    await speechEngine.speak('Hello Eevee!');
    expect(cancelMock).not.toHaveBeenCalled();
    expect(resumeMock).toHaveBeenCalled();
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it('safely unlocks and triggers Web Audio sound effects without throwing in headless/jsdom', () => {
    expect(() => {
      soundEffects.unlock();
      soundEffects.playCorrectPop();
      soundEffects.playPokeBallThrow();
      soundEffects.playCatchSuccess();
      soundEffects.playVictoryFanfare();
    }).not.toThrow();
  });
});
