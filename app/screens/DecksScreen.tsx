import React, { useState } from 'react';
import { Modal, Pressable, View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { TableCard } from '../components/TableCard';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { DECK_CARD_COUNTS, type DeckKind } from '../engine/types';
import { getDeckGuide } from '../guides/decks';

// The four v1 decks. Locked — no fifth until players demand it (spec §5).
const DECKS: { kind: DeckKind; nameKey: 'classic52' | 'uno108' | 'baloot32' | 'animals12'; subKey: 'classic52Sub' | 'uno108Sub' | 'baloot32Sub' | 'animals12Sub' }[] = [
  { kind: 'classic52', nameKey: 'classic52', subKey: 'classic52Sub' },
  { kind: 'uno108', nameKey: 'uno108', subKey: 'uno108Sub' },
  { kind: 'baloot32', nameKey: 'baloot32', subKey: 'baloot32Sub' },
  { kind: 'animals12', nameKey: 'animals12', subKey: 'animals12Sub' },
];

export function DecksScreen() {
  const { t } = useStrings();
  const { colors, spacing } = useTheme();
  const navigation = useNavigation<any>();
  const [guideDeck, setGuideDeck] = useState<DeckKind | null>(null);
  const guide = guideDeck ? getDeckGuide(guideDeck) : null;

  return (
    <Screen>
      <Text variant="h1">{t.decks.title}</Text>
      <Pressable
        onPress={() => navigation.navigate('Themes')}
        accessibilityRole="button"
        accessibilityLabel={t.themes.gallery}
        style={{
          borderRadius: 12,
          padding: spacing.md,
          backgroundColor: colors.accentMuted,
          borderWidth: 1.5,
          borderColor: colors.accent,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text variant="h2" color={colors.accent}>🎨 {t.themes.gallery}</Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t.themes.subtitle}
          </Text>
        </View>
        <Text variant="h2" color={colors.accent}>›</Text>
      </Pressable>
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
          <Button
            title={t.decks.howToPlay}
            variant="ghost"
            size="sm"
            onPress={() => setGuideDeck(deck.kind)}
          />
        </TableCard>
      ))}
      <Modal visible={guideDeck !== null} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: spacing.lg }}>
            <ScrollView>
              {guide && (
                <>
                  <Text variant="h2">{guide.title}</Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>{guide.tagline}</Text>
                  <View style={{ height: spacing.md }} />
                  {guide.sections.map((s) => (
                    <View key={s.title} style={{ marginBottom: spacing.md }}>
                      <Text variant="bodyBold">{s.title}</Text>
                      <Text variant="bodySmall" color={colors.textSecondary}>{s.body}</Text>
                    </View>
                  ))}
                  <Text variant="bodyBold">💡 Tips</Text>
                  {guide.tips.map((tip, i) => (
                    <Text key={i} variant="bodySmall" color={colors.textSecondary}>• {tip}</Text>
                  ))}
                </>
              )}
              <View style={{ height: spacing.md }} />
              <Button title={t.common.close} onPress={() => setGuideDeck(null)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
