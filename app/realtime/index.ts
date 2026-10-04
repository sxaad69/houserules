// realtime/ — Supabase Realtime rooms (spec §11).
// Channels, presence and turn-state sync land here during the v1 build.
// Client only for now; no tables created yet.

import { supabase } from '../lib/supabase';

export interface SeatState {
  playerId: string;
  isBot: boolean;
  name: string;
  cardCount: number;
  connected: boolean;
}

export interface RoomState {
  roomId: string;
  code: string | null;
  seats: SeatState[];
  turnPlayerId: string | null;
  phase: 'lobby' | 'playing' | 'finished';
}

/** Presence channel name for a table. One channel per table. */
export function roomChannelName(tableId: string): string {
  return `table:${tableId}`;
}

/** Subscribe to a table's realtime channel. Engine wires handlers later. */
export function subscribeToTable(tableId: string) {
  return supabase.channel(roomChannelName(tableId));
}
