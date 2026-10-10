import type { CustomRulebook, RulebookDraft } from './types';
import type { DeckKind, RuleTemplate, WinCondition } from '../engine/types';

// ponytail: rules summaries are pure formatting — the builder data already
// says everything. No AI, no prose writing, just structured → readable.

const DECK_NAMES: Record<DeckKind, { en: string; ar: string }> = {
  classic52: { en: 'Classic 52', ar: 'كلاسيك ٥٢' },
  uno108: { en: 'Uno-style 108', ar: 'أونو ١٠٨' },
  baloot32: { en: '32-card', ar: '٣٢ ورقة' },
  animals12: { en: 'Animals 12', ar: 'الحيوانات ١٢' },
};

const TEMPLATE_NAMES: Record<RuleTemplate, { en: string; ar: string }> = {
  shedding: { en: 'Shedding', ar: 'تخلص' },
  pointsRace: { en: 'Points race', ar: 'سباق النقاط' },
};

const WIN_NAMES: Record<WinCondition, { en: string; ar: string }> = {
  emptyHand: { en: 'First to empty their hand wins', ar: 'أول من يفرغ يده يفوز' },
  lowestScore: { en: 'Lowest score wins', ar: 'أقل نقاط يفوز' },
};

export interface RulesSummary {
  /** One-line summary for lobby listings. */
  short: string;
  /** Multi-line details for the pre-join rules sheet. */
  lines: string[];
}

export interface Summarizable {
  template: RuleTemplate;
  deck: DeckKind;
  specials: { skip: boolean; reverse: boolean; drawTwo: boolean; wild: boolean; wildDrawFour: boolean };
  winCondition: WinCondition;
  playerCount: number;
  turnSeconds: number;
  rounds?: number;
  includeJokers?: boolean;
  name?: string;
}

export function summarizeRulebook(rb: Summarizable, locale: 'en' | 'ar' = 'en'): RulesSummary {
  const t = (v: { en: string; ar: string }) => (locale === 'ar' ? v.ar : v.en);
  const lines: string[] = [];

  lines.push(`${t(TEMPLATE_NAMES[rb.template])} · ${t(DECK_NAMES[rb.deck])}`);
  lines.push(`${rb.playerCount} ${locale === 'ar' ? 'لاعبين' : rb.playerCount === 1 ? 'player' : 'players'}`);
  lines.push(t(WIN_NAMES[rb.winCondition]));

  const specials: string[] = [];
  if (rb.specials.skip) specials.push(locale === 'ar' ? 'تخطي' : 'Skips');
  if (rb.specials.reverse) specials.push(locale === 'ar' ? 'عكس' : 'Reverses');
  if (rb.specials.drawTwo) specials.push('+2');
  if (rb.specials.wild) specials.push(locale === 'ar' ? 'جامحة' : 'Wilds');
  if (rb.specials.wildDrawFour) specials.push('+4');
  lines.push(
    specials.length > 0
      ? `${locale === 'ar' ? 'أوراق خاصة' : 'Special cards'}: ${specials.join(', ')}`
      : locale === 'ar'
        ? 'بدون أوراق خاصة'
        : 'No special cards',
  );

  if (rb.template === 'pointsRace' && rb.rounds) {
    lines.push(`${rb.rounds} ${locale === 'ar' ? 'جولات' : rb.rounds === 1 ? 'round' : 'rounds'}`);
  }
  if (rb.includeJokers) {
    lines.push(locale === 'ar' ? 'الجوكر كورقة جامحة' : 'Jokers play as wilds');
  }
  if (rb.turnSeconds > 0) {
    lines.push(
      `${rb.turnSeconds}s ${locale === 'ar' ? 'لكل حركة' : 'per move'}`,
    );
  } else {
    lines.push(locale === 'ar' ? 'بدون مؤقت' : 'No timer');
  }

  const short = [
    t(TEMPLATE_NAMES[rb.template]),
    locale === 'ar' ? `${rb.playerCount} لاعبين` : `${rb.playerCount}P`,
    rb.turnSeconds > 0 ? (locale === 'ar' ? `${rb.turnSeconds} ث` : `${rb.turnSeconds}s`) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return { short, lines };
}
