import type { DeckKind, RuleTemplate } from '../engine/types';

export type RootTabParamList = {
  Home: undefined;
  Decks: undefined;
  Leaders: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  Table: { tableId: string; deck: DeckKind; template: RuleTemplate; isVip?: boolean };
  PrivateTable: { code?: string };
  Room: { code: string; role: 'host' | 'guest'; deck: DeckKind; template: RuleTemplate };
  Wallet: undefined;
  Vip: undefined;
};
