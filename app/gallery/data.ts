// gallery/data.ts — local gallery data + the backend seam.
//
// v1 ships with seeded fictional entries. When the Supabase backend lands,
// replace the body of `fetchGallery` with a Supabase query — the signature
// stays the same and every screen keeps working. Seed play counts / ratings /
// "humans now" are clearly fictional placeholders, not real activity.

import type { DeckKind } from '../engine/types';
import type { CustomRulebook } from '../builder/types';
import type {
  GalleryEntry,
  GalleryFilters,
  GallerySort,
} from './types';
import { loadPublished } from './storage';

const ALL_ON = { skip: true, reverse: true, drawTwo: true, wild: true, wildDrawFour: true };
const NONE = { skip: false, reverse: false, drawTwo: false, wild: false, wildDrawFour: false };

interface SeedSpec {
  id: string;
  name: string;
  author: string;
  deck: DeckKind;
  template: 'shedding' | 'pointsRace';
  players: number;
  specials?: typeof ALL_ON;
  rounds?: number;
  plays: number;
  rating: number;
  ratingsCount: number;
  humansNow?: number;
  featured?: boolean;
  daysAgo: number;
}

const SEEDS: SeedSpec[] = [
  { id: 'seed-majlis', name: 'Majlis Nights', author: 'Layla', deck: 'baloot32', template: 'shedding', players: 4, plays: 1840, rating: 4.8, ratingsCount: 212, humansNow: 14, featured: true, daysAgo: 21 },
  { id: 'seed-falcon', name: 'Falcon Sprint', author: 'Omar', deck: 'animals12', template: 'shedding', players: 3, plays: 1520, rating: 4.7, ratingsCount: 188, humansNow: 9, featured: true, daysAgo: 18 },
  { id: 'seed-desert', name: 'Desert Duel', author: 'ياسمين', deck: 'uno108', template: 'shedding', players: 2, specials: { ...ALL_ON, wildDrawFour: false }, plays: 1310, rating: 4.6, ratingsCount: 154, humansNow: 6, daysAgo: 15 },
  { id: 'seed-oasis', name: 'Oasis Points', author: 'Kareem', deck: 'classic52', template: 'pointsRace', players: 4, rounds: 5, plays: 1180, rating: 4.5, ratingsCount: 141, daysAgo: 12 },
  { id: 'seed-caravan', name: 'Caravan Chaos', author: 'نور', deck: 'uno108', template: 'shedding', players: 6, plays: 990, rating: 4.4, ratingsCount: 120, humansNow: 4, daysAgo: 10 },
  { id: 'seed-sirocco', name: 'Sirocco Six', author: 'Tariq', deck: 'baloot32', template: 'pointsRace', players: 6, rounds: 4, plays: 870, rating: 4.3, ratingsCount: 98, daysAgo: 9 },
  { id: 'seed-pearl', name: 'Pearl Diving', author: 'Salma', deck: 'animals12', template: 'pointsRace', players: 3, rounds: 3, plays: 760, rating: 4.5, ratingsCount: 88, daysAgo: 7 },
  { id: 'seed-dune', name: 'Dune Runners', author: 'حسن', deck: 'uno108', template: 'shedding', players: 4, specials: { ...NONE, skip: true, reverse: true }, plays: 640, rating: 4.2, ratingsCount: 74, daysAgo: 6 },
  { id: 'seed-ember', name: 'Ember Classic', author: 'Falcon', deck: 'classic52', template: 'shedding', players: 2, plays: 520, rating: 4.1, ratingsCount: 61, daysAgo: 5 },
  { id: 'seed-zephyr', name: 'Zephyr Wilds', author: 'Mirage', deck: 'uno108', template: 'shedding', players: 5, plays: 430, rating: 4.0, ratingsCount: 52, daysAgo: 4 },
  { id: 'seed-nomad', name: "Nomad's Table", author: 'Sahara', deck: 'baloot32', template: 'shedding', players: 3, plays: 310, rating: 3.9, ratingsCount: 37, daysAgo: 2 },
  { id: 'seed-crescent', name: 'Crescent Cup', author: 'ليلى', deck: 'animals12', template: 'shedding', players: 4, plays: 190, rating: 4.6, ratingsCount: 22, daysAgo: 1 },
];

const NOW = Date.now();
const DAY = 86_400_000;

function seedToEntry(s: SeedSpec): GalleryEntry {
  const rulebook: CustomRulebook = {
    kind: 'custom',
    id: s.id,
    name: s.name,
    deck: s.deck,
    template: s.template,
    specials: s.specials ?? ALL_ON,
    winCondition: s.template === 'pointsRace' ? 'lowestScore' : 'emptyHand',
    minPlayers: s.players,
    maxPlayers: s.players,
    turnSeconds: 0,
    rounds: s.rounds ?? 3,
    includeJokers: false,
    cardBackId: 'midnight',
    feltThemeId: 'royal',
    createdAt: NOW - s.daysAgo * DAY,
  };
  return {
    id: s.id,
    rulebook,
    author: s.author,
    plays: s.plays,
    rating: s.rating,
    ratingsCount: s.ratingsCount,
    humansNow: s.humansNow ?? 0,
    createdAt: rulebook.createdAt,
    featured: s.featured,
  };
}

/**
 * Fetch gallery entries, filtered + sorted.
 *
 * v1: local seed data + user-published entries from AsyncStorage.
 * Later: replace the seed read with a Supabase query — signature unchanged.
 */
export async function fetchGallery(
  filters: GalleryFilters,
  sort: GallerySort,
): Promise<GalleryEntry[]> {
  // Simulate the async boundary a real backend would have.
  await Promise.resolve();

  const published = await loadPublished();
  const publishedEntries: GalleryEntry[] = published.map((rb) => ({
    id: `pub-${rb.id}`,
    rulebook: rb,
    author: rb.name, // replaced at render time with localized "you"
    plays: 0,
    rating: 0,
    ratingsCount: 0,
    humansNow: 0,
    createdAt: rb.createdAt,
    mine: true,
  }));

  let entries = [...SEEDS.map(seedToEntry), ...publishedEntries];

  if (filters.deck !== 'all') entries = entries.filter((e) => e.rulebook.deck === filters.deck);
  if (filters.players !== 'all') entries = entries.filter((e) => e.rulebook.maxPlayers === filters.players);
  if (filters.minRating > 0) entries = entries.filter((e) => e.rating >= filters.minRating || e.mine);
  if (filters.liveOnly) entries = entries.filter((e) => e.humansNow > 0);

  switch (sort) {
    case 'popular':
      entries.sort((a, b) => b.plays - a.plays);
      break;
    case 'topRated':
      entries.sort((a, b) => b.rating - a.rating || b.ratingsCount - a.ratingsCount);
      break;
    case 'newest':
      entries.sort((a, b) => b.createdAt - a.createdAt);
      break;
  }
  return entries;
}

/** Look up a single entry by id (detail screen). */
export async function fetchEntry(id: string): Promise<GalleryEntry | null> {
  const all = await fetchGallery(
    { deck: 'all', players: 'all', minRating: 0, liveOnly: false },
    'popular',
  );
  return all.find((e) => e.id === id) ?? null;
}

/** Random entry for Quick Match — prefers live/featured/popular tables. */
export async function pickQuickMatch(): Promise<GalleryEntry | null> {
  const all = await fetchGallery(
    { deck: 'all', players: 'all', minRating: 0, liveOnly: false },
    'popular',
  );
  if (all.length === 0) return null;
  const pool = all.slice(0, Math.min(6, all.length));
  return pool[Math.floor(Math.random() * pool.length)];
}
