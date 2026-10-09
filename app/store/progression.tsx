import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeckKind } from '../engine/types';
import type { BackVariant } from '../theme/library';

// ponytail: progression = level/XP + theme unlocks + daily streak.
// Same shape as session.tsx — tiny context, AsyncStorage persistence.

// Level thresholds: XP needed to REACH each level (index 0 = level 1).
export const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500];
export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

/** XP needed to go from `level` to `level + 1` (null when maxed). */
export function xpForNextLevel(level: number, xp: number): number | null {
  if (level >= MAX_LEVEL) return null;
  return LEVEL_THRESHOLDS[level] - xp;
}

// --- Theme unlock tables -------------------------------------------------
// Card backs: 12 total. Level 1 = 3, L2 = +3, L3 = +3, L4 = +3.
const BACK_UNLOCKS: { deck: DeckKind; variant: BackVariant; level: number }[] = [
  { deck: 'classic52', variant: 'a', level: 1 },
  { deck: 'uno108', variant: 'a', level: 1 },
  { deck: 'baloot32', variant: 'a', level: 1 },
  { deck: 'animals12', variant: 'a', level: 2 },
  { deck: 'classic52', variant: 'b', level: 2 },
  { deck: 'uno108', variant: 'b', level: 2 },
  { deck: 'baloot32', variant: 'b', level: 3 },
  { deck: 'animals12', variant: 'b', level: 3 },
  { deck: 'classic52', variant: 'c', level: 3 },
  { deck: 'uno108', variant: 'c', level: 4 },
  { deck: 'baloot32', variant: 'c', level: 4 },
  { deck: 'animals12', variant: 'c', level: 4 },
];

// Felts: 8 non-VIP. Level 1 = 3, L3 = +3, L5 = +3.
// 'royal' stays VIP-only regardless of level (handled in ThemesScreen).
const FELT_UNLOCKS: { id: string; level: number }[] = [
  { id: 'emerald', level: 1 },
  { id: 'midnight', level: 1 },
  { id: 'sand', level: 1 },
  { id: 'sunset', level: 3 },
  { id: 'cyber', level: 3 },
  { id: 'tropical', level: 3 },
  { id: 'crimson', level: 5 },
  { id: 'ocean', level: 5 },
];

export function backRequiredLevel(deck: DeckKind, variant: BackVariant): number {
  return BACK_UNLOCKS.find((u) => u.deck === deck && u.variant === variant)?.level ?? 1;
}

/** null = VIP-only ('royal') or unknown id — not level-gated. */
export function feltRequiredLevel(id: string): number | null {
  return FELT_UNLOCKS.find((u) => u.id === id)?.level ?? null;
}

// --- Daily streak ----------------------------------------------------------
export const DAILY_COINS = 25;
export const DAILY_XP = 5;

const localDayString = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface ProgressionState {
  xp: number;
  level: number;
  addXp: (n: number) => void;
  isBackUnlocked: (deck: DeckKind, variant: BackVariant) => boolean;
  isFeltUnlocked: (id: string) => boolean; // level gate only; VIP handled by caller
  streak: number;
  canClaimDaily: boolean;
  /** Claims today's gift. Returns coins awarded (0 if already claimed). */
  claimDaily: () => number;
}

const ProgressionContext = createContext<ProgressionState | null>(null);

const PROGRESSION_KEY = '@houserules:progression/v1';

interface Saved {
  xp?: number;
  streak?: number;
  lastDailyClaim?: string;
}

export function ProgressionProvider({ children }: { children: React.ReactNode }) {
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastDailyClaim, setLastDailyClaim] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PROGRESSION_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const saved = JSON.parse(raw) as Saved;
          if (typeof saved.xp === 'number' && saved.xp >= 0) setXp(Math.floor(saved.xp));
          if (typeof saved.streak === 'number' && saved.streak >= 0) setStreak(Math.floor(saved.streak));
          if (typeof saved.lastDailyClaim === 'string') setLastDailyClaim(saved.lastDailyClaim);
        } catch {
          /* corrupted cache — keep defaults */
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((nextXp: number, nextStreak: number, nextClaim: string | null) => {
    AsyncStorage.setItem(
      PROGRESSION_KEY,
      JSON.stringify({ xp: nextXp, streak: nextStreak, lastDailyClaim: nextClaim }),
    ).catch(() => {});
  }, []);

  const level = levelForXp(xp);

  const addXp = useCallback(
    (n: number) => {
      if (n <= 0) return;
      setXp((prev) => {
        const next = prev + Math.floor(n);
        persist(next, streak, lastDailyClaim);
        return next;
      });
    },
    [persist, streak, lastDailyClaim],
  );

  const isBackUnlocked = useCallback(
    (deck: DeckKind, variant: BackVariant) => level >= backRequiredLevel(deck, variant),
    [level],
  );

  const isFeltUnlocked = useCallback(
    (id: string) => {
      const req = feltRequiredLevel(id);
      if (req === null) return true; // VIP-only or unknown — caller decides
      return level >= req;
    },
    [level],
  );

  const canClaimDaily = lastDailyClaim !== localDayString(new Date());

  const claimDaily = useCallback((): number => {
    const today = localDayString(new Date());
    if (lastDailyClaim === today) return 0;
    const yesterday = localDayString(new Date(Date.now() - 86400000));
    const nextStreak = lastDailyClaim === yesterday ? streak + 1 : 1;
    const nextXp = xp + DAILY_XP;
    setStreak(nextStreak);
    setLastDailyClaim(today);
    setXp(nextXp);
    persist(nextXp, nextStreak, today);
    return DAILY_COINS;
  }, [lastDailyClaim, streak, xp, persist]);

  const value = useMemo(
    () => ({
      xp,
      level,
      addXp,
      isBackUnlocked,
      isFeltUnlocked,
      streak,
      canClaimDaily,
      claimDaily,
    }),
    [xp, level, addXp, isBackUnlocked, isFeltUnlocked, streak, canClaimDaily, claimDaily],
  );

  return <ProgressionContext.Provider value={value}>{children}</ProgressionContext.Provider>;
}

export function useProgression() {
  const ctx = useContext(ProgressionContext);
  if (!ctx) throw new Error('useProgression must be used within ProgressionProvider');
  return ctx;
}
