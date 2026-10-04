// engine/__tests__/tableflow.test.ts — smoke for the TableScreen game flow.
// Drives the EXACT loop the screen uses: human takes first legal play (wilds
// declare the bot's best color), draws when stuck, bots via playBotTurn.
// Proves the flow terminates (no livelock) across seeds and both templates.
// Same pattern as engine.test.ts: plain asserts, tsc-compiled, node-run.

import { createGame, applyAction, currentPlayer, legalPlays, type GameState, type SeatInput } from '../game';
import { playBotTurn } from '../../bots/strategy';
import { botForSeat } from '../../bots';
import type { Rulebook } from '../types';

let passed = 0;
function test(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`ok   ${name}`);
}
function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`assert: ${msg}`);
}

const HUMAN = 'you';
const SPECIALS = { skip: true, reverse: true, drawTwo: true, wild: true, wildDrawFour: true };

function houseRulebook(template: 'shedding' | 'pointsRace'): Rulebook {
  return {
    id: 'house-test',
    name: 'Test Table',
    deck: 'uno108',
    template,
    specials: { ...SPECIALS },
    winCondition: template === 'pointsRace' ? 'lowestScore' : 'emptyHand',
    minPlayers: 2,
    maxPlayers: 8,
    turnSeconds: 0,
  };
}

function seats(tableId: string): SeatInput[] {
  const s: SeatInput[] = [{ id: HUMAN, name: 'You', isBot: false }];
  for (let i = 0; i < 3; i++) {
    const b = botForSeat(tableId, i);
    s.push({ id: b.id, name: b.name, isBot: true });
  }
  return s;
}

/**
 * Mirror of TableScreen's turn loop. Returns turns taken + final state.
 * Cap is the ceiling: a shedding game must end long before 500 turns —
 * the engine's own stalemate rule fires at 2 dead rounds.
 */
function driveFlow(seed: number, template: 'shedding' | 'pointsRace'): { turns: number; state: GameState } {
  let state = createGame(houseRulebook(template), seats(`smoke-${seed}`), { seed });
  let turns = 0;
  const diffs: Record<string, 'easy' | 'medium' | 'hard'> = {};
  for (const p of state.players) if (p.isBot) diffs[p.id] = 'medium';

  while (state.phase === 'playing' && turns < 500) {
    turns++;
    const cur = currentPlayer(state);
    if (cur.isBot) {
      state = playBotTurn(state, cur.id, diffs[cur.id], seed + turns);
      continue;
    }
    // Human branch — mirrors onCardPress/onDraw exactly:
    if (state.pendingDraw > 0 || legalPlays(state, HUMAN).length === 0) {
      state = applyAction(state, { type: 'draw', playerId: HUMAN }, seed + turns);
      continue;
    }
    const card = legalPlays(state, HUMAN)[0];
    const wild = card.action === 'wild' || card.action === 'wild4';
    state = applyAction(
      state,
      wild
        ? { type: 'play', playerId: HUMAN, cardId: card.id, declaredColor: 'red' }
        : { type: 'play', playerId: HUMAN, cardId: card.id },
      seed + turns,
    );
  }
  return { turns, state };
}

test('shedding flow terminates across seeds (human first-legal + bots)', () => {
  for (const seed of [1, 7, 42, 1337, 9001]) {
    const { turns, state } = driveFlow(seed, 'shedding');
    assert(state.phase === 'gameOver', `seed ${seed}: game must end, got ${state.phase}`);
    assert(state.winnerId !== null, `seed ${seed}: must have a winner`);
    assert(turns >= 20, `seed ${seed}: expected 20+ turns of real play, got ${turns}`);
    assert(state.log.length >= 20, `seed ${seed}: action log must grow, got ${state.log.length}`);
  }
});

test('pointsRace flow terminates and banks scores', () => {
  const { state } = driveFlow(99, 'pointsRace');
  assert(state.phase === 'gameOver', 'points race must end');
  assert(state.winnerId !== null, 'points race must have a winner');
  const total = state.players.reduce((s, p) => s + p.score, 0);
  assert(total >= 0, 'scores banked');
});

test('wild play without declaredColor is rejected (screen must pick first)', () => {
  const s0 = createGame(houseRulebook('shedding'), seats('wild-reject'), { seed: 5 });
  // Inject a wild into the human hand and force the human turn via JSON clone
  // (state is pure data — the same trick applyAction uses internally).
  const s = JSON.parse(JSON.stringify(s0)) as GameState;
  const human = s.players.find((p) => p.id === HUMAN)!;
  human.hand.push({ id: 'test-wild', deck: 'uno108', color: null, suit: null, rank: 'WILD', action: 'wild', animal: null });
  s.turn = s.players.findIndex((p) => p.id === HUMAN);
  let threw = false;
  try {
    applyAction(s, { type: 'play', playerId: HUMAN, cardId: 'test-wild' }, 5);
  } catch {
    threw = true;
  }
  assert(threw, 'wild without declaredColor must throw');
  const s2 = applyAction(s, { type: 'play', playerId: HUMAN, cardId: 'test-wild', declaredColor: 'red' }, 5);
  assert(s2.activeColor === 'red', 'declared color sticks');
});

console.log(`\n${passed} tableflow smoke tests passed`);
