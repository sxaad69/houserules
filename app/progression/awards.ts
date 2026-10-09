// progression/awards.ts — XP award rules. Pure functions; the TableScreen
// applies them via useProgression().addXp() on game over.

export const XP_PER_GAME = 10;
export const XP_PER_WIN = 25;

/** Total XP for a finished game. */
export function xpForGame(won: boolean): number {
  return XP_PER_GAME + (won ? XP_PER_WIN : 0);
}
