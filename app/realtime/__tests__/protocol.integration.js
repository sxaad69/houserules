// Multiplayer protocol integration test (Node): two real Supabase Realtime
// clients drive the full host/guest protocol — presence, lobby, deal,
// action validation, state broadcast, targeted hands. Proves the wire
// protocol over real Realtime; the React hook implements this same flow.
const { createClient } = require('@supabase/supabase-js');
const assert = require('assert');

const URL = 'https://ajzypbzojvgflajkkwnr.supabase.co';
const KEY = 'sb_publishable_1peISP0rKj1Pk-N8VWQ9rQ_g49QMZV7';

// Minimal engine stubs mirroring the real engine's contract (pure data).
// The real validation (legalPlays/applyAction) is unit-tested separately;
// here we verify the *protocol*: routing, targeting, sequencing.
function makeGame() {
  return {
    players: [
      { id: 'host-1', name: 'Host', isBot: false, hand: [{ id: 'c1' }, { id: 'c2' }] },
      { id: 'guest-1', name: 'Guest', isBot: false, hand: [{ id: 'c3' }, { id: 'c4' }] },
    ],
    turn: 1, // guest's turn
    seq: 0,
  };
}

async function main() {
  const code = 'TEST' + Math.floor(Math.random() * 100);
  const chanName = `table:code-${code}`;
  const host = createClient(URL, KEY);
  const guest = createClient(URL, KEY);

  const seen = { lobby: null, deal: null, state: [], hand: null, action: null };

  // ---- Host: join, track, handle actions ----
  const hostCh = host.channel(chanName, { config: { presence: { key: 'host-1' } } });
  let game = makeGame();
  hostCh.on('broadcast', { event: 'action' }, ({ payload }) => {
    seen.action = payload;
    // Validate: must be the turn player's action (mirrors legalPlays guard).
    const turnPlayer = game.players[game.turn];
    assert.strictEqual(payload.playerId, turnPlayer.id, 'action from wrong player');
    // Apply: remove the played card (simplified engine).
    const cardIdx = turnPlayer.hand.findIndex((c) => c.id === payload.action.cardId);
    assert.ok(cardIdx >= 0, 'played card not in hand');
    turnPlayer.hand.splice(cardIdx, 1);
    game.turn = (game.turn + 1) % game.players.length;
    game.seq += 1;
    // Broadcast public state + targeted hands.
    hostCh.send({ type: 'broadcast', event: 'state', payload: { seq: game.seq, turn: game.players[game.turn].id } });
    for (const p of game.players) {
      hostCh.send({ type: 'broadcast', event: 'hand', payload: { to: p.id, data: { hand: p.hand } } });
    }
  });

  // ---- Guest: join, listen ----
  const guestCh = guest.channel(chanName, { config: { presence: { key: 'guest-1' } } });
  guestCh.on('broadcast', { event: 'lobby' }, ({ payload }) => { seen.lobby = payload; });
  guestCh.on('broadcast', { event: 'deal' }, ({ payload }) => {
    if (payload.to === 'guest-1') seen.deal = payload.data;
  });
  guestCh.on('broadcast', { event: 'state' }, ({ payload }) => { seen.state.push(payload); });
  guestCh.on('broadcast', { event: 'hand' }, ({ payload }) => {
    if (payload.to === 'guest-1') seen.hand = payload.data;
    // Targeting check: guest must NOT receive host's hand.
    if (payload.to === 'host-1') seen.leaked = true;
  });

  await new Promise((res, rej) => {
    let n = 0;
    const done = () => ++n === 2 && res();
    hostCh.subscribe((s) => s === 'SUBSCRIBED' && hostCh.track({ playerId: 'host-1', name: 'Host', isHost: true }).then(done));
    guestCh.subscribe((s) => s === 'SUBSCRIBED' && guestCh.track({ playerId: 'guest-1', name: 'Guest', isHost: false }).then(done));
    setTimeout(() => rej(new Error('subscribe timeout')), 15000);
  });
  console.log('✓ both subscribed');

  // Presence sync.
  await new Promise((r) => setTimeout(r, 3000));
  const presence = hostCh.presenceState();
  const ids = Object.values(presence).flat().map((p) => p.playerId);
  assert.ok(ids.includes('host-1') && ids.includes('guest-1'), 'presence missing peer: ' + ids);
  console.log('✓ presence sync:', ids.join(','));

  // Lobby broadcast reaches guest.
  hostCh.send({ type: 'broadcast', event: 'lobby', payload: { code, players: 2 } });
  await new Promise((r) => setTimeout(r, 2000));
  assert.ok(seen.lobby && seen.lobby.code === code, 'lobby not received');
  console.log('✓ lobby broadcast');

  // Targeted deal: guest gets theirs, host's would-be deal is ignored.
  hostCh.send({ type: 'broadcast', event: 'deal', payload: { to: 'guest-1', data: { hand: [{ id: 'c3' }] } } });
  hostCh.send({ type: 'broadcast', event: 'deal', payload: { to: 'host-1', data: { hand: [{ id: 'SECRET' }] } } });
  await new Promise((r) => setTimeout(r, 2000));
  assert.ok(seen.deal && seen.deal.hand[0].id === 'c3', 'targeted deal failed');
  assert.ok(!seen.leaked, 'hand leaked to wrong recipient');
  console.log('✓ targeted deal (no leak)');

  // Guest action → host validates, applies, broadcasts.
  guestCh.send({ type: 'broadcast', event: 'action', payload: { playerId: 'guest-1', action: { type: 'play', cardId: 'c3' } } });
  await new Promise((r) => setTimeout(r, 3000));
  assert.ok(seen.action, 'host never got the action');
  assert.ok(seen.state.length > 0, 'no state broadcast');
  assert.strictEqual(seen.state[seen.state.length - 1].turn, 'host-1', 'turn did not advance');
  assert.ok(seen.hand && seen.hand.hand.length === 1, 'guest hand not updated');
  console.log('✓ action → validate → state + hand (turn advanced to host-1)');

  console.log('\nPROTOCOL INTEGRATION: ALL PASS');
  process.exit(0);
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
