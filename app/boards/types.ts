// boards/types.ts — leaderboard domain. Spec §9.
//
// Halal guardrails (locked, spec §8): boards rank by XP and cosmetic tier
// only. Never by coins, never by money won. Winners earn ranks, not payouts.

/** One row on a leaderboard. */
export interface BoardEntry {
  playerId: string;
  name: string;
  /** Experience points — the only ranking signal. */
  xp: number;
  /** Cosmetic status tier (Rookie → Legend). Flavor only, never monetary. */
  tier: string;
  /** Emoji avatar. */
  avatar: string;
  isVip: boolean;
  isBot?: boolean;
  /** Rounds won — status flavor. Wins pay XP/ranks, never coins (spec §8). */
  roundsWon: number;
  /** Set at render time for the local player. */
  isCurrent?: boolean;
}

export type BoardKind = 'public' | 'vip';

/** Identity of the local player, from the session store. */
export interface CurrentPlayer {
  playerId: string;
  displayName: string;
  vip: boolean;
}
