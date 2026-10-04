import React from 'react';
import { View } from 'react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { PlayingCard } from '../components/PlayingCard';
import { TableCard } from '../components/TableCard';
import { useTheme } from '../theme/ThemeProvider';
import { useStrings } from '../i18n';
import { BOT_PERSONAS } from '../bots/personas';
import type { Card } from '../engine/cards';
import type { DeckKind } from '../engine/types';
import { TABLE_THEMES } from '../theme/tableThemes';

// Felt each deck plays on — from the shared table themes.
const THEMES: { deck: DeckKind; overlay: string; opacity: number; mood: string }[] = [
  { deck: 'classic52', ...TABLE_THEMES.classic52, mood: 'Emerald Classic' },
  { deck: 'uno108', ...TABLE_THEMES.uno108, mood: 'Midnight Indigo' },
  { deck: 'baloot32', ...TABLE_THEMES.baloot32, mood: 'Desert Night Bronze' },
  { deck: 'animals12', ...TABLE_THEMES.animals12, mood: 'Deep Jungle Green' },
];

const deckNameKey = { classic52: 'classic52', uno108: 'uno108', baloot32: 'baloot32', animals12: 'animals12' } as const;

function sample(id: string, deck: DeckKind, rest: Partial<Card>): Card {
  return { id, deck, color: null, suit: null, rank: '', action: null, animal: null, ...rest };
}

// Hand-picked showpieces per deck — the cards that sell the theme.
const SAMPLES: Record<DeckKind, Card[]> = {
  classic52: [
    sample('t-1', 'classic52', { suit: 'spades', rank: 'A' }),
    sample('t-2', 'classic52', { suit: 'hearts', rank: 'K' }),
    sample('t-3', 'classic52', { suit: 'diamonds', rank: 'Q' }),
  ],
  uno108: [
    sample('t-4', 'uno108', { color: 'red', rank: '7' }),
    sample('t-5', 'uno108', { color: 'blue', rank: 'skip', action: 'skip' }),
    sample('t-6', 'uno108', { rank: 'wild', action: 'wild' }),
  ],
  baloot32: [
    sample('t-7', 'baloot32', { suit: 'clubs', rank: 'A' }),
    sample('t-8', 'baloot32', { suit: 'hearts', rank: '10' }),
    sample('t-9', 'baloot32', { suit: 'spades', rank: '7' }),
  ],
  animals12: [
    sample('t-10', 'animals12', { color: 'red', rank: 'lion', animal: 'lion' }),
    sample('t-11', 'animals12', { color: 'blue', rank: 'falcon', animal: 'falcon' }),
    sample('t-12', 'animals12', { color: 'green', rank: 'cobra', animal: 'cobra' }),
  ],
};

const DIFF_COLOR: Record<string, string> = { easy: '#3FA34D', medium: '#D9A62E', hard: '#D64545' };

function ThemeSection({ deck, overlay, opacity, mood }: { deck: DeckKind; overlay: string; opacity: number; mood: string }) {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  return (
    <TableCard>
      <Text variant="h2">{t.decks[deckNameKey[deck]]}</Text>
      <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
        {mood}
      </Text>
      {/* Felt preview — the table surface for this theme */}
      <View
        style={{
          height: 110,
          borderRadius: radii.md,
          backgroundColor: colors.feltDeep,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.sm,
        }}
        accessibilityLabel={`${mood} felt preview`}
      >
        <View
          style={{
            ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
            backgroundColor: overlay,
            opacity,
          }}
        />
        <Text variant="h3" style={{ color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
          {mood}
        </Text>
      </View>
      {/* Faces + back */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {SAMPLES[deck].map((card) => (
          <PlayingCard key={card.id} card={card} size="md" />
        ))}
        <View style={{ marginLeft: 'auto', alignItems: 'center' }}>
          <PlayingCard card={sample('back', deck, {})} size="md" faceDown />
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
            {t.themes.back}
          </Text>
        </View>
      </View>
    </TableCard>
  );
}

export function ThemesScreen() {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  return (
    <Screen>
      <Text variant="h1">{t.themes.title}</Text>
      <Text variant="bodySmall" color={colors.textSecondary}>
        {t.themes.subtitle}
      </Text>

      {/* Your profile */}
      <TableCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 2,
              borderColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 30 }}>🎮</Text>
          </View>
          <View>
            <Text variant="h2">{t.table.you}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t.themes.yourAvatar}
            </Text>
          </View>
        </View>
      </TableCard>

      {THEMES.map((th) => (
        <ThemeSection key={th.deck} {...th} />
      ))}

      {/* Avatar roster — every bot persona at the table */}
      <TableCard>
        <Text variant="h2" style={{ marginBottom: spacing.sm }}>
          {t.themes.avatars}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {BOT_PERSONAS.map((p) => (
            <View key={p.name} style={{ width: '30%', alignItems: 'center' }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 2,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 28 }}>{p.avatar}</Text>
              </View>
              <Text variant="caption" style={{ fontWeight: '700', marginTop: 4 }}>
                {p.name}
              </Text>
              <View
                style={{
                  marginTop: 2,
                  paddingHorizontal: 8,
                  paddingVertical: 1,
                  borderRadius: radii.full,
                  backgroundColor: DIFF_COLOR[p.difficulty] + '22',
                }}
              >
                <Text variant="caption" style={{ color: DIFF_COLOR[p.difficulty], fontWeight: '700' }}>
                  {p.difficulty}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </TableCard>
    </Screen>
  );
}
