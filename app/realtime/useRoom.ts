// realtime/useRoom.ts — multiplayer table state over Supabase Realtime.
//
// Host (role='host'): runs the engine, validates guest actions, broadcasts.
// Guest (role='guest'): dumb terminal — renders public state, sends intents.
//
// The GameState lives in a ref on the host (never stale in handlers); a seq
// counter triggers renders. Guests ignore out-of-order states via seq.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  applyAction,
  createGame,
  currentPlayer,
  legalPlays,
  type Action,
  type Card,
  type GameState,
  type SeatInput,
} from '../engine';
import type { DeckKind, RuleTemplate, Rulebook } from '../engine/types';
import { botForSeat } from '../bots';
import { chooseAction } from '../bots/strategy';
import { useSession } from '../store/session';
import {
  generateRoomCode,
  roomChannelName,
  toPublicState,
  type LobbyInfo,
  type LobbyPlayer,
  type NetEvent,
  type PresenceInfo,
  type PublicState,
} from './protocol';

export type RoomRole = 'host' | 'guest';

interface UseRoomOpts {
  code: string;
  role: RoomRole;
  deck: DeckKind;
  template: RuleTemplate;
  maxPlayers?: number;
  onHostLeft?: () => void;
}

const BOT_THINK_MS = 900;

function defaultRulebook(deck: DeckKind, template: RuleTemplate): Rulebook {
  return {
    id: `net-${deck}`,
    name: 'Private Table',
    deck,
    template,
    specials: { skip: true, reverse: true, drawTwo: true, wild: true, wildDrawFour: true },
    winCondition: template === 'pointsRace' ? 'lowestScore' : 'emptyHand',
    minPlayers: 2,
    maxPlayers: 8,
    turnSeconds: 0,
  };
}

