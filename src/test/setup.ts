import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
  Object.defineProperty(window, 'speechSynthesis', {
    writable: true,
    value: {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
      onvoiceschanged: null,
    },
  });
}

if (typeof globalThis.SpeechSynthesisUtterance === 'undefined') {
  class MockUtterance {
    text: string;
    lang = 'en-US';
    rate = 1;
    pitch = 1;
    volume = 1;
    voice: SpeechSynthesisVoice | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;

    constructor(text: string) {
      this.text = text;
    }
  }
  (globalThis as unknown as { SpeechSynthesisUtterance: typeof MockUtterance }).SpeechSynthesisUtterance =
    MockUtterance;
}
