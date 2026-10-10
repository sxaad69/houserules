import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';
import { Button } from './Button';
import { TableCard } from './TableCard';
import { useStrings } from '../i18n';
import { summarizeRulebook } from '../builder/summary';
import { DEFAULT_DRAFT } from '../builder/types';
import type { DeckKind, RuleTemplate } from '../engine/types';

// ponytail: mock shape lives next to the row that renders it; the engine
// (parallel track) owns real table state — this gets replaced, not extended.
export interface MockTable {
  id: string;
  name: string;
  deck: DeckKind;
  template: RuleTemplate;
  seated: number;
  capacity: number;
  players: { initials: string }[];
}

interface Props {
  table: MockTable;
  index: number;
  onJoin: (table: MockTable) => void;
}

/** Overlapping initial-circles. No photo assets for mock players. */
function AvatarStack({ players }: { players: { initials: string }[] }) {
  const { colors, radii } = useTheme();
  const bgs = [colors.surfaceAlt, colors.accentMuted];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {players.map((p, i) => (
        <View
          key={`${p.initials}-${i}`}
          style={{
            width: 32,
            height: 32,
            borderRadius: radii.full,
            backgroundColor: bgs[i % bgs.length],
            borderWidth: 2,
            borderColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            marginStart: i === 0 ? 0 : -10,
          }}
        >
          <Text variant="caption" color={colors.textPrimary}>
            {p.initials}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * One house-table row: deck art, name, game type, join button, live seats.
 * Modest entrance only (fade + rise, staggered) — the full feel pass
 * (Skia/Lottie/haptics) is a later step per the art-pass brief.
 */
export function HouseTableRow({ table, index, onJoin }: Props) {
  const { t, locale } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const delay = 120 + index * 90;
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 320,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 320,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise, index]);

  const full = table.seated >= table.capacity;
  const deckLabel = t.decks[table.deck];
  const templateLabel =
    table.template === 'shedding' ? t.home.shedding : t.home.pointsRace;
  // Rules summary: plain-language description of this table's rules.
  const summary = summarizeRulebook(
    {
      template: table.template,
      deck: table.deck,
      specials: { ...DEFAULT_DRAFT.specials },
      winCondition: table.template === 'pointsRace' ? 'lowestScore' : 'emptyHand',
      playerCount: table.capacity,
      turnSeconds: 30,
    },
    locale === 'ar' ? 'ar' : 'en',
  );

  return (
    <Animated.View
      style={{ opacity: fade, transform: [{ translateY: rise }] }}
    >
      <TableCard>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <Image
            source={require('../assets/card-back.png')}
            style={{ width: 52, height: 76, borderRadius: radii.md }}
            resizeMode="cover"
            accessibilityRole="image"
            accessibilityLabel={deckLabel}
          />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="bodyBold">{table.name}</Text>
            <Text variant="caption" color={colors.textSecondary}>
              {deckLabel}
            </Text>
            <Text variant="caption" color={colors.textTertiary} numberOfLines={2}>
              {summary.short}
            </Text>
          </View>
          <Button
            size="sm"
            variant={full ? 'secondary' : 'primary'}
            title={full ? t.home.full : t.home.join}
            disabled={full}
            onPress={() => onJoin(table)}
          />
        </View>
        <View style={{ height: spacing.md }} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <AvatarStack players={table.players} />
          <Text variant="caption" color={colors.textSecondary}>
            {table.seated}/{table.capacity} {t.home.players}
          </Text>
        </View>
      </TableCard>
    </Animated.View>
  );
}
