// bots/personas.ts — bot identities. Names with personality: the table should
// feel alive, not like playing a spreadsheet. Difficulty skews easy/medium so
// new players win sometimes (retention), hard bots are the rare sharks.

import type { BotDifficulty } from './index';

export interface BotPersona {
  name: string;
  tagline: string;
  difficulty: BotDifficulty;
  /** Emoji avatar shown on the seat instead of an initial. */
  avatar: string;
}

export const BOT_PERSONAS: BotPersona[] = [
  { name: 'Falcon', tagline: 'Strikes fast, never bluffs.', difficulty: 'hard', avatar: '🦅' },
  { name: 'Sahara', tagline: 'Patient as the desert.', difficulty: 'medium', avatar: '🏜️' },
  { name: 'Mirage', tagline: 'You saw what you wanted to see.', difficulty: 'medium', avatar: '🌫️' },
  { name: 'Dune', tagline: 'Shifts when you least expect it.', difficulty: 'easy', avatar: '⛰️' },
  { name: 'Oasis', tagline: 'Everyone’s favorite stop.', difficulty: 'easy', avatar: '🌴' },
  { name: 'Zephyr', tagline: 'Gone before you notice.', difficulty: 'medium', avatar: '💨' },
  { name: 'Ember', tagline: 'Plays with fire.', difficulty: 'medium', avatar: '🔥' },
  { name: 'Nomad', tagline: 'No table is home.', difficulty: 'easy', avatar: '🧭' },
  { name: 'Sirocco', tagline: 'A hot wind of bad decisions — yours.', difficulty: 'hard', avatar: '🌪️' },
  { name: 'Caravan', tagline: 'Brings the whole crew.', difficulty: 'easy', avatar: '🐪' },
  { name: 'Anubis', tagline: 'Weighs your heart against a feather.', difficulty: 'hard', avatar: '🐺' },
  { name: 'Simba', tagline: 'Still learning the savanna.', difficulty: 'easy', avatar: '🦁' },
];

/** Deterministic persona for a seat — stable across reconnects. */
export function personaForSeat(seat: number): BotPersona {
  return BOT_PERSONAS[seat % BOT_PERSONAS.length];
}

/** Look up a persona's avatar by bot name (for seats). Falls back to 🎴. */
export function avatarForName(name: string): string {
  return BOT_PERSONAS.find((p) => p.name === name)?.avatar ?? '🎴';
}