export function useRoom({ code, role, deck, template, maxPlayers = 4, onHostLeft }: UseRoomOpts) {
  const { playerId, displayName } = useSession();
  const isHost = role === 'host';

  const [connected, setConnected] = useState(false);
  const [peers, setPeers] = useState<PresenceInfo[]>([]);
  const [lobby, setLobby] = useState<LobbyInfo | null>(null);
  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [seq, setSeq] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const seqRef = useRef(0);
  const botsRef = useRef<LobbyPlayer[]>([]); // lobby bots added by host
  const statusRef = useRef('');
  const onHostLeftRef = useRef(onHostLeft);
  onHostLeftRef.current = onHostLeft;

  const send = useCallback((event: NetEvent['event'], payload: unknown) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  // ---- host: broadcast helpers ----

  const broadcastState = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    seqRef.current += 1;
    setSeq(seqRef.current);
    const status = statusRef.current;
    send('state', toPublicState(game, status, seqRef.current));
    // Targeted hands: everyone gets their current hand after every action.
    // (Cheap, tiny decks — correctness over bandwidth.)
    for (const p of game.players) {
      if (p.isBot) continue;
      send('hand', { to: p.id, data: { hand: p.hand } });
    }
    setPublicState(toPublicState(game, status, seqRef.current));
  }, [send]);

  const broadcastLobby = useCallback(
    (players: LobbyPlayer[], phase: LobbyInfo['phase']) => {
      const info: LobbyInfo = { code, deck, template, maxPlayers, players, phase };
      setLobby(info);
      send('lobby', info);
    },
    [code, deck, template, maxPlayers, send],
  );

  // ---- host: bot turns ----

  const maybeBotMove = useCallback(() => {
    const game = gameRef.current;
    if (!game || game.phase !== 'playing') return;
    const cur = currentPlayer(game);
    if (!cur.isBot) return;
    statusRef.current = `${cur.name} is thinking…`;
    const timer = setTimeout(() => {
      const g = gameRef.current;
      if (!g || g.phase !== 'playing') return;
      const now = currentPlayer(g);
      if (!now.isBot || now.id !== cur.id) return; // turn moved on
      // Bot difficulty: seat personas for pre-game bots, medium for drop-ins.
      const action = chooseAction(g, now.id, 'medium', {});
      if (!action) return;
      try {
        gameRef.current = applyAction(g, action, Date.now());
        statusRef.current = '';
        broadcastState();
        maybeBotMove(); // chain bot turns
      } catch {
        /* illegal bot move — engine guards; skip */
      }
    }, BOT_THINK_MS);
    return () => clearTimeout(timer);
  }, [broadcastState]);

  // ---- host: incoming guest actions ----

  const handleGuestAction = useCallback(
    (guestId: string, action: Action) => {
      const game = gameRef.current;
      if (!game || game.phase !== 'playing') return;
      if (currentPlayer(game).id !== guestId) return; // not their turn
      if (action.type === 'play') {
        const legal = legalPlays(game, guestId);
        if (!legal.some((c) => c.id === action.cardId)) return; // illegal — ignore
      }
      try {
        gameRef.current = applyAction(game, action, Date.now());
        statusRef.current = '';
        broadcastState();
        maybeBotMove();
      } catch {
        /* invalid action — ignore, guest stays in sync via last state */
      }
    },
    [broadcastState, maybeBotMove],
  );

  // ---- host: start game ----

  const startGame = useCallback(() => {
    if (!isHost) return;
    const humans: SeatInput[] = peers
      .filter((p) => !p.isHost || p.playerId === playerId)
      .map((p) => ({ id: p.playerId, name: p.name, isBot: false }));
    // De-dupe (presence sync can double-list) and cap at maxPlayers.
    const seen = new Set<string>();
    const seats: SeatInput[] = [];
    for (const h of humans) {
      if (!seen.has(h.id) && seats.length < maxPlayers) {
        seen.add(h.id);
        seats.push(h);
      }
    }
    // Bot backfill for empty seats (min 2 players).
    let botIdx = 0;
    while (seats.length < Math.max(2, Math.min(maxPlayers, Math.max(seats.length, 2)))) {
      const persona = botForSeat(`net-${code}`, botIdx);
      seats.push({ id: `bot:${code}:${botIdx}`, name: persona.name, isBot: true });
      botIdx++;
    }
    if (seats.length < 2) {
      const persona = botForSeat(`net-${code}`, 0);
      seats.push({ id: `bot:${code}:0`, name: persona.name, isBot: true });
    }
    const game = createGame(defaultRulebook(deck, template), seats, { seed: Date.now() });
    gameRef.current = game;
    // Targeted deals — each human gets only their own hand.
    for (const p of game.players) {
      if (p.isBot) continue;
      if (p.id === playerId) setMyHand(p.hand);
      else send('deal', { to: p.id, data: { hand: p.hand } });
    }
    send('start', { deck, template });
    const players: LobbyPlayer[] = seats.map((s) => ({
      playerId: s.id,
      name: s.name,
      isBot: s.isBot,
      connected: true,
    }));
    broadcastLobby(players, 'playing');
    statusRef.current = '';
    broadcastState();
    maybeBotMove();
  }, [isHost, peers, playerId, maxPlayers, code, deck, template, send, broadcastLobby, broadcastState, maybeBotMove]);

  // ---- channel lifecycle ----

  useEffect(() => {
    const presence: PresenceInfo = {
      playerId,
      name: displayName,
      isHost,
      joinedAt: Date.now(),
    };
    const ch = supabase.channel(roomChannelName(code), {
      config: { presence: { key: playerId } },
    });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, PresenceInfo[]>;
      const list: PresenceInfo[] = [];
      for (const arr of Object.values(state)) list.push(...arr);
      setPeers(list);
    });

    // Guest handlers
    if (!isHost) {
      ch.on('broadcast', { event: 'lobby' }, ({ payload }) => setLobby(payload as LobbyInfo));
      ch.on('broadcast', { event: 'deal' }, ({ payload }: { payload: { to: string; data: { hand: Card[] } } }) => {
        if (payload.to === playerId) setMyHand(payload.data.hand);
      });
      ch.on('broadcast', { event: 'hand' }, ({ payload }: { payload: { to: string; data: { hand: Card[] } } }) => {
        if (payload.to === playerId) setMyHand(payload.data.hand);
      });
      ch.on('broadcast', { event: 'state' }, ({ payload }) => {
        const ps = payload as PublicState;
        setPublicState((prev) => (prev && prev.seq >= ps.seq ? prev : ps));
      });
      ch.on('broadcast', { event: 'hostLeft' }, () => onHostLeftRef.current?.());
    } else {
      // Host handlers
      ch.on('broadcast', { event: 'action' }, ({ payload }: { payload: { playerId: string; action: Action } }) => {
        if (payload.playerId !== playerId) handleGuestAction(payload.playerId, payload.action);
      });
    }

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track(presence);
        setConnected(true);
      }
    });

    channelRef.current = ch;
    return () => {
      if (isHost) {
        // Warn guests before we go.
        try {
          ch.send({ type: 'broadcast', event: 'hostLeft', payload: {} });
        } catch {
          /* channel already dead */
        }
      }
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, playerId]);

  // ---- host: lobby sync from presence ----

  useEffect(() => {
    if (!isHost || gameRef.current) return; // lobby phase only
    const players: LobbyPlayer[] = peers.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      isBot: false,
      connected: true,
    }));
    for (const b of botsRef.current) {
      if (players.length < maxPlayers) players.push(b);
    }
    broadcastLobby(players, 'lobby');
  }, [isHost, peers, maxPlayers, broadcastLobby]);

  // ---- host: guest drop → bot takes over ----

  const handlePresenceLeave = useCallback(
    (leftId: string) => {
      const game = gameRef.current;
      if (!isHost || !game || game.phase !== 'playing') return;
      const idx = game.players.findIndex((p) => p.id === leftId && !p.isBot);
      if (idx === -1) return;
      // Convert the seat to a bot in place — hand preserved, game continues.
      game.players[idx] = { ...game.players[idx], isBot: true, name: `${game.players[idx].name} (bot)` };
      statusRef.current = `${game.players[idx].name} disconnected — bot takes over`;
      broadcastState();
      maybeBotMove();
    },
    [isHost, broadcastState, maybeBotMove],
  );

  // ---- host: guest drop → bot takes over ----
  // Presence 'leave' events have awkward typings; diffing the synced peer
  // list is equivalent and simpler.

  const prevPeersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isHost) {
      prevPeersRef.current = new Set(peers.map((p) => p.playerId));
      return;
    }
    const now = new Set(peers.map((p) => p.playerId));
    const prev = prevPeersRef.current;
    for (const id of prev) {
      if (!now.has(id) && id !== playerId) handlePresenceLeave(id);
    }
    prevPeersRef.current = now;
  }, [isHost, peers, playerId, handlePresenceLeave]);

  // ---- guest: host presence gone → host left ----

  useEffect(() => {
    if (isHost || !connected || !publicState) return;
    const hostStillHere = peers.some((p) => p.isHost);
    if (!hostStillHere && peers.length > 0) onHostLeftRef.current?.();
  }, [isHost, connected, peers, publicState]);

  // ---- actions ----

  const sendAction = useCallback(
    (action: Action) => {
      if (isHost) {
        handleGuestAction(playerId, action);
      } else {
        send('action', { playerId, action });
      }
    },
    [isHost, playerId, send, handleGuestAction],
  );

  const addBot = useCallback(() => {
    if (!isHost || gameRef.current) return;
    const idx = botsRef.current.length;
    const persona = botForSeat(`net-${code}`, idx);
    botsRef.current.push({
      playerId: `bot:${code}:${idx}`,
      name: persona.name,
      isBot: true,
      connected: true,
    });
    const players: LobbyPlayer[] = peers.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      isBot: false,
      connected: true,
    }));
    for (const b of botsRef.current) {
      if (players.length < maxPlayers) players.push(b);
    }
    broadcastLobby(players, 'lobby');
  }, [isHost, code, peers, maxPlayers, broadcastLobby]);

  const isMyTurn = publicState ? publicState.turnPlayerId === playerId : false;

  return {
    connected,
    lobby,
    publicState,
    myHand,
    isMyTurn,
    peers,
    sendAction,
    startGame,
    addBot,
    generateRoomCode,
  };
}
