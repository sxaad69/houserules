// builder/types.ts — Rulebook Builder data model (Phase 2, spec §6).
// The wizard composes a RulebookDraft (UI-friendly); buildRulebook()
// compiles it into the engine's Rulebook shape — no new engine mechanics,
// just configuration. CustomRulebook extends Rulebook with the builder's
// extra settings (rounds, themes, jokers) so it drops into createGame().

import type {
  DeckKind,
  Rulebook,
  RuleTemplate,
  SpecialCardToggles,
  WinCondition,
} from '../engine/types';

/** Everything the wizard collects. Templates + toggles only — no scripting. */
export interface RulebookDraft {
  template: RuleTemplate;
  deck: DeckKind;
  specials: SpecialCardToggles;
  /** classic52 only — jokers act as wilds. */
  includeJokers: boolean;
  winCondition: WinCondition;
  /** Points Race only — how many rounds. 1..10. */
  rounds: number;
  /** Total seats at the table, human included. 2..6. */
  playerCount: number;
  /** 0 = no timer. Seconds per turn otherwise. */
  turnSeconds: number;
  /** Curated card-back design id (builder/themes.ts). */
  cardBackId: string;
  /** Curated felt theme id (builder/themes.ts). */
  feltThemeId: string;
  name: string;
}

/**
 * A saved custom rulebook. Extends the engine Rulebook so TableScreen and
 * createGame() accept it anywhere a Rulebook is expected.
 */
export interface CustomRulebook extends Rulebook {
  kind: 'custom';
  rounds: number;
  includeJokers: boolean;
  cardBackId: string;
  feltThemeId: string;
  createdAt: number;
}

export const DEFAULT_DRAFT: RulebookDraft = {
  template: 'shedding',
  deck: 'uno108',
  specials: { skip: true, reverse: true, drawTwo: true, wild: true, wildDrawFour: true },
  includeJokers: false,
  winCondition: 'emptyHand',
  rounds: 3,
  playerCount: 4,
  turnSeconds: 0,
  cardBackId: 'midnight',
  feltThemeId: 'royal',
  name: '',
};

function uid(): string {
  return `rb-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * Compile a draft into a playable rulebook. Pure — no storage, no UI.
 * Halal guardrail: there is deliberately no coin/wager field anywhere in
 * the draft; winners earn XP/ranks, never coins (spec §8).
 */
export function buildRulebook(draft: RulebookDraft, id: string = uid()): CustomRulebook {
  const name = draft.name.trim().slice(0, 40) || 'Untitled Rulebook';
  const playerCount = Math.min(6, Math.max(2, Math.round(draft.playerCount)));
  return {
    kind: 'custom',
    id,
    name,
    deck: draft.deck,
    template: draft.template,
    specials: { ...draft.specials },
    winCondition: draft.template === 'pointsRace' ? 'lowestScore' : 'emptyHand',
    minPlayers: playerCount,
    maxPlayers: playerCount,
    // Turn timer is stored on the rulebook; the local engine doesn't enforce
    // it yet (bots + human table) — multiplayer tables will (Phase 2 track).
    turnSeconds: draft.turnSeconds,
    rounds: Math.min(10, Math.max(1, Math.round(draft.rounds))),
    includeJokers: draft.deck === 'classic52' && draft.includeJokers,
    cardBackId: draft.cardBackId,
    feltThemeId: draft.feltThemeId,
    createdAt: Date.now(),
  };
}

/** Type guard for params coming over navigation (untyped at runtime). */
export function isCustomRulebook(v: unknown): v is CustomRulebook {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { kind?: unknown }).kind === 'custom' &&
    typeof (v as { id?: unknown }).id === 'string'
  );
}
