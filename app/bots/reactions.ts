// bots/reactions.ts — bot personality: emote/phrase reactions to big moments.
// Pure + seeded so sims stay deterministic. Tasteful by design: the reaction
// itself is gated (~55% of the time), and callers additionally rate-limit
// (max 1 reaction per 3 turns per bot).

import { mulberry32, type GameState } from '../engine';

export type BotReactionEvent = 'attack' | 'wild' | 'win';

export interface BotReaction {
  kind: 'emote' | 'phrase';
  /** Emoji for emotes; i18n key under t.social.* for phrases. */
  value: string;
}

const ATTACK_EMOTES = ['😂', '🔥', '😮'] as const;
const ATTACK_PHRASES = ['haha', 'oops'] as const;
const WILD_EMOTES = ['😮', '🎉'] as const;
const WILD_PHRASES = ['niceMove'] as const;
const WIN_EMOTES = ['🎉', '💯', '👏'] as const;
const WIN_PHRASES = ['wellPlayed', 'haha'] as const;

export function botReaction(
  _game: GameState,
  _playerId: string,
  event: BotReactionEvent,
  seed: number,
): BotReaction | null {
  const rng = mulberry32(seed);
  // Tasteful: don't react every single time, even when asked.
  if (rng() > 0.55) return null;
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const asEmote = rng() < 0.5;
  switch (event) {
    case 'attack':
      return asEmote
        ? { kind: 'emote', value: pick(ATTACK_EMOTES) }
        : { kind: 'phrase', value: pick(ATTACK_PHRASES) };
    case 'wild':
      return asEmote
        ? { kind: 'emote', value: pick(WILD_EMOTES) }
        : { kind: 'phrase', value: pick(WILD_PHRASES) };
    case 'win':
      return asEmote
        ? { kind: 'emote', value: pick(WIN_EMOTES) }
        : { kind: 'phrase', value: pick(WIN_PHRASES) };
  }
}
