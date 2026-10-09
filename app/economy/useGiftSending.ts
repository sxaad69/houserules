import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../store/session';
import { audioManager } from '../audio/manager';
import type { Gift } from './index';

export type GiftError = 'insufficient' | 'vipOnly' | null;

const CELEBRATION_MS = 3000;

/**
 * Shared gift-sending flow for table screens (bots + network).
 * Halal guardrails (spec §8): coins are spent on gifts only — never staked,
 * never cashed out, never awarded for winning. Every gift is sold directly
 * at a visible price; no loot boxes, no mystery gifts.
 */
export function useGiftSending() {
  const { coins, spendCoins, vip } = useSession();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [celebration, setCelebration] = useState<Gift | null>(null);
  const [error, setError] = useState<GiftError>(null);

  const openPicker = useCallback(() => {
    setError(null);
    setPickerOpen(true);
  }, []);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const send = useCallback(
    (gift: Gift) => {
      if (gift.vipOnly && !vip) {
        setError('vipOnly');
        return;
      }
      if (!spendCoins(gift.costCoins)) {
        setError('insufficient');
        return;
      }
      setError(null);
      setPickerOpen(false);
      setCelebration(gift);
      audioManager.playSfx('gift');
    },
    [spendCoins, vip],
  );

  // Celebration overlay dismisses itself after a few seconds.
  useEffect(() => {
    if (!celebration) return;
    const id = setTimeout(() => setCelebration(null), CELEBRATION_MS);
    return () => clearTimeout(id);
  }, [celebration]);

  return { pickerOpen, openPicker, closePicker, celebration, error, send, coins, vip };
}
