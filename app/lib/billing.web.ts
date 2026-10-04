import type { Purchase } from 'react-native-iap';

// Web stub for the billing module. Metro resolves `billing.web.ts` instead
// of `billing.ts` on web, so the native react-native-iap module is never
// loaded (type-only import is erased at compile time). All purchases are
// no-ops; VIP/coins state still persists via AsyncStorage (localStorage).
// (CrazyGames IAP is invite-only — portals monetize via ads; see spec §8.)
//
// NOTE: constants are duplicated here (not re-exported from './billing')
// because on web './billing' resolves to THIS file — importing it would be
// circular. Keep both files' SKU lists in sync.

export const VIP_MONTHLY_SKU = 'houserules_vip_monthly';

export const COIN_PACK_SKUS = [
  'houserules_coins_100',
  'houserules_coins_550',
  'houserules_coins_1500',
] as const;

export type CoinPackSku = (typeof COIN_PACK_SKUS)[number];

export async function initBilling(
  _onPurchase: (purchase: Purchase) => void,
): Promise<boolean> {
  return false; // No billing on web.
}

export function closeBilling() {
  // No-op on web.
}

export async function buyVip(): Promise<void> {
  throw new Error('Purchases are not available on web');
}

export async function buyCoins(_sku: CoinPackSku): Promise<void> {
  throw new Error('Purchases are not available on web');
}

export async function restorePurchases(): Promise<boolean> {
  return false;
}

export async function fetchVipPrice(): Promise<string | null> {
  return null;
}
