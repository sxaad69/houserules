// engine/__tests__/engine.test.ts — one runnable check for the engine + bots.
// No test framework (ponytail): plain asserts, compiled with the repo's tsc,
// run with node. Throws at the end if anything failed (non-zero exit).

import { buildDeck, isLegalPlay, matchColor, type Card } from '../cards';
import {
  applyAction,
  createGame,
  currentPlayer,
  legalPlays,
  type Action,
  type GameState,
} from '../game';
import type { Rulebook } from '../types';
import { chooseAction, playBotTurn } from '../../bots/strategy';
import { BOT_PERSONAS, personaForSeat } from '../../bots/personas';
import { mulberry32 } from '../cards';

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
function throws(fn: () => void, msg: string): void {
  let ok = false;
  try {
    fn();
  } catch {
    ok = true;
  }
  assert(ok, msg);
}
/** Assert the bot chose a play action and return the played card id. */
function playedCardId(a: Action | null, msg: string): string {
  assert(a !== null && a.type === 'play', msg);
  return (a as { type: 'play'; cardId: string }).cardId;
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
const SEATS = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, isBot: true }));

/** Build a rigged state: exact hands + top discard. Tests cheat openly. */
function rigged(deck: Rulebook['deck'], hands: Card[][], topCard: Card, turnIdx = 0): GameState {
  const s = createGame(RB(deck, 'shedding'), SEATS(hands.length), { seed: 1 });
  hands.forEach((h, i) => (s.players[i].hand = h));
  s.discardPile = [topCard];
  s.activeColor = matchColor(topCard);
  s.turn = turnIdx;
  s.pendingDraw = 0;
  s.direction = 1;
  return s;
}
const uno = (seed = 1) => buildDeck('uno108', ALL_ON, {}, seed);
const one = (cards: Card[], pred: (c: Card) => boolean): Card => {
  const c = cards.find(pred);
  assert(!!c, 'fixture card not found');
  return c as Card;
};

