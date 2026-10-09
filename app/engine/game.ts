// engine/game.ts — turn engine for both v1 templates (spec §6).
// Pure functions over a serializable GameState + action log, so the same
// code runs locally and stays transport-agnostic for Supabase Realtime sync:
// every state transition is one logged Action. Zero UI.

import {
  buildDeck,
  cardPoints,
  isLegalPlay,
  matchColor,
  mulberry32,
  shuffle,
  type Card,
} from './cards';
import type { DeckKind, Rulebook, SpecialCardToggles } from './types';
import { trackGameEnd, trackGameStart } from '../analytics/events';

export interface SeatInput {
  id: string;
  name: string;
  isBot: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  isBot: boolean;
  hand: Card[];
  /** Points Race total. Shedding ignores it. */
  score: number;
}

export type Phase = 'playing' | 'gameOver';

export interface GameState {
  deckKind: DeckKind;
  template: 'shedding' | 'pointsRace';
  /** Needed for re-deals; serializable, no functions. */
  specials: SpecialCardToggles;
  includeJokers: boolean;
  players: PlayerState[];
  drawPile: Card[];
  discardPile: Card[];
  /** Index into players whose turn it is. */
  turn: number;
  direction: 1 | -1;
  /** Forced draws the current player must take (draw2/wild4 stacks). */
  pendingDraw: number;
  /** Set by wilds; null means "match the top discard". */
  activeColor: string | null;
  round: number;
  /** Points Race only — total rounds to play. */
  rounds: number;
  phase: Phase;
  winnerId: string | null;
  /** Card that won the last round — feeds the animal-title mechanic. Null on stalemate. */
  winningCard: Card | null;
  /**
   * Consecutive turns with no net shed (hand didn't shrink over the turn).
   * Tiny decks can livelock — e.g. the only playable cards cycle through the
   * draw pile while dead cards sit in hands (caught by bot-vs-bot sims).
   * At 2 full rounds of stall the table calls it: fewest cards wins the round.
   * ponytail: the threshold is the ceiling — a turn counter, not a solver.
   */
  stall: number;
  /** Acting player's hand size when their turn started — for stall accounting. */
  turnStartHand: number;
  /** Transport-agnostic history: replay, sync, debug. */
  log: Action[];
}

export type Action =
  | { type: 'play'; playerId: string; cardId: string; declaredColor?: string }
  | { type: 'draw'; playerId: string };

export interface CreateOpts {
  seed?: number;
  /** Points Race only. Default 3. */
  rounds?: number;
  includeJokers?: boolean; // classic52 only
}

/** Turns before the table calls a stalemate: two full rounds of no progress. */
const STALL_ROUNDS = 2;

function advance(state: GameState, steps: number): void {
  const n = state.players.length;
  // ponytail: direction-aware modulo without negative-index bugs.
  state.turn = (((state.turn + steps * state.direction) % n) + n) % n;
}

/**
 * ponytail: tiny decks (animals12) can't deal 7 each — scale the hand so at
 * least ~4 cards stay in the draw pile. Ceiling: fixed formula, no per-deck config.
 */
function handSizeFor(deckSize: number, playerCount: number): number {
  return Math.max(2, Math.min(7, Math.floor((deckSize - 4) / playerCount)));
}

function topDiscard(state: GameState): Card {
  return state.discardPile[state.discardPile.length - 1];
}

/** Move discard (except top) back into the draw pile when it runs dry. */
function reshuffleIfNeeded(state: GameState, rng: () => number): void {
  if (state.drawPile.length > 0 || state.discardPile.length <= 1) return;
  const top = state.discardPile.pop() as Card;
  state.drawPile = shuffle(state.discardPile, rng);
  state.discardPile = [top];
}

function drawCards(state: GameState, player: PlayerState, count: number, rng: () => number): void {
  for (let i = 0; i < count; i++) {
    reshuffleIfNeeded(state, rng);
    const c = state.drawPile.pop();
    if (!c) break; // everything is in hands — vanishingly rare, just pass
    player.hand.push(c);
  }
}

