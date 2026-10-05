// economy/ — coins, gifts, VIP (spec §8).
// Halal guardrails (locked): coins never cashed out, never staked on
// outcomes; winners get XP/ranks, never coins; no randomized purchases.

import type { CoinPackSku } from '../lib/billing';

export interface CoinPack {
  sku: CoinPackSku;
  coins: number;
}

/** Coin grant per pack. Prices TBD in Play Console (spec §16). */
export const COIN_PACKS: CoinPack[] = [
  { sku: 'houserules_coins_100', coins: 100 },
  { sku: 'houserules_coins_550', coins: 550 },
  { sku: 'houserules_coins_1500', coins: 1500 },
];

/** A gift players send mid-game. Bought individually — never in loot boxes. */
export interface Gift {
  id: string;
  /** i18n key under gifts.* */
  nameKey: string;
  costCoins: number;
  /** Lottie animation asset name (added with gift art). */
  animation: string;
  /** Emoji art for the animated bounce overlay (lottie-react-native is web-unreliable). */
  emoji: string;
  vipOnly: boolean;
}

export const GIFTS: Gift[] = [
  { id: 'flower', nameKey: 'flower', costCoins: 10, animation: 'gift-flower', emoji: '🌹', vipOnly: false },
  { id: 'juice', nameKey: 'juice', costCoins: 15, animation: 'gift-juice', emoji: '🧃', vipOnly: false },
  { id: 'falcon', nameKey: 'falcon', costCoins: 100, animation: 'gift-falcon', emoji: '🦅', vipOnly: true },
];
