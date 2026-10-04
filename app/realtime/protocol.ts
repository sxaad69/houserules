// realtime/protocol.ts — the wire protocol for multiplayer tables.
//
// Architecture (v1): host-authoritative over Supabase Realtime broadcast +
// presence. No Postgres, no RLS, no Edge Functions — the publishable key is
// enough. Room code IS the channel name, so no directory service is needed.
//
//   Host (table creator): runs the engine, validates actions, broadcasts.
//   Guest: dumb terminal — renders public state, sends action intents.
//   Hands are private: host sends each player their hand via targeted
//   messages (payload.to = playerId; clients ignore messages not for them).
//   Not cryptographically private — fine for casual v1, documented.
//
// Host drop in v1: game ends cleanly ("host left"). Non-host drops get
// replaced by a bot on the host. Host migration is a v1.1 feature.

import { legalPlays, type Action, type Card, type GameState, type Phase } from '../engine';
import type { DeckKind, RuleTemplate } from '../engine/types';

export const ROOM_CODE_LENGTH = 6;
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I/L/O/0/1 — readable over voice

/** Generate a room code, e.g. "X7K2P9". */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/** Channel name for a room code. The code is the address — no lookup needed. */
export function roomChannelName(code: string): string {
  return `table:code-${code.toUpperCase()}`;
}

// --- Presence ---

export interface PresenceInfo {
  playerId: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
}

// --- Lobby ---

export interface LobbyPlayer {
  playerId: string;
  name: string;
  isBot: boolean;
  connected: boolean;
}

export interface LobbyInfo {
  code: string;
  deck: DeckKind;
  template: RuleTemplate;
  maxPlayers: number;
  players: LobbyPlayer[];
  phase: 'lobby' | 'playing';
}

// --- Public game state (what guests render) ---

export interface PublicPlayer {
  id: string;
  name: string;
  isBot: boolean;
  handCount: number;
  score: number;
}

export interface PublicState {
  deckKind: DeckKind;
  template: RuleTemplate;
  turnPlayerId: string;
  phase: Phase;
  round: number;
  discardTop: Card | null;
  discardCount: number;
  drawCount: number;
  activeColor: string | null;
  pendingDraw: number;
  players: PublicPlayer[];
  winnerId: string | null;
  winningCard: Card | null;
  /** Status line, e.g. "Falcon is thinking…". Host-composed, guests display. */
  status: string;
  /** Card IDs in the current player's hand that are legal right now. */
  legalByPlayer: Record<string, string[]>;
  /** Monotonic — guests ignore stale states. */
  seq: number;
}

// --- Wire messages ---

/** Targeted delivery: clients ignore payloads where to !== their playerId. */
export interface Targeted<T> {
  to: string;
  data: T;
}

export type NetEvent =
  | { event: 'lobby'; payload: LobbyInfo }
  | { event: 'start'; payload: { deck: DeckKind; template: RuleTemplate } }
  | { event: 'deal'; payload: Targeted<{ hand: Card[] }> }
  | { event: 'state'; payload: PublicState }
  | { event: 'hand'; payload: Targeted<{ hand: Card[] }> }
  | { event: 'action'; payload: { playerId: string; action: Action } }
  | { event: 'hostLeft'; payload: Record<string, never> }
  | { event: 'kicked'; payload: Targeted<Record<string, never>> };

/** Build the public snapshot the host broadcasts. Hands stay private. */
export function toPublicState(game: GameState, status: string, seq: number): PublicState {
  const legalByPlayer: Record<string, string[]> = {};
  for (const p of game.players) {
    if (!p.isBot) legalByPlayer[p.id] = legalPlays(game, p.id).map((c) => c.id);
  }
  return {
    deckKind: game.deckKind,
    template: game.template,
    turnPlayerId: game.players[game.turn]?.id ?? '',
    phase: game.phase,
    round: game.round,
    discardTop: game.discardPile[game.discardPile.length - 1] ?? null,
    discardCount: game.discardPile.length,
    drawCount: game.drawPile.length,
    activeColor: game.activeColor,
    pendingDraw: game.pendingDraw,
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      handCount: p.hand.length,
      score: p.score,
    })),
    winnerId: game.winnerId,
    winningCard: game.winningCard,
    status,
    legalByPlayer,
    seq,
  };
}
