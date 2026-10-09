// builder/themes.ts — curated custom themes for the Rulebook Builder.
// Phase 2 scope: curated designs ONLY, no uploads (spec §6: gallery would
// become visual chaos). Rendered as plain Views — web-safe, no assets.
// Gold #C9A227 stays VIP-only: none of these use it.

export interface CardBackDesign {
  id: string;
  /** i18n key under builder.backs.* */
  nameKey: string;
  /** Back face background. */
  bg: string;
  /** Inner keyline + emblem color. */
  line: string;
  /** Center emblem glyph. */
  emblem: string;
}

export const CARD_BACKS: CardBackDesign[] = [
  { id: 'midnight', nameKey: 'midnight', bg: '#1B1440', line: '#8E7CE8', emblem: '✦' },
  { id: 'crimson', nameKey: 'crimson', bg: '#571C24', line: '#E8A0A8', emblem: '♠' },
  { id: 'ocean', nameKey: 'ocean', bg: '#0C2F38', line: '#7FD1C0', emblem: '≋' },
  { id: 'onyx', nameKey: 'onyx', bg: '#17171A', line: '#C9C9D4', emblem: '◈' },
];

export function cardBackById(id: string): CardBackDesign {
  return CARD_BACKS.find((b) => b.id === id) ?? CARD_BACKS[0];
}

export interface CustomFelt {
  id: string;
  /** i18n key under builder.felts.* */
  nameKey: string;
  overlay: string;
  opacity: number;
}

export const CUSTOM_FELTS: CustomFelt[] = [
  { id: 'royal', nameKey: 'royal', overlay: '#1B1440', opacity: 0.6 },
  { id: 'crimson', nameKey: 'crimson', overlay: '#4A1420', opacity: 0.55 },
  { id: 'ocean', nameKey: 'ocean', overlay: '#0B2E35', opacity: 0.55 },
  { id: 'charcoal', nameKey: 'charcoal', overlay: '#1C1C1E', opacity: 0.5 },
];

export function customFeltById(id: string): CustomFelt {
  return CUSTOM_FELTS.find((f) => f.id === id) ?? CUSTOM_FELTS[0];
}
