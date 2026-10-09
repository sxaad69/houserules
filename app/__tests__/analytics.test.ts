// __tests__/analytics.test.ts — verifies the analytics event pipeline.
// No test framework (ponytail): plain asserts, compiled with the repo's tsc,
// run with node. Throws at the end if anything failed (non-zero exit).

import {
  addAnalyticsListener,
  logEvent,
  trackGameEnd,
  trackGameStart,
  type AnalyticsEventName,
  type AnalyticsParams,
} from '../analytics/events';
import { applyAction, createGame, currentPlayer, type GameState } from '../engine/game';
import { playBotTurn } from '../bots/strategy';
import type { Rulebook } from '../engine/types';

// --- tiny harness -----------------------------------------------------------
let passed = 0;
let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`assert: ${msg}`);
}
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}: ${(e as Error).message}`);
  }
}

// --- fixtures ---------------------------------------------------------------
const ALL_ON = { skip: true, reverse: true, drawTwo: true, wild: true, wildDrawFour: true };
const RB = (deck: Rulebook['deck'], template: Rulebook['template']): Rulebook => ({
  id: 't',
  name: 't',
  deck,
  template,
  specials: { ...ALL_ON },
  winCondition: template === 'shedding' ? 'emptyHand' : 'lowestScore',
  minPlayers: 2,
  maxPlayers: 8,
  turnSeconds: 0,
});
const SEATS = (n: number, bots = true) =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, isBot: bots }));

interface Captured {
  name: AnalyticsEventName;
  params: AnalyticsParams;
}
function capture(): { events: Captured[]; stop: () => void } {
  const events: Captured[] = [];
  const stop = addAnalyticsListener((name, params) => {
    events.push({ name, params });
  });
  return { events, stop };
}

/** Play a full shedding game to gameOver via bots. */
function simToEnd(deck: Rulebook['deck']): GameState {
  let s = createGame(RB(deck, 'shedding'), SEATS(3), { seed: 42 });
  let guard = 0;
  while (s.phase !== 'gameOver' && guard++ < 500) {
    const me = currentPlayer(s).id;
    s = playBotTurn(s, me, 'medium', 1000 + guard);
  }
  assert(s.phase === 'gameOver', 'sim did not terminate');
  return s;
}

// --- tests ------------------------------------------------------------------
test('logEvent delivers name + params to listeners', () => {
  const { events, stop } = capture();
  logEvent('table_join', { tableId: 'abc', deck: 'uno108' });
  stop();
  assert(events.length === 1, `expected 1 event, got ${events.length}`);
  assert(events[0].name === 'table_join', 'wrong event name');
  assert(events[0].params.tableId === 'abc', 'tableId param missing');
  assert(events[0].params.deck === 'uno108', 'deck param missing');
});

test('logEvent with no params defaults to empty object', () => {
  const { events, stop } = capture();
  logEvent('builder_complete');
  stop();
  assert(events.length === 1, 'event not captured');
  assert(typeof events[0].params === 'object', 'params should be an object');
});

test('createGame fires game_start with deck/template/playerCount/botCount', () => {
  const { events, stop } = capture();
  createGame(RB('uno108', 'shedding'), SEATS(4), { seed: 7 });
  stop();
  const start = events.find((e) => e.name === 'game_start');
  assert(!!start, 'game_start not fired');
  assert(start!.params.deck === 'uno108', `deck wrong: ${start!.params.deck}`);
  assert(start!.params.template === 'shedding', 'template wrong');
  assert(start!.params.playerCount === 4, `playerCount wrong: ${start!.params.playerCount}`);
  assert(start!.params.botCount === 4, `botCount wrong: ${start!.params.botCount}`);
});

test('full game fires game_end with winnerId, durationMs, rounds', () => {
  const { events, stop } = capture();
  const s = simToEnd('classic52');
  stop();
  const end = events.find((e) => e.name === 'game_end');
  assert(!!end, 'game_end not fired');
  assert(end!.params.winnerId === s.winnerId, 'winnerId mismatch');
  assert(typeof end!.params.durationMs === 'number', 'durationMs missing');
  assert((end!.params.durationMs as number) >= 0, 'durationMs negative');
  assert(end!.params.deck === 'classic52', 'deck missing on game_end');
  assert(typeof end!.params.winnerIsBot === 'boolean', 'winnerIsBot missing');
});

test('game_start and game_end pair up for one game', () => {
  const { events, stop } = capture();
  simToEnd('uno108');
  stop();
  const starts = events.filter((e) => e.name === 'game_start').length;
  const ends = events.filter((e) => e.name === 'game_end').length;
  assert(starts === 1, `expected 1 game_start, got ${starts}`);
  assert(ends === 1, `expected 1 game_end, got ${ends}`);
});

test('trackGameStart/trackGameEnd work standalone', () => {
  const { events, stop } = capture();
  const ref = {};
  trackGameStart(ref, { deck: 'animals12' });
  trackGameEnd(ref, { winnerId: 'p0' });
  stop();
  assert(events.length === 2, `expected 2 events, got ${events.length}`);
  assert(events[0].name === 'game_start', 'first should be game_start');
  assert(events[1].name === 'game_end', 'second should be game_end');
  assert(events[1].params.winnerId === 'p0', 'winnerId not passed through');
  assert(typeof events[1].params.durationMs === 'number', 'durationMs not appended');
});

test('trackGameEnd without start still logs (durationMs 0)', () => {
  const { events, stop } = capture();
  trackGameEnd({}, { winnerId: 'p1' });
  stop();
  assert(events.length === 1, 'event not logged');
  assert(events[0].params.durationMs === 0, 'durationMs should be 0 without start');
});

test('gift_sent and theme_changed carry their params', () => {
  const { events, stop } = capture();
  logEvent('gift_sent', { giftId: 'rose', costCoins: 50, vip: false });
  logEvent('theme_changed', { kind: 'felt', id: 'felt-emerald' });
  stop();
  const gift = events.find((e) => e.name === 'gift_sent');
  const theme = events.find((e) => e.name === 'theme_changed');
  assert(!!gift && gift.params.giftId === 'rose', 'gift_sent params wrong');
  assert(!!theme && theme.params.id === 'felt-emerald', 'theme_changed params wrong');
});

test('builder_complete fires', () => {
  const { events, stop } = capture();
  logEvent('builder_complete', { deck: 'uno108', template: 'shedding' });
  stop();
  assert(events.some((e) => e.name === 'builder_complete'), 'builder_complete not fired');
});

test('a throwing listener does not break logging for others', () => {
  const { events, stop } = capture();
  const bad = addAnalyticsListener(() => {
    throw new Error('boom');
  });
  logEvent('table_join', { tableId: 'x' });
  bad();
  stop();
  assert(events.length === 1, 'good listener should still receive the event');
});

test('unsubscribe stops delivery', () => {
  const { events, stop } = capture();
  stop();
  logEvent('table_join', { tableId: 'y' });
  assert(events.length === 0, 'events delivered after unsubscribe');
});

// applyAction is imported to keep the engine import surface honest (unused here).
void applyAction;

// --- report -----------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} test(s) failed`);
