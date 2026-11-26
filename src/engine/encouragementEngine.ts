import type { EeveeMood } from '../data/types';

export type EncouragementEvent =
  | 'welcome'
  | 'first-try-word'
  | 'perseverance-word'
  | 'help-used-word'
  | 'smooth-blend'
  | 'wrong-try-1'
  | 'wrong-try-2'
  | 'eevee-help-place'
  | 'battle-victory'
  | 'menu-correct'
  | 'dojo-swap'
  | 'badge-earned';

export interface EncouragementMessage {
  text: string;
  speech: string;
  eeveeMood: EeveeMood;
}

const BANK: Record<EncouragementEvent, readonly EncouragementMessage[]> = {
  welcome: [
    {
      text: 'Hi friend! Pick a Kanto town to spell and blend together!',
      speech: 'Hi friend! Pick a Kanto town to spell and blend together!',
      eeveeMood: 'happy',
    },
  ],
  'first-try-word': [
    {
      text: 'First try! Your ears heard every single sound!',
      speech: 'First try! Your ears heard every single sound! Now let\'s slide and blend!',
      eeveeMood: 'sparkle',
    },
    {
      text: 'Super spelling! You nailed it right away!',
      speech: 'Super spelling! You nailed it right away! Now slide Eevee\'s paw to blend!',
      eeveeMood: 'cheering',
    },
  ],
  'perseverance-word': [
    {
      text: 'You kept trying and got it! That\'s how great readers grow!',
      speech: 'You kept trying and got it! That is how great readers grow! Now let\'s blend!',
      eeveeMood: 'proud',
    },
    {
      text: 'Way to stick with it! You figured out the sound!',
      speech: 'Way to stick with it! You figured out the sound! Slide Eevee\'s paw to blend!',
      eeveeMood: 'happy',
    },
  ],
  'help-used-word': [
    {
      text: 'Great teamwork with Eevee! Now let\'s blend it together!',
      speech: 'Great teamwork with Eevee! Now let\'s slide and blend the sounds together!',
      eeveeMood: 'encouraging',
    },
  ],
  'smooth-blend': [
    {
      text: 'So smooth! You glued the sounds right into the word!',
      speech: 'So smooth! You glued the sounds right into the word!',
      eeveeMood: 'cheering',
    },
    {
      text: 'Awesome blending! Eevee is cheering for you!',
      speech: 'Awesome blending! Eevee is cheering for you!',
      eeveeMood: 'sparkle',
    },
  ],
  'wrong-try-1': [
    {
      text: 'Ooh, close! Listen closely to the sound and try another tile!',
      speech: 'Good try! Listen closely to the sound and try another tile!',
      eeveeMood: 'encouraging',
    },
  ],
  'wrong-try-2': [
    {
      text: 'Look for the glowing sparkle tile! You\'ve got this!',
      speech: 'Look for the glowing sparkle tile! You have got this!',
      eeveeMood: 'encouraging',
    },
  ],
  'eevee-help-place': [
    {
      text: 'Eevee popped that sound right in for you! Teamwork!',
      speech: 'Eevee popped that sound right in for you! Great teamwork!',
      eeveeMood: 'happy',
    },
  ],
  'battle-victory': [
    {
      text: 'You filled every Star Heart! What a Kanto Spelling Star!',
      speech: 'Hooray! You filled every Star Heart! What a Kanto Spelling Star!',
      eeveeMood: 'cheering',
    },
  ],
  'menu-correct': [
    {
      text: 'You read that Switch menu button like a real Pokémon Trainer!',
      speech: 'You read that Switch menu button like a real Pokémon Trainer! Now slide to blend it!',
      eeveeMood: 'proud',
    },
  ],
  'dojo-swap': [
    {
      text: 'One sound changed and made a brand-new word! Awesome!',
      speech: 'One sound changed and made a brand-new word! Slide to blend it!',
      eeveeMood: 'sparkle',
    },
  ],
  'badge-earned': [
    {
      text: 'You earned a shiny new Kanto Spelling Badge!',
      speech: 'Congratulations! You earned a shiny new Kanto Spelling Badge!',
      eeveeMood: 'cheering',
    },
  ],
};

export function getEncouragement(
  event: EncouragementEvent,
  seed: number = 0,
): EncouragementMessage {
  const options = BANK[event];
  const index = Math.abs(seed) % options.length;
  return options[index] ?? options[0]!;
}
