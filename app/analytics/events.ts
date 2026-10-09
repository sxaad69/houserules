// analytics/events.ts — lightweight event logger.
// Dev: logs to console + notifies test listeners. Prod: no-op until a
// backend is wired (spec: analytics pipeline is a later milestone).
// Dependency-free: safe to import from the engine.

declare const __DEV__: boolean | undefined;

export type AnalyticsEventName =
  | 'game_start'
  | 'game_end'
  | 'table_join'
  | 'builder_complete'
  | 'gift_sent'
  | 'theme_changed';

export interface AnalyticsParams {
  [key: string]: string | number | boolean | null | undefined;
}

type Listener = (name: AnalyticsEventName, params: AnalyticsParams) => void;
const listeners = new Set<Listener>();

/** Subscribe to events (used by tests; a future backend sink hooks in here). */
export function addAnalyticsListener(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function isDev(): boolean {
  try {
    // React Native global (declared above; set by the RN runtime)
    if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  } catch {
    // noop
  }
  try {
    return typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}

export function logEvent(name: AnalyticsEventName, params: AnalyticsParams = {}): void {
  for (const fn of listeners) {
    try {
      fn(name, params);
    } catch {
      // a broken listener must never break the game
    }
  }
  if (isDev()) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${name}`, params);
  }
}

// --- game lifecycle helpers (duration tracking) -----------------------------

const gameStartTimes = new WeakMap<object, number>();

/** Call when a game object is created. Remembers the start time for duration. */
export function trackGameStart(gameRef: object, params: AnalyticsParams): void {
  gameStartTimes.set(gameRef, Date.now());
  logEvent('game_start', params);
}

/** Call when a game object reaches gameOver. Appends durationMs. */
export function trackGameEnd(gameRef: object, params: AnalyticsParams): void {
  const start = gameStartTimes.get(gameRef);
  const durationMs = typeof start === 'number' ? Math.max(0, Date.now() - start) : 0;
  gameStartTimes.delete(gameRef);
  logEvent('game_end', { ...params, durationMs });
}
