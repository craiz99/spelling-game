# Let's Go, Spell with Eevee!

A bright, tablet-first Nintendo Switch *Pokémon: Let's Go, Eevee!*–inspired spelling and reading mini-RPG built for a 5-year-old learning letter sounds and smooth sound blending.

**Live GitHub Pages App:** `https://craiz99.github.io/spelling-game/`

## Highlights

- **Research-Backed Blending Pedagogy:**
  - **2-Step Successive Blending** (default) glues the first two sounds into one chunk (`S+U → "suuu"`) before adding the final sound (`"SUN!"`) to reduce working-memory load, plus **Smooth Continuous Blending** mode.
  - **Continuant-First Progression:** Zone 1 opens with 2-sound VC/CV words (`GO`, `NO`, `IN`, `ON`, `UP`, `ME`) and stretchable consonants (`s, m, f, n, r, l`) before stop consonants.
  - **Real-World Literacy First + *Let's Go, Eevee!* Bridge:** Over 75% high-utility everyday kindergarten/1st-grade words and essential Heart Words (`THE`, `YOU`, `GOOD`, `FRIEND`), alongside real *Let's Go, Eevee!* Switch menus, items, curatives, basic attacks, and favorite Kanto Pokémon.
  - **3-Tier Always-Winnable Safety Net:** Starter 1-blank scaffolding on new words, mirror-confusion distractor suppression (`B/D`, `P/Q`, `M/W`, `N/U`, `S/Z`) in Zones 1–2, gentle point-of-error voice coaching, 6.5s idle sparkle beacon + ghost letter, and **Eevee Help!** anytime. Zero timers and zero Game Over screens.
- **4-Layer Voice Guidance:** Natural OS/browser voice ranking + Grown-Up Voice Picker & Tester, schwa-minimal phoneme cues, connected CV blending narration, procedural Web Audio chimes/fanfares (zero external audio files), and a 1-tap iPad Safari audio unlock screen.
- **4 Game Modes & Rewards:** 6 Kanto Zones (72 words), 4-Deck Switch Menu Trainer (with Reading Mode), Eevee's Blending Dojo (6 Orton-Gillingham single-sound word chains), 8 Kanto Spelling Badges, 6 Dress-Up Closet Accessories, 7 Unlockable Partner Moves, Trainer Sticker Book, and hold-to-open Grown-Up Settings.

## Development

```bash
npm install
npm run dev
npm run typecheck
npm test
VITE_BASE_PATH=/spelling-game/ npm run build
```