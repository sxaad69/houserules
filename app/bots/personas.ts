// bots/personas.ts — bot identities. Names with personality: the table should
// feel alive, not like playing a spreadsheet. Difficulty skews easy/medium so
// new players win sometimes (retention), hard bots are the rare sharks.

import type { BotDifficulty } from './index';

export interface BotPersona {
  name: string;
  tagline: string;
  difficulty: BotDifficulty;
}

export const BOT_PERSONAS: BotPersona[] = [
  { name: 'Falcon', tagline: 'Strikes fast, never bluffs.', difficulty: 'hard' },
  { name: 'Sahara', tagline: 'Patient as the desert.', difficulty: 'medium' },
  { name: 'Mirage', tagline: 'You saw what you wanted to see.', difficulty: 'medium' },
  { name: 'Dune', tagline: 'Shifts when you least expect it.', difficulty: 'easy' },
  { name: 'Oasis', tagline: 'Everyone’s favorite stop.', difficulty: 'easy' },
  { name: 'Zephyr', tagline: 'Gone before you notice.', difficulty: 'medium' },
  { name: 'Ember', tagline: 'Plays with fire.', difficulty: 'medium' },
  { name: 'Nomad', tagline: 'No table is home.', difficulty: 'easy' },
  { name: 'Sirocco', tagline: 'A hot wind of bad decisions — yours.', difficulty: 'hard' },
  { name: 'Caravan', tagline: 'Brings the whole crew.', difficulty: 'easy' },
  { name: 'Anubis', tagline: 'Weighs your heart against a feather.', difficulty: 'hard' },
  { name: 'Simba', tagline: 'Still learning the savanna.', difficulty: 'easy' },
];

/** Deterministic persona for a seat — stable across reconnects. */
export function personaForSeat(seat: number): BotPersona {
  return BOT_PERSONAS[seat % BOT_PERSONAS.length];
}
