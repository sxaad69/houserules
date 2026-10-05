// builder/storage.ts — persist named rulebooks locally (Phase 2).
// Community gallery/sharing is a separate track; this is "My Rulebooks".

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isCustomRulebook, type CustomRulebook } from './types';

const KEY = '@houserules:rulebooks/v1';

/** Newest first. Corrupt entries are dropped, never thrown. */
export async function loadRulebooks(): Promise<CustomRulebook[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown[];
    return arr
      .filter(isCustomRulebook)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveRulebook(rb: CustomRulebook): Promise<CustomRulebook[]> {
  const list = await loadRulebooks();
  const next = [rb, ...list.filter((x) => x.id !== rb.id)];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function deleteRulebook(id: string): Promise<CustomRulebook[]> {
  const list = await loadRulebooks();
  const next = list.filter((x) => x.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
