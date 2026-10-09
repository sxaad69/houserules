import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACK_VARIANTS, FELTS, backAsset, feltAsset, type BackVariant } from '../theme/library';
import type { DeckKind } from '../engine/types';

// ponytail: same shape as session.tsx — tiny context, AsyncStorage persistence,
// game state stays out.

interface ThemesState {
  /** Selected back variant per deck. */
  backVariant: Record<DeckKind, BackVariant>;
  setBackVariant: (deck: DeckKind, variant: BackVariant) => void;
  /** Selected felt id. */
  feltId: string;
  setFeltId: (id: string) => void;
  /** Resolved assets for components. */
  backFor: (deck: DeckKind) => number;
  felt: () => number;
}

const ThemesContext = createContext<ThemesState | null>(null);

const THEMES_KEY = '@houserules:themes/v1';

const DEFAULT_BACKS: Record<DeckKind, BackVariant> = {
  classic52: 'a',
  uno108: 'a',
  baloot32: 'a',
  animals12: 'a',
};
const DEFAULT_FELT = 'emerald';

const isVariant = (v: unknown): v is BackVariant =>
  typeof v === 'string' && (BACK_VARIANTS as string[]).includes(v);
const isFelt = (id: unknown): id is string =>
  typeof id === 'string' && FELTS.some((f) => f.id === id);

export function ThemesProvider({ children }: { children: React.ReactNode }) {
  const [backVariant, setBackVariantState] = useState<Record<DeckKind, BackVariant>>(DEFAULT_BACKS);
  const [feltId, setFeltIdState] = useState(DEFAULT_FELT);

  useEffect(() => {
    AsyncStorage.getItem(THEMES_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const saved = JSON.parse(raw) as { backVariant?: Record<string, unknown>; feltId?: unknown };
          if (saved.backVariant) {
            setBackVariantState((prev) => {
              const next = { ...prev };
              for (const deck of Object.keys(prev) as DeckKind[]) {
                if (isVariant(saved.backVariant?.[deck])) next[deck] = saved.backVariant[deck] as BackVariant;
              }
              return next;
            });
          }
          if (isFelt(saved.feltId)) setFeltIdState(saved.feltId);
        } catch {
          /* corrupted cache — keep defaults */
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((backs: Record<DeckKind, BackVariant>, felt: string) => {
    AsyncStorage.setItem(THEMES_KEY, JSON.stringify({ backVariant: backs, feltId: felt })).catch(() => {});
  }, []);

  const setBackVariant = useCallback(
    (deck: DeckKind, variant: BackVariant) => {
      setBackVariantState((prev) => {
        const next = { ...prev, [deck]: variant };
        persist(next, feltId);
        return next;
      });
    },
    [feltId, persist],
  );

  const setFeltId = useCallback(
    (id: string) => {
      if (!isFelt(id)) return;
      setFeltIdState(id);
      persist(backVariant, id);
    },
    [backVariant, persist],
  );

  const value = useMemo<ThemesState>(
    () => ({
      backVariant,
      setBackVariant,
      feltId,
      setFeltId,
      backFor: (deck: DeckKind) => backAsset(deck, backVariant[deck]),
      felt: () => feltAsset(feltId),
    }),
    [backVariant, setBackVariant, feltId, setFeltId],
  );

  return <ThemesContext.Provider value={value}>{children}</ThemesContext.Provider>;
}

export function useThemes(): ThemesState {
  const ctx = useContext(ThemesContext);
  if (!ctx) throw new Error('useThemes must be used within a ThemesProvider');
  return ctx;
}
