// Game engine domain types (spec §5–§6).
// The engine enforces rules server-authoritatively later; these types are
// the shared vocabulary between engine/, bots/ and realtime/.

/** The four v1 decks. Locked — no fifth until players demand it. */
export type DeckKind = 'classic52' | 'uno108' | 'baloot32' | 'animals12';

/** The two v1 rule templates. Mix-and-match with any deck. */
export type RuleTemplate = 'shedding' | 'pointsRace';

export interface SpecialCardToggles {
  skip: boolean;
  reverse: boolean;
  drawTwo: boolean;
  wild: boolean;
  wildDrawFour: boolean;
}

export type WinCondition = 'emptyHand' | 'lowestScore';

/**
 * A rulebook = a saved preset bundle (spec §6). v1 ships templates only;
 * the builder wizard (phase 2) lets players compose these.
 */
export interface Rulebook {
  id: string;
  name: string;
  deck: DeckKind;
  template: RuleTemplate;
  specials: SpecialCardToggles;
  winCondition: WinCondition;
  minPlayers: number; // 2..8
  maxPlayers: number; // 2..8
  turnSeconds: number; // 0 = no timer
}

/** A table instance players sit at. */
export interface TableConfig {
  id: string;
  rulebook: Rulebook;
  isVip: boolean;
  isHouse: boolean;
  roomCode: string | null; // 6-letter code for private tables
}

export const DECK_CARD_COUNTS: Record<DeckKind, number> = {
  classic52: 52,
  uno108: 108,
  baloot32: 32,
  animals12: 12,
};
