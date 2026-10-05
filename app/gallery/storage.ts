// gallery/storage.ts — local persistence for the gallery track (Phase 2).
// User-published rulebooks, per-entry star ratings, per-rulebook play counts
// (drives the creator nudge), and nudge shown/dismissed state.
// All local-only; the Supabase backend replaces reads in data.ts later.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isCustomRulebook, type CustomRulebook } from '../builder/types';

const PUBLISHED_KEY = '@houserules:gallery-published/v1';
const RATINGS_KEY = '@houserules:gallery-ratings/v1';
const PLAYS_KEY = '@houserules:gallery-plays/v1';
const NUDGE_KEY = '@houserules:gallery-nudge/v1';

/** Rulebooks this device published to the gallery. Newest first. */
export async function loadPublished(): Promise<CustomRulebook[]> {
  try {
    const raw = await AsyncStorage.getItem(PUBLISHED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown[];
    return arr.filter(isCustomRulebook).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/** Publish a "My Rulebooks" entry to the gallery. Idempotent per rulebook id. */
export async function publishRulebook(rb: CustomRulebook): Promise<CustomRulebook[]> {
  const list = await loadPublished();
  const next = [rb, ...list.filter((x) => x.id !== rb.id)];
  await AsyncStorage.setItem(PUBLISHED_KEY, JSON.stringify(next));
  return next;
}

/** Remove a published rulebook (unpublish). */
export async function unpublishRulebook(id: string): Promise<CustomRulebook[]> {
  const list = await loadPublished();
  const next = list.filter((x) => x.id !== id);
  await AsyncStorage.setItem(PUBLISHED_KEY, JSON.stringify(next));
  return next;
}

export async function isPublished(id: string): Promise<boolean> {
  const list = await loadPublished();
  return list.some((x) => x.id === id);
}

// ---------------------------------------------------------------------------
// Star ratings (local only).
// ---------------------------------------------------------------------------

export async function loadRatings(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(RATINGS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** Rate an entry 1–5 stars. Returns the updated map. */
export async function rateEntry(entryId: string, stars: number): Promise<Record<string, number>> {
  const map = await loadRatings();
  const clamped = Math.min(5, Math.max(1, Math.round(stars)));
  const next = { ...map, [entryId]: clamped };
  await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(next));
  return next;
}

// ---------------------------------------------------------------------------
// Play counts → creator nudge (spec §6: after 3 plays, nudge the maker).
// ---------------------------------------------------------------------------

export async function loadPlayCounts(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(PLAYS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** Record one finished game for a rulebook id. Returns the new count. */
export async function recordPlay(rulebookId: string): Promise<number> {
  const map = await loadPlayCounts();
  const next = (map[rulebookId] ?? 0) + 1;
  await AsyncStorage.setItem(PLAYS_KEY, JSON.stringify({ ...map, [rulebookId]: next }));
  return next;
}

type NudgeState = Record<string, 'shown' | 'dismissed'>;

async function loadNudge(): Promise<NudgeState> {
  try {
    const raw = await AsyncStorage.getItem(NUDGE_KEY);
    return raw ? (JSON.parse(raw) as NudgeState) : {};
  } catch {
    return {};
  }
}

export async function nudgeStateFor(rulebookId: string): Promise<'shown' | 'dismissed' | null> {
  const map = await loadNudge();
  return map[rulebookId] ?? null;
}

export async function markNudgeShown(rulebookId: string): Promise<void> {
  const map = await loadNudge();
  await AsyncStorage.setItem(NUDGE_KEY, JSON.stringify({ ...map, [rulebookId]: 'shown' }));
}

export async function dismissNudge(rulebookId: string): Promise<void> {
  const map = await loadNudge();
  await AsyncStorage.setItem(NUDGE_KEY, JSON.stringify({ ...map, [rulebookId]: 'dismissed' }));
}

export async function clearAllGalleryLocal(): Promise<void> {
  await AsyncStorage.multiRemove([PUBLISHED_KEY, RATINGS_KEY, PLAYS_KEY, NUDGE_KEY]);
}
