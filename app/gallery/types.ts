// gallery/types.ts — Community Gallery domain (Phase 2, spec §6).
//
// Halal guardrails (locked, spec §8): the gallery is about rulebooks, ratings
// and play counts only. No coins, no wagers, no prizes anywhere in this track.

import type { DeckKind, RuleTemplate } from '../engine/types';
import type { CustomRulebook } from '../builder/types';

/** One browsable rulebook in the community gallery. */
export interface GalleryEntry {
  /** Stable id: `seed-*` for seeds, `pub-*` for user-published. */
  id: string;
  /** The playable rulebook. House presets are synthesized as CustomRulebook. */
  rulebook: CustomRulebook;
  author: string;
  /** Fictional seed play counts — clearly seed data, replaced by backend later. */
  plays: number;
  /** 0–5 average. Seeds carry fictional averages; user ratings blend in. */
  rating: number;
  ratingsCount: number;
  /** "Humans playing now" — seeded fiction for a few entries, else 0. */
  humansNow: number;
  createdAt: number;
  /** Curated by the HouseRules team. */
  featured?: boolean;
  /** Published from this device's "My Rulebooks". */
  mine?: boolean;
}

export type DeckFilter = 'all' | DeckKind;
export type PlayersFilter = 'all' | 2 | 3 | 4 | 5 | 6;

export interface GalleryFilters {
  deck: DeckFilter;
  players: PlayersFilter;
  /** Minimum star rating, 0 = any. */
  minRating: number;
  /** Only entries with humans playing now. */
  liveOnly: boolean;
}

export const DEFAULT_FILTERS: GalleryFilters = {
  deck: 'all',
  players: 'all',
  minRating: 0,
  liveOnly: false,
};

export type GallerySort = 'popular' | 'topRated' | 'newest';

export const DECK_FILTERS: DeckFilter[] = ['all', 'uno108', 'classic52', 'baloot32', 'animals12'];
export const PLAYERS_FILTERS: PlayersFilter[] = ['all', 2, 3, 4, 5, 6];

/** Templates the gallery understands (matches engine). */
export type { RuleTemplate };
