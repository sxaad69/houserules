import AsyncStorage from '@react-native-async-storage/async-storage';

// rivalry.ts — head-to-head records vs bots for Quick Play tables.
// Keyed by bot display name: { [botName]: { wins, losses } }
// wins = games the HUMAN won against this bot; losses = games the bot won.

export const RIVALRY_KEY = '@houserules:rivalry/v1';

export interface RivalryRecord {
  wins: number;
  losses: number;
}

export type RivalryMap = Record<string, RivalryRecord>;

export async function loadRivalry(): Promise<RivalryMap> {
  try {
    const raw = await AsyncStorage.getItem(RIVALRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: RivalryMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      const r = v as Partial<RivalryRecord>;
      if (typeof r.wins === 'number' && typeof r.losses === 'number') {
        clean[k] = { wins: Math.max(0, Math.floor(r.wins)), losses: Math.max(0, Math.floor(r.losses)) };
      }
    }
    return clean;
  } catch {
    return {};
  }
}

/**
 * Record a finished game. `bots` = bot display names at the table,
 * `winnerName` = display name of the winner, `humanName` = human display name.
 * A human win counts as a win vs every bot; a bot win counts vs that bot only.
 */
export async function recordRivalry(
  bots: string[],
  winnerName: string,
  humanName: string,
): Promise<RivalryMap> {
  const map = await loadRivalry();
  const humanWon = winnerName === humanName;
  for (const bot of bots) {
    const rec = map[bot] ?? { wins: 0, losses: 0 };
    if (humanWon) {
      map[bot] = { ...rec, wins: rec.wins + 1 };
    } else if (bot === winnerName) {
      map[bot] = { ...rec, losses: rec.losses + 1 };
    }
  }
  AsyncStorage.setItem(RIVALRY_KEY, JSON.stringify(map)).catch(() => {});
  return map;
}
