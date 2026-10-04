import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ponytail: one tiny context is the whole "store" — session facts only.
// Game state (tables, hands, turns) lives in realtime/ + engine/ later.

interface SessionState {
  vip: boolean;
  setVip: (value: boolean) => void;
  coins: number;
  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
  animalTitles: string[];
  claimAnimalTitle: (animal: string) => void;
  /** Stable multiplayer identity — generated once, persisted. */
  playerId: string;
  /** Display name shown at online tables. Editable in Profile. */
  displayName: string;
  setDisplayName: (name: string) => void;
}

const SessionContext = createContext<SessionState | null>(null);

const COINS_KEY = '@houserules:coins/v1';
const VIP_KEY = '@houserules:vip/v1';
const TITLES_KEY = '@houserules:titles/v1';
const PLAYER_ID_KEY = '@houserules:playerId/v1';
const DISPLAY_NAME_KEY = '@houserules:displayName/v1';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [vip, setVipState] = useState(false);
  const [coins, setCoins] = useState(0);
  const [animalTitles, setAnimalTitles] = useState<string[]>([]);
  const [playerId, setPlayerId] = useState('');
  const [displayName, setDisplayNameState] = useState('');

  useEffect(() => {
    (async () => {
      const [c, v, t, pid, dn] = await Promise.all([
        AsyncStorage.getItem(COINS_KEY),
        AsyncStorage.getItem(VIP_KEY),
        AsyncStorage.getItem(TITLES_KEY),
        AsyncStorage.getItem(PLAYER_ID_KEY),
        AsyncStorage.getItem(DISPLAY_NAME_KEY),
      ]);
      if (c !== null) setCoins(Number(c) || 0);
      if (v === '1') setVipState(true);
      // Player identity: generate once, keep forever.
      if (pid) {
        setPlayerId(pid);
      } else {
        const fresh = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        setPlayerId(fresh);
        AsyncStorage.setItem(PLAYER_ID_KEY, fresh).catch(() => {});
      }
      setDisplayNameState(dn || `Guest-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
      if (t) {
        try {
          setAnimalTitles(JSON.parse(t) as string[]);
        } catch {
          /* corrupted cache — start fresh */
        }
      }
    })();
  }, []);

  const setVip = useCallback((value: boolean) => {
    setVipState(value);
    AsyncStorage.setItem(VIP_KEY, value ? '1' : '0').catch(() => {});
  }, []);

  const addCoins = useCallback((n: number) => {
    setCoins((prev) => {
      const next = prev + n;
      AsyncStorage.setItem(COINS_KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const spendCoins = useCallback(
    (n: number) => {
      if (coins < n) return false;
      const next = coins - n;
      setCoins(next);
      AsyncStorage.setItem(COINS_KEY, String(next)).catch(() => {});
      return true;
    },
    [coins],
  );

  const setDisplayName = useCallback((name: string) => {
    const clean = name.trim().slice(0, 16) || 'Guest';
    setDisplayNameState(clean);
    AsyncStorage.setItem(DISPLAY_NAME_KEY, clean).catch(() => {});
  }, []);

  const claimAnimalTitle = useCallback((animal: string) => {
    setAnimalTitles((prev) => {
      if (prev.includes(animal)) return prev;
      const next = [...prev, animal];
      AsyncStorage.setItem(TITLES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<SessionState>(
    () => ({ vip, setVip, coins, addCoins, spendCoins, animalTitles, claimAnimalTitle, playerId, displayName, setDisplayName }),
    [vip, setVip, coins, addCoins, spendCoins, animalTitles, claimAnimalTitle, playerId, displayName, setDisplayName],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