function dealRound(state: GameState, seed: number): void {
  const deck = buildDeck(state.deckKind, state.specials, { includeJokers: state.includeJokers }, seed);
  const n = handSizeFor(deck.length, state.players.length);
  state.drawPile = deck;
  state.discardPile = [];
  for (const p of state.players) p.hand = [];
  for (let i = 0; i < n; i++)
    for (const p of state.players) {
      const c = state.drawPile.pop();
      if (c) p.hand.push(c);
    }
  // Starter card: never a wild — no color context exists yet.
  // ponytail: wilds go to the bottom of the pile instead of a re-shuffle loop.
  let starter = state.drawPile.pop() as Card;
  while (starter.action === 'wild' || starter.action === 'wild4') {
    state.drawPile.unshift(starter);
    starter = state.drawPile.pop() as Card;
  }
  state.discardPile.push(starter);
  state.activeColor = matchColor(starter);
  state.direction = 1;
  state.pendingDraw = 0;
  state.stall = 0;
  state.turnStartHand = state.players[state.turn].hand.length;
}

export function createGame(
  rulebook: Rulebook,
  seats: SeatInput[],
  opts: CreateOpts = {},
): GameState {
  if (seats.length < 2 || seats.length > 8) throw new Error(`need 2-8 players, got ${seats.length}`);
  const state: GameState = {
    deckKind: rulebook.deck,
    template: rulebook.template,
    specials: { ...rulebook.specials },
    includeJokers: !!opts.includeJokers,
    players: seats.map((s) => ({ id: s.id, name: s.name, isBot: s.isBot, hand: [] as Card[], score: 0 })),
    drawPile: [],
    discardPile: [],
    turn: 0,
    direction: 1,
    pendingDraw: 0,
    activeColor: null,
    round: 1,
    rounds: opts.rounds ?? 3,
    phase: 'playing',
    winnerId: null,
    winningCard: null,
    stall: 0,
    turnStartHand: 0,
    log: [],
  };
  dealRound(state, opts.seed ?? Date.now());
  trackGameStart(state, {
    deck: rulebook.deck,
    template: rulebook.template,
    playerCount: seats.length,
    botCount: seats.filter((s) => s.isBot).length,
  });
  return state;
}

export function currentPlayer(state: GameState): PlayerState {
  return state.players[state.turn];
}

/** Cards the player may legally play right now. Empty → must draw. */
export function legalPlays(state: GameState, playerId: string): Card[] {
  const p = state.players.find((x) => x.id === playerId);
  if (!p || state.phase !== 'playing' || currentPlayer(state).id !== playerId) return [];
  if (state.pendingDraw > 0) return []; // forced draw, no choice
  const top = topDiscard(state);
  return p.hand.filter((c) => isLegalPlay(top, state.activeColor, c));
}

function scoreRound(state: GameState, winnerIdx: number): void {
  // Everyone except the round winner banks their remaining hand as points.
  for (let i = 0; i < state.players.length; i++) {
    if (i === winnerIdx) continue;
    state.players[i].score += state.players[i].hand.reduce((s, c) => s + cardPoints(c), 0);
  }
}

/** Fewest cards wins the dead round; tiebreak: lower banked score, then seat. */
function fewestCardsIdx(state: GameState): number {
  let best = 0;
  for (let i = 1; i < state.players.length; i++) {
    const a = state.players[i];
    const b = state.players[best];
    if (a.hand.length < b.hand.length || (a.hand.length === b.hand.length && a.score < b.score)) best = i;
  }
  return best;
}

function finishRound(state: GameState, winnerIdx: number, winningCard: Card | null, seed: number): void {
  state.winningCard = winningCard;
  if (state.template === 'shedding') {
    state.phase = 'gameOver';
    state.winnerId = state.players[winnerIdx].id;
    trackGameEnd(state, {
      winnerId: state.winnerId,
      winnerIsBot: state.players[winnerIdx].isBot,
      rounds: state.round,
      deck: state.deckKind,
      template: state.template,
    });
    return;
  }
  // Points Race: bank scores, play next round or finish.
  scoreRound(state, winnerIdx);
  if (state.round >= state.rounds) {
    state.phase = 'gameOver';
    let best = 0;
    for (let i = 1; i < state.players.length; i++)
      if (state.players[i].score < state.players[best].score) best = i;
    state.winnerId = state.players[best].id;
    trackGameEnd(state, {
      winnerId: state.winnerId,
      winnerIsBot: state.players[best].isBot,
      rounds: state.round,
      deck: state.deckKind,
      template: state.template,
    });
    return;
  }
  state.round += 1;
  state.turn = winnerIdx; // round winner opens the next round
  dealRound(state, seed + state.round * 7919);
}

