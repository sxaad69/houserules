import type { DeckKind } from '../engine/types';

// ponytail: static "How to play" content per deck. Short, visual, no walls of text.
// These power the deck guide sheets and double as onboarding content.

export interface GuideSection {
  title: string;
  body: string;
}

export interface DeckGuide {
  deck: DeckKind;
  title: string;
  tagline: string;
  sections: GuideSection[];
  tips: string[];
}

export const DECK_GUIDES: Record<DeckKind, DeckGuide> = {
  uno108: {
    deck: 'uno108',
    title: 'Uno-style 108',
    tagline: 'Match color or number. Empty your hand first.',
    sections: [
      {
        title: 'Goal',
        body: 'Be the first to play all your cards. When you have one card left, call it out!',
      },
      {
        title: 'Playing a card',
        body: 'Match the top card by color, number, or symbol. No match? Draw a card instead.',
      },
      {
        title: 'Special cards',
        body: 'Skip jumps the next player. Reverse flips turn order. +2 makes the next player draw two. Wild lets you pick any color. Wild +4 picks the color AND makes the next player draw four.',
      },
    ],
    tips: [
      'Save your Wilds for when you have no matching color.',
      '+4 on +4 stacks the pain — watch out.',
      'Count colors in your hand; play the color you have most of.',
    ],
  },
  classic52: {
    deck: 'classic52',
    title: 'Classic 52',
    tagline: 'The standard deck. Endless games.',
    sections: [
      {
        title: 'Goal',
        body: 'Depends on the table rules — usually empty your hand or score the fewest points.',
      },
      {
        title: 'Playing a card',
        body: 'Match the top card by suit or rank, following the table rules.',
      },
      {
        title: 'Special cards',
        body: 'Special effects depend on the custom rulebook — check the table rules before you sit down.',
      },
    ],
    tips: [
      'Read the table rules summary before joining.',
      'Jokers can play as wilds if the rulebook allows.',
    ],
  },
  baloot32: {
    deck: 'baloot32',
    title: '32-card',
    tagline: 'A tighter deck for faster shedding games.',
    sections: [
      {
        title: 'The deck',
        body: '32 cards: 7 through Ace in all four suits. Fewer ranks means faster, sharper games.',
      },
      {
        title: 'Goal',
        body: 'Same shedding rules — empty your hand first. The small deck makes every card count.',
      },
    ],
    tips: [
      'With only 8 ranks, matching is easier — plan your Wilds carefully.',
      'Games are quick. Rematch is one tap away.',
    ],
  },
  animals12: {
    deck: 'animals12',
    title: 'Animals 12',
    tagline: 'Claim the animal. Become the title holder.',
    sections: [
      {
        title: 'Goal',
        body: 'Win the round to claim the animal title. Titles are shown on your profile.',
      },
      {
        title: 'The animals',
        body: '12 animals, each with its own card. Winners collect titles across games.',
      },
    ],
    tips: [
      'Titles are permanent bragging rights — defend yours.',
      'Check the gallery to see which animals are still unclaimed.',
    ],
  },
};

export function getDeckGuide(deck: DeckKind): DeckGuide {
  return DECK_GUIDES[deck];
}
