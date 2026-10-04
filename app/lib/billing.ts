import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
} from 'react-native-iap';

// Play Console product IDs — create these in Play Console > Monetize >
// Products BEFORE any purchase can succeed. Prices TBD (spec §16).
// VIP is a flat monthly membership (NOT per-game entry — halal guardrail).
export const VIP_MONTHLY_SKU = 'houserules_vip_monthly';

// Coin packs are consumables. Coins buy gifts only — never cashed out,
// never staked on outcomes (spec §8).
export const COIN_PACK_SKUS = [
  'houserules_coins_100',
  'houserules_coins_550',
  'houserules_coins_1500',
] as const;

export type CoinPackSku = (typeof COIN_PACK_SKUS)[number];

const VIP_KEY = '@houserules:vip_receipt/v1';

let connected = false;
let updateSub: { remove(): void } | null = null;
let errorSub: { remove(): void } | null = null;
let purchaseHandler: ((purchase: Purchase) => void) | null = null;

export async function initBilling(
  onPurchase: (purchase: Purchase) => void,
): Promise<boolean> {
  purchaseHandler = onPurchase;
  try {
    connected = await initConnection();
  } catch {
    connected = false;
  }
  if (!connected) return false;

  updateSub?.remove();
  errorSub?.remove();

  updateSub = purchaseUpdatedListener(async (purchase) => {
    try {
      // TODO(v1): verify the purchase token against our backend (Google
      // Play Developer API) before unlocking. Until then: finish + unlock.
      await finishTransaction({ purchase, isConsumable: true });
      purchaseHandler?.(purchase);
    } catch {
      /* finishing failed — purchase stays pending, safe to retry */
    }
  });

  errorSub = purchaseErrorListener(() => {
    /* surfaced to UI by caller */
  });

  return true;
}

export function closeBilling() {
  updateSub?.remove();
  errorSub?.remove();
  updateSub = null;
  errorSub = null;
  if (connected) {
    endConnection().catch(() => {});
    connected = false;
  }
}

export async function buyVip(): Promise<void> {
  if (!connected) throw new Error('Billing not connected');
  await requestPurchase({ skus: [VIP_MONTHLY_SKU] } as never);
}

export async function buyCoins(sku: CoinPackSku): Promise<void> {
  if (!connected) throw new Error('Billing not connected');
  await requestPurchase({ skus: [sku] } as never);
}

/** Restore non-consumable VIP on reinstall. Coin packs are consumable. */
export async function restorePurchases(): Promise<boolean> {
  if (!connected) return false;
  const purchases = await getAvailablePurchases();
  const hasVip = purchases.some((p) => p.productId === VIP_MONTHLY_SKU);
  await AsyncStorage.setItem(VIP_KEY, hasVip ? '1' : '0');
  return hasVip;
}

export async function fetchVipPrice(): Promise<string | null> {
  if (!connected) return null;
  try {
    const products = await fetchProducts({ skus: [VIP_MONTHLY_SKU] } as never);
    return products?.[0]?.displayPrice ?? null;
  } catch {
    return null;
  }
}
