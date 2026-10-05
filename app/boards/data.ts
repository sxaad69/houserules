// boards/data.ts — local leaderboard data + the backend seam.
//
// v1 ships with seeded local data. When the Supabase backend lands,
// replace the body of `fetchLeaderboard` with a Supabase query — the
// signature stays the same and every screen keeps working.

import { BOT_PERSONAS } from '../bots/personas';
import type { BoardEntry, BoardKind, CurrentPlayer } from './types';

// ---------------------------------------------------------------------------
// Tiers — cosmetic status ladder, XP thresholds. Never monetary.
// ---------------------------------------------------------------------------

const TIERS: { min: number; tier: string }[] = [
  { min: 12000, tier: 'Legend' },
  { min: 9000, tier: 'Master' },
  { min: 6500, tier: 'Expert' },
  { min: 4000, tier: 'Skilled' },
  { min: 2000, tier: 'Regular' },
  { min: 0, tier: 'Rookie' },
];

export function tierForXp(xp: number): string {
  return TIERS.find((t) => xp >= t.min)?.tier ?? 'Rookie';
}

// ---------------------------------------------------------------------------
// Seed roster — fictional players (Arabic + English names) plus house bot
// personas. Bot personas double as leaderboard entries so the boards feel
// alive from day one.
// ---------------------------------------------------------------------------

interface Seed {
  name: string;
  avatar: string;
  xp: number;
  roundsWon: number;
  isVip: boolean;
  isBot?: boolean;
}

const HUMAN_SEEDS: Seed[] = [
  { name: 'Layla', avatar: '🌙', xp: 11800, roundsWon: 214, isVip: true },
  { name: 'Omar', avatar: '🦊', xp: 9600, roundsWon: 178, isVip: false },
  { name: 'ياسمين', avatar: '🌸', xp: 8300, roundsWon: 149, isVip: true },
  { name: 'Kareem', avatar: '🐯', xp: 7100, roundsWon: 121, isVip: false },
  { name: 'نور', avatar: '⭐', xp: 5900, roundsWon: 98, isVip: false },
  { name: 'Tariq', avatar: '🦈', xp: 4600, roundsWon: 74, isVip: true },
  { name: 'Salma', avatar: '🦋', xp: 3400, roundsWon: 52, isVip: false },
  { name: 'حسن', avatar: '🐢', xp: 2100, roundsWon: 31, isVip: false },
];

// Bot personas reused as board entries — XP scaled to feel competitive
// without dominating the human seeds.
const BOT_SEEDS: Seed[] = [
  'Falcon',
  'Sirocco',
  'Anubis',
  'Sahara',
  'Mirage',
  'Ember',
  'Zephyr',
  'Oasis',
].map((personaName, i) => {
  const persona = BOT_PERSONAS.find((p) => p.name === personaName)!;
  const xp = 14200 - i * 1500;
  return {
    name: persona.name,
    avatar: persona.avatar,
    xp,
    roundsWon: Math.round(xp / 55),
    isVip: i % 3 === 0,
    isBot: true,
  };
});

const SEEDS: Seed[] = [...BOT_SEEDS, ...HUMAN_SEEDS];

function toEntry(seed: Seed, index: number): BoardEntry {
  return {
    playerId: `seed-${index}`,
    name: seed.name,
    xp: seed.xp,
    tier: tierForXp(seed.xp),
    avatar: seed.avatar,
    isVip: seed.isVip,
    isBot: seed.isBot,
    roundsWon: seed.roundsWon,
  };
}

// ---------------------------------------------------------------------------
// Backend seam.
// ---------------------------------------------------------------------------

/** Starting XP for a brand-new local player. */
export const NEW_PLAYER_XP = 950;

/**
 * Fetch a leaderboard, sorted by XP descending.
 *
 * v1: local seed data + the current player inserted at their rank.
 * Later: replace the seed read with a Supabase query ordered by XP —
 * signature unchanged.
 */
export async function fetchLeaderboard(
  kind: BoardKind,
  current?: CurrentPlayer,
): Promise<BoardEntry[]> {
  // Simulate the async boundary a real backend would have.
  await Promise.resolve();

  let entries = SEEDS.map(toEntry);

  if (kind === 'vip') {
    entries = entries.filter((e) => e.isVip);
  }

  if (current?.playerId) {
    const alreadyListed = entries.some((e) => e.playerId === current.playerId);
    if (!alreadyListed && (kind === 'public' || current.vip)) {
      entries.push({
        playerId: current.playerId,
        name: current.displayName,
        xp: NEW_PLAYER_XP,
        tier: tierForXp(NEW_PLAYER_XP),
        avatar: '🎮',
        isVip: current.vip,
        roundsWon: 0,
        isCurrent: true,
      });
    }
  }

  return entries.sort((a, b) => b.xp - a.xp);
}