// --- deck integrity ---------------------------------------------------------
test('classic52: 52 unique cards', () => {
  const d = buildDeck('classic52', ALL_ON, {}, 7);
  assert(d.length === 52, `got ${d.length}`);
  assert(new Set(d.map((c) => c.id)).size === 52, 'ids not unique');
  assert(d.filter((c) => c.suit === 'hearts').length === 13, 'hearts != 13');
});
test('classic52 jokers: 54 with 2 wilds', () => {
  const d = buildDeck('classic52', ALL_ON, { includeJokers: true }, 7);
  assert(d.length === 54, `got ${d.length}`);
  assert(d.filter((c) => c.rank === 'JOKER').length === 2, 'jokers != 2');
});
test('uno108: 108 unique, correct composition', () => {
  const d = uno();
  assert(d.length === 108, `got ${d.length}`);
  assert(new Set(d.map((c) => c.id)).size === 108, 'ids not unique');
  assert(d.filter((c) => c.action === 'wild').length === 4, 'wilds != 4');
  assert(d.filter((c) => c.action === 'wild4').length === 4, 'wild4 != 4');
  for (const color of ['red', 'yellow', 'green', 'blue']) {
    const nums = d.filter((c) => c.color === color && !c.action);
    assert(nums.length === 19, `${color} numbers != 19`);
    for (const a of ['skip', 'reverse', 'draw2'])
      assert(d.filter((c) => c.color === color && c.action === a).length === 2, `${color} ${a} != 2`);
  }
});
test('uno108 toggles filter the deck', () => {
  const d = buildDeck('uno108', { skip: false, reverse: false, drawTwo: false, wild: false, wildDrawFour: false }, {}, 7);
  assert(d.length === 76, `got ${d.length}`);
  assert(d.every((c) => !c.action), 'action cards leaked through toggles');
});
test('baloot32: 32 cards, ranks 7-A only', () => {
  const d = buildDeck('baloot32', ALL_ON, {}, 7);
  assert(d.length === 32, `got ${d.length}`);
  assert(new Set(d.map((c) => c.id)).size === 32, 'ids not unique');
  assert(d.every((c) => ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'].includes(c.rank)), 'bad rank');
});
test('animals12: 12 unique animals, 4 colors x 3', () => {
  const d = buildDeck('animals12', ALL_ON, {}, 7);
  assert(d.length === 12, `got ${d.length}`);
  assert(new Set(d.map((c) => c.animal)).size === 12, 'animals not unique');
  for (const color of ['red', 'yellow', 'green', 'blue'])
    assert(d.filter((c) => c.color === color).length === 3, `${color} != 3`);
});
test('seeded builds are deterministic', () => {
  const a = buildDeck('uno108', ALL_ON, {}, 42).map((c) => c.id).join(',');
  const b = buildDeck('uno108', ALL_ON, {}, 42).map((c) => c.id).join(',');
  const c = buildDeck('uno108', ALL_ON, {}, 43).map((c) => c.id).join(',');
  assert(a === b, 'same seed diverged');
  assert(a !== c, 'different seed identical');
});

// --- matching ---------------------------------------------------------------
test('isLegalPlay: color, rank, animal, wild', () => {
  const d = uno();
  const top = one(d, (c) => c.color === 'red' && c.rank === '5');
  assert(isLegalPlay(top, 'red', one(d, (c) => c.color === 'red' && c.rank === '9')), 'color match');
  assert(isLegalPlay(top, 'red', one(d, (c) => c.color === 'blue' && c.rank === '5')), 'rank match');
  assert(!isLegalPlay(top, 'red', one(d, (c) => c.color === 'blue' && c.rank === '9')), 'non-match allowed');
  assert(isLegalPlay(top, 'red', one(d, (c) => c.action === 'wild')), 'wild rejected');
  const ad = buildDeck('animals12', ALL_ON, {}, 7);
  const atop = one(ad, (c) => c.animal === 'falcon');
  assert(isLegalPlay(atop, 'red', one(ad, (c) => c.animal === 'falcon')), 'animal self-match');
  assert(isLegalPlay(atop, 'red', one(ad, (c) => c.animal === 'fox')), 'animal color match (fox is red)');
  assert(!isLegalPlay(atop, 'red', one(ad, (c) => c.animal === 'camel')), 'animal non-match allowed (camel is yellow)');
});

// --- game setup -------------------------------------------------------------
test('createGame: player count enforced', () => {
  throws(() => createGame(RB('uno108', 'shedding'), SEATS(1)), '1 player allowed');
  throws(() => createGame(RB('uno108', 'shedding'), SEATS(9)), '9 players allowed');
});
test('createGame: deals 7, non-wild starter, turn 0', () => {
  const s = createGame(RB('uno108', 'shedding'), SEATS(4), { seed: 5 });
  assert(s.players.every((p) => p.hand.length === 7), 'hand != 7');
  const top = s.discardPile[s.discardPile.length - 1];
  assert(top.action !== 'wild' && top.action !== 'wild4', 'wild starter');
  assert(s.turn === 0 && s.direction === 1 && s.phase === 'playing', 'bad init');
});
test('createGame: animals12 scales hand for tiny deck', () => {
  const s = createGame(RB('animals12', 'shedding'), SEATS(4), { seed: 5 });
  assert(s.players.every((p) => p.hand.length === 2), 'expected 2-card hands');
  assert(s.drawPile.length === 12 - 8 - 1, 'draw pile wrong size');
});

// --- actions ----------------------------------------------------------------
test('play: wrong turn / illegal card / draw-with-plays throw', () => {
  const d = uno();
  const top = one(d, (c) => c.color === 'red' && c.rank === '3');
  const s = rigged('uno108', [[one(d, (c) => c.color === 'red' && c.rank === '5')], [one(d, (c) => c.color === 'blue' && c.rank === '1')]], top);
  throws(() => applyAction(s, { type: 'play', playerId: 'p1', cardId: s.players[0].hand[0].id }), 'out-of-turn play allowed');
  throws(() => applyAction(s, { type: 'draw', playerId: 'p0' }), 'draw with legal plays allowed');
  throws(
    () => applyAction(s, { type: 'play', playerId: 'p0', cardId: s.players[1].hand[0].id }),
    'foreign card allowed',
  );
});
test('skip advances two seats', () => {
  const d = uno();
  const top = one(d, (c) => c.color === 'red' && c.rank === '3');
  const skip = one(d, (c) => c.color === 'red' && c.action === 'skip');
  const filler = one(d, (c) => c.color === 'red' && c.rank === '9' && c.id !== skip.id);
  const s = rigged('uno108', [[skip, filler], [], []], top);
  const n = applyAction(s, { type: 'play', playerId: 'p0', cardId: skip.id });
  assert(n.turn === 2, `skip landed on ${n.turn}`);
});
test('reverse flips direction (3P) and acts as skip (2P)', () => {
  const d = uno();
  const top = one(d, (c) => c.color === 'red' && c.rank === '3');
  const rev = one(d, (c) => c.color === 'red' && c.action === 'reverse');
  const filler = one(d, (c) => c.color === 'red' && c.rank === '9' && c.id !== rev.id);
  const s3 = rigged('uno108', [[rev, filler], [], []], top);
  const n3 = applyAction(s3, { type: 'play', playerId: 'p0', cardId: rev.id });
  assert(n3.direction === -1 && n3.turn === 2, '3P reverse wrong');
  const s2 = rigged('uno108', [[rev, filler], []], top);
  const n2 = applyAction(s2, { type: 'play', playerId: 'p0', cardId: rev.id });
  assert(n2.turn === 0, '2P reverse should skip back to self');
});
test('draw2 forces pending draw on next player', () => {
  const d = uno();
  const top = one(d, (c) => c.color === 'red' && c.rank === '3');
  const draw2 = one(d, (c) => c.color === 'red' && c.action === 'draw2');
  const filler = one(d, (c) => c.color === 'red' && c.rank === '9' && c.id !== draw2.id);
  const s = rigged('uno108', [[draw2, filler], []], top);
  let n = applyAction(s, { type: 'play', playerId: 'p0', cardId: draw2.id });
  assert(n.pendingDraw === 2 && n.turn === 1, 'pendingDraw not set');
  assert(legalPlays(n, 'p1').length === 0, 'forced player has plays');
  const before = n.players[1].hand.length;
  n = applyAction(n, { type: 'draw', playerId: 'p1' });
  assert(n.players[1].hand.length === before + 2, 'did not draw 2');
  assert(n.pendingDraw === 0 && n.turn === 0, 'turn did not pass after penalty');
});
test('win: empty hand ends shedding game', () => {
  const d = uno();
  const top = one(d, (c) => c.color === 'red' && c.rank === '3');
  const s = rigged('uno108', [[one(d, (c) => c.color === 'red' && c.rank === '5')], [one(d, (c) => c.color === 'blue' && c.rank === '1')]], top);
  const n = applyAction(s, { type: 'play', playerId: 'p0', cardId: s.players[0].hand[0].id });
  assert(n.phase === 'gameOver' && n.winnerId === 'p0', 'win not detected');
  assert(n.winningCard?.rank === '5', 'winning card not recorded');
  throws(() => applyAction(n, { type: 'draw', playerId: 'p1' }), 'action after game over allowed');
});
test('points race: loser banks hand points, lowest total wins', () => {
  const d = uno();
  const top = one(d, (c) => c.color === 'red' && c.rank === '3');
  const s = createGame(RB('uno108', 'pointsRace'), SEATS(2), { seed: 1, rounds: 1 });
  s.players[0].hand = [one(d, (c) => c.color === 'red' && c.rank === '5')];
  s.players[1].hand = [one(d, (c) => c.color === 'blue' && c.action === 'draw2'), one(d, (c) => c.color === 'green' && c.rank === '4')];
  s.discardPile = [top];
  s.activeColor = matchColor(top);
  s.turn = 0;
  const n = applyAction(s, { type: 'play', playerId: 'p0', cardId: s.players[0].hand[0].id });
  assert(n.phase === 'gameOver', 'should end after 1 round');
  assert(n.players[1].score === 24, `p1 score ${n.players[1].score} != 24`);
  assert(n.winnerId === 'p0', 'lowest score did not win');
});

// --- bots -------------------------------------------------------------------
test('easy bot always returns a legal action', () => {
  const rng = mulberry32(99);
  for (let i = 0; i < 50; i++) {
    const s = createGame(RB('uno108', 'shedding'), SEATS(4), { seed: i });
    const me = currentPlayer(s).id;
    const a = chooseAction(s, me, 'easy', { rng });
    assert(a !== null, 'null action on fresh game');
    if (a !== null && a.type === 'play') {
      const card = s.players[s.turn].hand.find((c) => c.id === a.cardId);
      assert(!!card && isLegalPlay(s.discardPile[s.discardPile.length - 1], s.activeColor, card), 'easy played illegally');
    }
  }
});
test('medium bot holds wilds while alternatives exist', () => {
  const d = uno();
  const top = one(d, (c) => c.color === 'red' && c.rank === '3');
  const wild = one(d, (c) => c.action === 'wild');
  const red5 = one(d, (c) => c.color === 'red' && c.rank === '5');
  const blue7 = one(d, (c) => c.color === 'blue' && c.rank === '7');
  const s = rigged('uno108', [[wild, red5, blue7], []], top);
  const id = playedCardId(chooseAction(s, 'p0', 'medium', { rng: mulberry32(1) }), 'medium returned no play');
  assert(id !== wild.id, 'medium burned a wild it should hold');
});
test('hard bot hits the leader with disruption', () => {
  const d = uno();
  const top = one(d, (c) => c.color === 'red' && c.rank === '5');
  const draw2 = one(d, (c) => c.color === 'red' && c.action === 'draw2');
  const red9a = one(d, (c) => c.color === 'red' && c.rank === '9');
  const red9b = one(d, (c) => c.color === 'red' && c.rank === '9' && c.id !== red9a.id);
  const green2 = one(d, (c) => c.color === 'green' && c.rank === '2');
  const blue1 = one(d, (c) => c.color === 'blue' && c.rank === '1');
  // p0 = hard bot, p1 = leader (1 card, sits next), p2 safe.
  const s = rigged('uno108', [[draw2, red9a], [blue1], [red9b, green2]], top);
  const id = playedCardId(chooseAction(s, 'p0', 'hard', { rng: mulberry32(1) }), 'hard returned no play');
  const played = s.players[0].hand.find((c) => c.id === id);
  assert(played?.action === 'draw2', 'hard did not target the leader');
});
test('personas: 12 identities, deterministic seats', () => {
  assert(BOT_PERSONAS.length >= 12, 'fewer than 12 personas');
  assert(new Set(BOT_PERSONAS.map((p) => p.name)).size === BOT_PERSONAS.length, 'duplicate persona names');
  assert(personaForSeat(0).name === personaForSeat(12).name, 'seat mapping not stable');
});

// --- full simulations -------------------------------------------------------
function simGame(deck: Rulebook['deck'], template: Rulebook['template'], seats: number, seed: number, rounds = 2): GameState {
  let s = createGame(RB(deck, template), SEATS(seats), { seed, rounds });
  let guard = 0;
  while (s.phase !== 'gameOver' && guard++ < 20000) {
    const me = currentPlayer(s).id;
    s = playBotTurn(s, me, 'medium', seed + guard);
  }
  assert(s.phase === 'gameOver', `${deck}/${template} did not terminate`);
  assert(!!s.winnerId, 'no winner recorded');
  assert(s.log.length > 0, 'empty action log');
  return s;
}
test('sim: uno108 shedding 4P terminates', () => {
  simGame('uno108', 'shedding', 4, 11);
});
test('sim: classic52 shedding 3P terminates', () => {
  simGame('classic52', 'shedding', 3, 22);
});
test('sim: baloot32 shedding 2P terminates', () => {
  simGame('baloot32', 'shedding', 2, 33);
});
test('sim: animals12 shedding 4P terminates (stalemate-safe)', () => {
  const s = simGame('animals12', 'shedding', 4, 44);
  assert(s.log.length < 500, `stalemate took too long: ${s.log.length} actions`);
});
test('animals12: winner claims the animal on the winning card', () => {
  const ad = buildDeck('animals12', ALL_ON, {}, 7);
  const falcon = one(ad, (c) => c.animal === 'falcon'); // red
  const top = one(ad, (c) => c.color === 'red' && c.animal !== 'falcon');
  const other = one(ad, (c) => c.color === 'blue');
  const s = rigged('animals12', [[falcon], [other]], top);
  const n = applyAction(s, { type: 'play', playerId: 'p0', cardId: falcon.id });
  assert(n.phase === 'gameOver' && n.winnerId === 'p0', 'win not detected');
  assert(n.winningCard?.animal === 'falcon', 'winning animal not recorded for title mechanic');
});
test('stalemate: dead round goes to fewest cards', () => {
  // The exact livelock the sims caught, rigged deterministically: only green
  // cards can ever be played, so they cycle through the draw pile forever
  // while dead cards sit in hands. The table must call it.
  const ad = buildDeck('animals12', ALL_ON, {}, 7);
  const by = (animal: string) => one(ad, (c) => c.animal === animal);
  const s = rigged(
    'animals12',
    [
      [by('camel'), by('owl')], // p0: 2 dead yellows
      [by('oryx'), by('lion')], // p1: 2 dead blues
      [by('falcon')], // p2: 1 dead red — fewest cards
      [by('scorpion'), by('cobra')], // p3: 2 dead cards
    ],
    by('horse'), // green top; active color green
  );
  s.drawPile = [by('gazelle'), by('wolf'), by('fox'), by('hawk')];
  let g = s;
  let guard = 0;
  while (g.phase !== 'gameOver' && guard++ < 200) {
    const me = currentPlayer(g).id;
    g = playBotTurn(g, me, 'medium', 1000 + guard);
  }
  assert(g.phase === 'gameOver', 'stalemate did not resolve');
  assert(g.winnerId === 'p2', `fewest-cards player should win stalemate, got ${g.winnerId}`);
  assert(g.winningCard === null, 'stalemate should record no winning card');
  assert(g.log.length < 100, `stalemate took too long: ${g.log.length} actions`);
});
test('sim: uno108 points race 3P terminates, lowest score wins', () => {
  const s = simGame('uno108', 'pointsRace', 3, 55, 2);
  const w = s.players.find((p) => p.id === s.winnerId);
  assert(!!w, 'winner missing');
  assert(s.players.every((p) => p.score >= (w as { score: number }).score), 'winner is not lowest score');
  assert(s.round === 2, `expected 2 rounds, got ${s.round}`);
});

// --- report -----------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} test(s) failed`);
