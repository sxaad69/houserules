// engine/cards.ts — unified card model + the four v1 deck builders (spec §5).
// One card type for all decks (ponytail: no per-deck class hierarchies).
// Pure logic, zero UI, zero dependencies.

import type { DeckKind } from './types';
import type { SpecialCardToggles } from './types';

export type UnoColor = 'red' | 'yellow' | 'green' | 'blue';
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type CardAction = 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface Card {
  /** Unique within a built deck, e.g. "uno108-42". */
  id: string;
  deck: DeckKind;
  /** uno108 + animals12. Null for classic/baloot (suit acts as color there). */
  color: UnoColor | null;
  suit: Suit | null; // classic52 + baloot32
  /** '0'-'10','J','Q','K','A','JOKER', or an animal id for animals12. */
  rank: string;
  action: CardAction | null;
  /** animals12 only — drives the winner-claims-animal title mechanic. */
  animal: string | null;
}

/** The 12 signature animals (spec §5). Regional flavor, globally readable. */
export const ANIMALS = [
  'falcon',
  'camel',
  'horse',
  'oryx',
  'fox',
  'owl',
  'gazelle',
  'lion',
  'hawk',
  'cobra',
  'wolf',
  'scorpion',
] as const;

const UNO_COLORS: UnoColor[] = ['red', 'yellow', 'green', 'blue'];
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

/** Seeded RNG (mulberry32) — deterministic games for tests and replays. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates on a copy; never mutates the input. */
export function shuffle<T>(cards: T[], rng: () => number): T[] {
  const a = cards.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let uid = 0;
function mk(deck: DeckKind, c: Omit<Card, 'id' | 'deck'>): Card {
  return { ...c, id: `${deck}-${uid++}`, deck };
}

function buildClassic52(includeJokers: boolean): Card[] {
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const cards: Card[] = [];
  for (const suit of SUITS)
    for (const rank of ranks)
      cards.push(mk('classic52', { color: null, suit, rank, action: null, animal: null }));
  if (includeJokers)
    for (let i = 0; i < 2; i++)
      // ponytail: joker = wild; the player declares a suit as the "color".
      cards.push(mk('classic52', { color: null, suit: null, rank: 'JOKER', action: 'wild', animal: null }));
  return cards;
}

function buildUno108(t: SpecialCardToggles): Card[] {
  const cards: Card[] = [];
  for (const color of UNO_COLORS) {
    cards.push(mk('uno108', { color, suit: null, rank: '0', action: null, animal: null }));
    for (const rank of ['1', '2', '3', '4', '5', '6', '7', '8', '9'])
      for (let i = 0; i < 2; i++)
        cards.push(mk('uno108', { color, suit: null, rank, action: null, animal: null }));
    // ponytail: toggles filter the deck at build time — a disabled special
    // simply doesn't exist, so the engine never special-cases it later.
    if (t.skip) for (let i = 0; i < 2; i++) cards.push(mk('uno108', { color, suit: null, rank: 'SKIP', action: 'skip', animal: null }));
    if (t.reverse) for (let i = 0; i < 2; i++) cards.push(mk('uno108', { color, suit: null, rank: 'REVERSE', action: 'reverse', animal: null }));
    if (t.drawTwo) for (let i = 0; i < 2; i++) cards.push(mk('uno108', { color, suit: null, rank: 'DRAW2', action: 'draw2', animal: null }));
  }
  if (t.wild) for (let i = 0; i < 4; i++) cards.push(mk('uno108', { color: null, suit: null, rank: 'WILD', action: 'wild', animal: null }));
  if (t.wildDrawFour) for (let i = 0; i < 4; i++) cards.push(mk('uno108', { color: null, suit: null, rank: 'WILD4', action: 'wild4', animal: null }));
  return cards;
}

function buildBaloot32(): Card[] {
  const ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const cards: Card[] = [];
  for (const suit of SUITS)
    for (const rank of ranks)
      cards.push(mk('baloot32', { color: null, suit, rank, action: null, animal: null }));
  return cards;
}

function buildAnimals12(): Card[] {
  // 4 color families × 3 unique animals — match by color OR animal (spec §6).
  return ANIMALS.map((animal, i) =>
    mk('animals12', {
      color: UNO_COLORS[i % UNO_COLORS.length],
      suit: null,
      rank: animal,
      action: null,
      animal,
    }),
  );
}

export interface DeckOptions {
  includeJokers?: boolean; // classic52 only
}

/** Build + shuffle a deck. Pass the same seed for a reproducible deal. */
export function buildDeck(
  deck: DeckKind,
  toggles: SpecialCardToggles,
  opts: DeckOptions = {},
  seed: number = Date.now(),
): Card[] {
  uid = 0; // deterministic ids per build — keeps replays stable
  const rng = mulberry32(seed);
  switch (deck) {
    case 'classic52':
      return shuffle(buildClassic52(!!opts.includeJokers), rng);
    case 'uno108':
      return shuffle(buildUno108(toggles), rng);
    case 'baloot32':
      return shuffle(buildBaloot32(), rng);
    case 'animals12':
      return shuffle(buildAnimals12(), rng);
  }
}

/** Points a card is worth when a round ends (Points Race scoring). */
export function cardPoints(card: Card): number {
  if (card.deck === 'uno108') {
    if (card.action === 'wild' || card.action === 'wild4') return 50;
    if (card.action) return 20;
    return parseInt(card.rank, 10) || 0;
  }
  if (card.deck === 'animals12') return 5;
  // classic52 + baloot32
  if (card.rank === 'JOKER') return 25;
  if (card.rank === 'A') return 15;
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10;
  return parseInt(card.rank, 10) || 0;
}

/** The "color" used for matching: uno/animal color, else the suit. */
export function matchColor(card: Card): string | null {
  return card.color ?? card.suit;
}

/**
 * Shedding match rule (spec §6): wilds always playable, otherwise match
 * color/suit, rank, or animal against the top discard (+ active wild color).
 */
export function isLegalPlay(top: Card, activeColor: string | null, card: Card): boolean {
  if (card.action === 'wild' || card.action === 'wild4') return true;
  const eff = activeColor ?? matchColor(top);
  if (eff && matchColor(card) === eff) return true;
  if (card.rank === top.rank) return true;
  if (card.animal && top.animal && card.animal === top.animal) return true;
  return false;
}
