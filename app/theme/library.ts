// theme/library.ts — the theme library: selectable card backs + table felts.
// Static requires only — Metro cannot bundle dynamic require() paths.
// Production assets live in app/assets/themes/.

import type { DeckKind } from '../engine/types';

export type BackVariant = 'a' | 'b' | 'c';
export const BACK_VARIANTS: BackVariant[] = ['a', 'b', 'c'];
export const DECKS: DeckKind[] = ['classic52', 'uno108', 'baloot32', 'animals12'];

export interface CardBackDef {
  deck: DeckKind;
  variant: BackVariant;
  /** require() result — pass straight to <Image source>. */
  asset: number;
  /** key into t.themes.backNames */
  nameKey: string;
}

export interface FeltDef {
  id: string;
  /** require() result — pass straight to <Image source>. */
  asset: number;
  /** key into t.themes.feltNames */
  nameKey: string;
  vipOnly?: boolean;
}

const back = (deck: DeckKind, variant: BackVariant, asset: number): CardBackDef => ({
  deck,
  variant,
  asset,
  nameKey: `${deck}-${variant}`,
});

export const CARD_BACKS: CardBackDef[] = [
  back('classic52', 'a', require('../assets/themes/back-classic52-a.png')),
  back('classic52', 'b', require('../assets/themes/back-classic52-b.png')),
  back('classic52', 'c', require('../assets/themes/back-classic52-c.png')),
  back('uno108', 'a', require('../assets/themes/back-uno108-a.png')),
  back('uno108', 'b', require('../assets/themes/back-uno108-b.png')),
  back('uno108', 'c', require('../assets/themes/back-uno108-c.png')),
  back('baloot32', 'a', require('../assets/themes/back-baloot32-a.png')),
  back('baloot32', 'b', require('../assets/themes/back-baloot32-b.png')),
  back('baloot32', 'c', require('../assets/themes/back-baloot32-c.png')),
  back('animals12', 'a', require('../assets/themes/back-animals12-a.png')),
  back('animals12', 'b', require('../assets/themes/back-animals12-b.png')),
  back('animals12', 'c', require('../assets/themes/back-animals12-c.png')),
];

const felt = (id: string, asset: number, vipOnly = false): FeltDef => ({
  id,
  asset,
  nameKey: id,
  vipOnly,
});

export const FELTS: FeltDef[] = [
  felt('emerald', require('../assets/themes/felt-emerald.png')),
  felt('midnight', require('../assets/themes/felt-midnight.png')),
  felt('sand', require('../assets/themes/felt-sand.png')),
  felt('sunset', require('../assets/themes/felt-sunset.png')),
  felt('cyber', require('../assets/themes/felt-cyber.png')),
  felt('tropical', require('../assets/themes/felt-tropical.png')),
  felt('royal', require('../assets/themes/felt-royal.png'), true), // gold/damask = VIP brand
  felt('crimson', require('../assets/themes/felt-crimson.png')),
  felt('ocean', require('../assets/themes/felt-ocean.png')),
];

export function backAsset(deck: DeckKind, variant: BackVariant): number {
  return CARD_BACKS.find((d) => d.deck === deck && d.variant === variant)?.asset
    ?? CARD_BACKS[0].asset;
}

export function feltAsset(id: string): number {
  return FELTS.find((f) => f.id === id)?.asset ?? FELTS[0].asset;
}
