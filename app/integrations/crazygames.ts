/**
 * CrazyGames SDK v3 bridge (launch hardening, spec Sprint 5).
 *
 * The SDK only exists when the game runs inside crazygames.com (or their QA
 * tool / localhost allowlist). Everywhere else — itch.io, standalone web,
 * native — the bridge is a silent no-op. Nothing here may throw.
 *
 * Usage:
 *   import { crazyGames } from '../integrations/crazygames';
 *   crazyGames.gameplayStart(); // when a table round begins
 *   crazyGames.gameplayStop();  // on game over / leaving the table
 */

import { Platform } from 'react-native';

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

interface CrazyGamesSDK {
  game: {
    gameplayStart: () => void;
    gameplayStop: () => void;
  };
  ad: {
    requestAd: (
      type: 'midgame' | 'rewarded',
      callbacks: {
        adStarted: () => void;
        adFinished: () => void;
        adError: (error: unknown) => void;
      },
    ) => void;
  };
}

declare global {
  interface Window {
    CrazyGames?: { SDK?: { init: () => Promise<CrazyGamesSDK> } };
  }
}

class CrazyGamesBridge {
  private sdk: CrazyGamesSDK | null = null;
  private initPromise: Promise<void> | null = null;
  private started = false;

  /** Idempotent. Safe to call on every app boot (web only). */
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      if (Platform.OS !== 'web') return;
      try {
        await this.loadScript();
        if (typeof window !== 'undefined' && window.CrazyGames?.SDK) {
          this.sdk = await window.CrazyGames.SDK.init();
        }
      } catch {
        this.sdk = null; // standalone — stay silent
      }
    })();
    return this.initPromise;
  }

  get available(): boolean {
    return this.sdk !== null;
  }

  gameplayStart(): void {
    if (!this.sdk || this.started) return;
    try {
      this.sdk.game.gameplayStart();
      this.started = true;
    } catch {
      /* never break the game for telemetry */
    }
  }

  gameplayStop(): void {
    if (!this.sdk || !this.started) return;
    try {
      this.sdk.game.gameplayStop();
    } catch {
      /* never break the game for telemetry */
    } finally {
      this.started = false;
    }
  }

  /**
   * Request a midgame ad (e.g. between rounds). Resolves when the ad
   * finishes, errors, or when the SDK is unavailable (immediate resolve).
   */
  requestMidgameAd(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.sdk) return resolve();
      try {
        this.sdk.ad.requestAd('midgame', {
          adStarted: () => {},
          adFinished: () => resolve(),
          adError: () => resolve(),
        });
      } catch {
        resolve();
      }
    });
  }

  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') return reject(new Error('no document'));
      if (document.querySelector(`script[src="${SDK_URL}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = SDK_URL;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('sdk load failed'));
      document.head.appendChild(s);
    });
  }
}

export const crazyGames = new CrazyGamesBridge();
