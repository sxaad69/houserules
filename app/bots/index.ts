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
export { botReaction, type BotReaction, type BotReactionEvent } from './reactions';

import { personaForSeat, randomBotName } from './personas';
import { mulberry32 } from '../engine';

/** Simple string hash for seeding. */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic bot identity for a seat — stable across reconnects. */
export function botForSeat(tableId: string, seat: number): BotPlayer {
  const persona = personaForSeat(seat);
  // Seeded by table+seat: same table always gets the same fun name,
  // but different tables get variety.
  const rng = mulberry32(hashStr(`${tableId}:${seat}`));
  return {
    id: `bot:${tableId}:${seat}`,
    name: randomBotName(persona, rng),
    tagline: persona.tagline,
    difficulty: persona.difficulty,
    title: null,
  };
}
