// bots/strategy.ts — move selection for the three difficulties (spec: the
// day-one experience). All public info only: hand sizes, discard pile, own
// hand. No peeking at hidden hands — the day a bot "knows" your cards, trust dies.

import {
  applyAction,
  cardPoints,
  currentPlayer,
  declarableColors,
  legalPlays,
  matchColor,
  mulberry32,
  type Action,
  type Card,
  type GameState,
} from '../engine';
import type { BotDifficulty } from './index';

export interface StrategyOpts {
  rng?: () => number;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function isActionCard(c: Card): boolean {
  return c.action === 'skip' || c.action === 'reverse' || c.action === 'draw2';
}

function isWild(c: Card): boolean {
  return c.action === 'wild' || c.action === 'wild4';
}

/** Wild color choice: the color the bot holds most of. */
function bestColor(hand: Card[], deckKind: GameState['deckKind'], rng: () => number): string {
  const counts = new Map<string, number>();
  for (const c of hand) {
    const col = matchColor(c);
    if (col) counts.set(col, (counts.get(col) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = -1;
  for (const [col, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = col;
    }
  }
  return best ?? pick(declarableColors(deckKind), rng);
}

function toPlayAction(state: GameState, playerId: string, card: Card, rng: () => number): Action {
  if (!isWild(card)) return { type: 'play', playerId, cardId: card.id };
  const me = state.players.find((p) => p.id === playerId);
  return {
    type: 'play',
    playerId,
    cardId: card.id,
    declaredColor: bestColor(me?.hand ?? [], state.deckKind, rng),
  };
}

/** The most dangerous opponent: fewest cards in hand. */
function leaderThreat(state: GameState, playerId: string): string | null {
  let leader: string | null = null;
  let fewest = Infinity;
  for (const p of state.players) {
    if (p.id === playerId) continue;
    if (p.hand.length < fewest) {
      fewest = p.hand.length;
      leader = p.id;
    }
  }
  return leader;
}

function nextPlayerId(state: GameState): string {
  const n = state.players.length;
  const idx = (((state.turn + state.direction) % n) + n) % n;
  return state.players[idx].id;
}

function easyMove(state: GameState, playerId: string, rng: () => number): Action {
  const legal = legalPlays(state, playerId);
  if (legal.length === 0) return { type: 'draw', playerId };
  return toPlayAction(state, playerId, pick(legal, rng), rng);
}

function mediumMove(state: GameState, playerId: string, rng: () => number): Action {
  const legal = legalPlays(state, playerId);
  if (legal.length === 0) return { type: 'draw', playerId };
  if (legal.length === 1) return toPlayAction(state, playerId, legal[0], rng);

  const me = state.players.find((p) => p.id === playerId);
  const handSize = me?.hand.length ?? 99;
  const pointsRace = state.template === 'pointsRace';

  // Someone about to go out? Spend disruption now.
  const danger = state.players.some((p) => p.id !== playerId && p.hand.length <= 2);
  const actions = legal.filter(isActionCard);
  if (danger && actions.length > 0) {
    // draw2 hurts most, then skip, then reverse.
    const rank = { draw2: 0, skip: 1, reverse: 2 } as const;
    const sorted = actions.slice().sort((a, b) => rank[a.action as keyof typeof rank] - rank[b.action as keyof typeof rank]);
    return toPlayAction(state, playerId, sorted[0], rng);
  }

  const plain = legal.filter((c) => !isActionCard(c) && !isWild(c));
  const pool = plain.length > 0 ? plain : legal.filter((c) => !isWild(c));
  const candidates = pool.length > 0 ? pool : legal; // only wilds left → burn one

  // ponytail: one ordering rule covers both templates — pointsRace sheds
  // high cards first, shedding dumps action cards before they get stuck.
  candidates.sort((a, b) => {
    const sa = pointsRace ? cardPoints(a) : isActionCard(a) ? 10 : cardPoints(a);
    const sb = pointsRace ? cardPoints(b) : isActionCard(b) ? 10 : cardPoints(b);
    if (sb !== sa) return sb - sa;
    return 0;
  });
  // Hold wilds while alternatives exist — but not when down to the last cards.
  const nonWild = candidates.filter((c) => !isWild(c));
  const chosen = nonWild.length > 0 && handSize > 2 ? nonWild[0] : candidates[0];
  return toPlayAction(state, playerId, chosen, rng);
}

function hardMove(state: GameState, playerId: string, rng: () => number): Action {
  const legal = legalPlays(state, playerId);
  if (legal.length === 0) return { type: 'draw', playerId };

  const leader = leaderThreat(state, playerId);
  const next = nextPlayerId(state);
  const actions = legal.filter(isActionCard);

  // Leader sits next AND we hold disruption → hit them, hard.
  // ponytail: basic "card counting" = how many of each action have been seen
  // in the discard pile; if the pile is dry of skips, opponents likely hold them.
  if (leader === next && actions.length > 0) {
    const seen = new Map<string, number>();
    for (const c of state.discardPile) {
      if (c.action) seen.set(c.action, (seen.get(c.action) ?? 0) + 1);
    }
    const rank = (c: Card) => {
      // Prefer the disruption opponents are least likely to answer.
      const answered = seen.get(c.action as string) ?? 0;
      const punch = c.action === 'draw2' ? 0 : c.action === 'skip' ? 1 : 2;
      return punch * 10 - answered;
    };
    const sorted = actions.slice().sort((a, b) => rank(a) - rank(b));
    return toPlayAction(state, playerId, sorted[0], rng);
  }

  // Wild color: most-held color, tiebroken by least-discarded color —
  // opponents are less likely to hold what hasn't shown up much. (Heuristic.)
  const base = mediumMove(state, playerId, rng);
  if (base.type === 'play') {
    const card = legal.find((c) => c.id === (base as { cardId: string }).cardId);
    if (card && isWild(card)) {
      const me = state.players.find((p) => p.id === playerId);
      const hand = me?.hand ?? [];
      const counts = new Map<string, number>();
      for (const c of hand) {
        const col = matchColor(c);
        if (col) counts.set(col, (counts.get(col) ?? 0) + 1);
      }
      const discarded = new Map<string, number>();
      for (const c of state.discardPile) {
        const col = matchColor(c);
        if (col) discarded.set(col, (discarded.get(col) ?? 0) + 1);
      }
      let best: string | null = null;
      let bestScore = -Infinity;
      for (const col of declarableColors(state.deckKind)) {
        const score = (counts.get(col) ?? 0) * 10 - (discarded.get(col) ?? 0);
        if (score > bestScore) {
          bestScore = score;
          best = col;
        }
      }
      return { type: 'play', playerId, cardId: card.id, declaredColor: best ?? pick(declarableColors(state.deckKind), rng) };
    }
  }
  return base;
}

/**
 * Choose the bot's next action. Returns null when it's not their turn or the
 * game is over — callers (realtime sync, UI) treat null as "do nothing".
 */
export function chooseAction(
  state: GameState,
  playerId: string,
  difficulty: BotDifficulty,
  opts: StrategyOpts = {},
): Action | null {
  const rng = opts.rng ?? Math.random;
  if (state.phase !== 'playing') return null;
  if (currentPlayer(state).id !== playerId) return null;
  switch (difficulty) {
    case 'easy':
      return easyMove(state, playerId, rng);
    case 'medium':
      return mediumMove(state, playerId, rng);
    case 'hard':
      return hardMove(state, playerId, rng);
  }
}

/** Drive one full bot turn (a turn may need draw-then-play). Pure helper for sims. */
export function playBotTurn(state: GameState, playerId: string, difficulty: BotDifficulty, seed: number): GameState {
  const rng = mulberry32(seed);
  let s = state;
  for (let i = 0; i < 4; i++) {
    // ponytail: a turn is at most draw→play→(effect could loop on edge cases);
    // the cap is the ceiling, documented here instead of a fancier model.
    if (s.phase !== 'playing' || currentPlayer(s).id !== playerId) break;
    const action = chooseAction(s, playerId, difficulty, { rng });
    if (!action) break;
    s = applyAction(s, action, seed + i);
  }
  return s;
}