/**
 * Apply one action, returning the new state. Pure: the input is never mutated,
 * so snapshots stay safe for realtime sync.
 * Throws on illegal actions — validation lives here, at the trust boundary.
 */
export function applyAction(prev: GameState, action: Action, seed: number = Date.now()): GameState {
  // ponytail: JSON clone over structuredClone — state is pure JSON-shaped
  // data, and this is bulletproof on Hermes. Decks are tiny; cost is noise.
  const state = JSON.parse(JSON.stringify(prev)) as GameState;
  if (state.phase !== 'playing') throw new Error('game is over');
  const me = currentPlayer(state);
  if (me.id !== action.playerId) throw new Error(`not ${action.playerId}'s turn`);
  const rng = mulberry32(seed);

  // End-of-turn wrapper: stall accounting, advance, stalemate check.
  const finishTurn = (steps: number): void => {
    if (me.hand.length < state.turnStartHand) state.stall = 0;
    else state.stall += 1;
    advance(state, steps);
    state.turnStartHand = currentPlayer(state).hand.length;
    if (state.phase === 'playing' && state.stall >= state.players.length * STALL_ROUNDS) {
      finishRound(state, fewestCardsIdx(state), null, seed); // stalemate: no winning card
    }
  };

  if (action.type === 'draw') {
    if (state.pendingDraw > 0) {
      drawCards(state, me, state.pendingDraw, rng);
      state.pendingDraw = 0;
      state.log.push(action);
      finishTurn(1);
      return state;
    }
    if (legalPlays(state, me.id).length > 0) throw new Error('must play, not draw');
    drawCards(state, me, 1, rng);
    state.log.push(action);
    // Drew into a playable card? Turn stays — they may play it. Otherwise pass.
    if (legalPlays(state, me.id).length === 0) finishTurn(1);
    return state;
  }

  // play
  const idx = me.hand.findIndex((c) => c.id === action.cardId);
  if (idx < 0) throw new Error('card not in hand');
  const card = me.hand[idx];
  if (state.pendingDraw > 0) throw new Error('must draw pending cards first');
  if (!isLegalPlay(topDiscard(state), state.activeColor, card)) throw new Error('illegal play');
  if ((card.action === 'wild' || card.action === 'wild4') && !action.declaredColor)
    throw new Error('wild needs a declared color');

  me.hand.splice(idx, 1);
  state.discardPile.push(card);
  state.activeColor = action.declaredColor ?? matchColor(card);
  state.log.push(action);

  // Win check before effects — empty hand ends the round immediately.
  if (me.hand.length === 0) {
    finishRound(state, state.turn, card, seed);
    return state;
  }

  switch (card.action) {
    case 'skip':
      finishTurn(2);
      break;
    case 'reverse':
      // ponytail: with 2 players reverse == skip (official Uno behavior).
      if (state.players.length === 2) finishTurn(2);
      else {
        state.direction = state.direction === 1 ? -1 : 1;
        finishTurn(1);
      }
      break;
    case 'draw2':
      state.pendingDraw += 2;
      finishTurn(1);
      break;
    case 'wild4':
      state.pendingDraw += 4;
      finishTurn(1);
      break;
    case 'wild':
    default:
      finishTurn(1);
      break;
  }
  return state;
}

/** All declared colors a wild may choose — deck-aware (suits for classic). */
export function declarableColors(deck: DeckKind): string[] {
  return deck === 'classic52' || deck === 'baloot32'
    ? ['spades', 'hearts', 'diamonds', 'clubs']
    : ['red', 'yellow', 'green', 'blue'];
}
