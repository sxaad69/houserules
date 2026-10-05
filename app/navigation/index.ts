import type { DeckKind, RuleTemplate } from '../engine/types';
import type { CustomRulebook } from '../builder/types';

export type RootTabParamList = {
  Home: undefined;
  Decks: undefined;
  Leaders: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  Table: { tableId: string; deck: DeckKind; template: RuleTemplate; isVip?: boolean; rulebook?: CustomRulebook };
  PrivateTable: { code?: string };
  Room: { code: string; role: 'host' | 'guest'; deck: DeckKind; template: RuleTemplate };
  /** Phase 2: Rulebook Builder wizard. `from` pre-fills the draft (creator nudge). */
  Builder: { from?: CustomRulebook } | undefined;
  /** Phase 2: Community Gallery browse. */
  Gallery: undefined;
  /** Phase 2: Gallery entry detail. */
  GalleryDetail: { entryId: string };
};
