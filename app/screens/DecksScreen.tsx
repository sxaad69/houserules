import React from 'react';
import { View } from 'react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { TableCard } from '../components/TableCard';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { DECK_CARD_COUNTS, type DeckKind } from '../engine/types';

// The four v1 decks. Locked — no fifth until players demand it (spec §5).
const DECKS: { kind: DeckKind; nameKey: 'classic52' | 'uno108' | 'baloot32' | 'animals12'; subKey: 'classic52Sub' | 'uno108Sub' | 'baloot32Sub' | 'animals12Sub' }[] = [
  { kind: 'classic52', nameKey: 'classic52', subKey: 'classic52Sub' },
  { kind: 'uno108', nameKey: 'uno108', subKey: 'uno108Sub' },
  { kind: 'baloot32', nameKey: 'baloot32', subKey: 'baloot32Sub' },
  { kind: 'animals12', nameKey: 'animals12', subKey: 'animals12Sub' },
];

export function DecksScreen() {
  const { t } = useStrings();
  const { spacing } = useTheme();

  return (
    <Screen>
      <Text variant="h1">{t.decks.title}</Text>
      {DECKS.map((deck) => (
        <TableCard key={deck.kind}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="h2">{t.decks[deck.nameKey]}</Text>
              <Text variant="bodySmall" color="#9A9A9A">
                {t.decks[deck.subKey]}
              </Text>
            </View>
            <Text variant="h3" color="#9A9A9A">
              {DECK_CARD_COUNTS[deck.kind]}
            </Text>
          </View>
          <View style={{ height: spacing.xs }} />
        </TableCard>
      ))}
    </Screen>
  );
}
