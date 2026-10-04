// bots/ — AI opponents (spec: the day-one experience; non-negotiable).
// Bots fill house tables, backfill quick-match seats, and cover drops.

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface BotPlayer {
  id: string; // "bot:<tableId>:<seat>"
  name: string;
  tagline: string;
  difficulty: BotDifficulty;
  /** Animal title the bot flaunts, if any. */
  title: string | null;
}

export { BOT_PERSONAS, personaForSeat, type BotPersona } from './personas';
export { chooseAction, playBotTurn } from './strategy';

import { personaForSeat } from './personas';

/** Deterministic bot identity for a seat — stable across reconnects. */
export function botForSeat(tableId: string, seat: number): BotPlayer {
  const persona = personaForSeat(seat);
  return {
    id: `bot:${tableId}:${seat}`,
    name: persona.name,
    tagline: persona.tagline,
    difficulty: persona.difficulty,
    title: null,
  };
}
