import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { TableCard } from '../components/TableCard';
import { Button } from '../components/Button';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import type { RootStackParamList } from '../navigation';
import {
  fetchEntry,
  loadRatings,
  rateEntry,
  type GalleryEntry,
} from '../gallery';

type Props = NativeStackScreenProps<RootStackParamList, 'GalleryDetail'>;

function ConfigRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingVertical: spacing.xs,
      }}
    >
      <Text variant="bodySmall" color={colors.textSecondary}>
        {label}
      </Text>
      <Text variant="bodyBold" color={colors.textPrimary}>
        {value}
      </Text>
    </View>
  );
}

export function GalleryDetailScreen({ navigation, route }: Props) {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const { entryId } = route.params;
  const [entry, setEntry] = useState<GalleryEntry | null>(null);
  const [myStars, setMyStars] = useState<number>(0);
  const [displayRating, setDisplayRating] = useState<{ rating: number; count: number }>({ rating: 0, count: 0 });

  const reload = useCallback(() => {
    Promise.all([fetchEntry(entryId), loadRatings()]).then(([e, ratings]) => {
      setEntry(e);
      if (!e) return;
      const mine = ratings[e.id] ?? 0;
      setMyStars(mine);
      if (mine > 0) {
        const total = e.rating * e.ratingsCount + mine;
        setDisplayRating({ rating: total / (e.ratingsCount + 1), count: e.ratingsCount + 1 });
      } else {
        setDisplayRating({ rating: e.rating, count: e.ratingsCount });
      }
    });
  }, [entryId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const onRate = async (stars: number) => {
    await rateEntry(entryId, stars);
    reload();
  };

  const onPlay = () => {
    if (!entry) return;
    const rb = entry.rulebook;
    navigation.navigate('Table', {
      tableId: `gallery-${rb.id}`,
      deck: rb.deck,
      template: rb.template,
      rulebook: rb,
    });
  };

  if (!entry) {
    return (
      <Screen>
        <Text variant="bodySmall" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: spacing.xl }}>
          …
        </Text>
      </Screen>
    );
  }

  const rb = entry.rulebook;
  const specialsOn = Object.entries(rb.specials)
    .filter(([, v]) => v)
    .map(([k]) => {
      const key = k as keyof typeof t.builder;
      const label = t.builder[key];
      return typeof label === 'string' ? label : k;
    });

  return (
    <Screen>
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm }}
      >
        <MaterialCommunityIcons name="chevron-left" size={22} color={colors.accent} />
        <Text variant="bodyBold" color={colors.accent}>
          {t.gallery.back}
        </Text>
      </Pressable>

      <Text variant="h1">{rb.name}</Text>
      <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
        {entry.mine
          ? t.gallery.youAuthor
          : t.gallery.byAuthor.replace('{name}', "\u2066" + entry.author + "\u2069")}
        {entry.humansNow > 0 && ` · ${t.gallery.humansNow.replace('{n}', String(entry.humansNow))}`}
      </Text>

      <TableCard>
        <Text variant="bodyBold" color={colors.textPrimary} style={{ marginBottom: spacing.xs }}>
          {t.gallery.configTitle}
        </Text>
        <ConfigRow label={t.gallery.deck} value={t.decks[rb.deck]} />
        <ConfigRow
          label={t.builder.stepTemplate}
          value={rb.template === 'shedding' ? t.builder.shedding : t.builder.pointsRace}
        />
        <ConfigRow
          label={t.builder.stepWin}
          value={rb.winCondition === 'emptyHand' ? t.builder.firstToEmpty : t.builder.lowestScore}
        />
        <ConfigRow label={t.gallery.players} value={String(rb.maxPlayers)} />
        {rb.template === 'pointsRace' && <ConfigRow label={t.builder.rounds} value={String(rb.rounds)} />}
        <ConfigRow
          label={t.builder.specialsTitle}
          value={specialsOn.length > 0 ? specialsOn.join(', ') : t.builder.noSpecials}
        />
      </TableCard>

      <TableCard>
        <Text variant="bodyBold" color={colors.textPrimary} style={{ marginBottom: spacing.xs }}>
          {t.gallery.rateTitle}
        </Text>
        {displayRating.count > 0 && (
          <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
            {displayRating.rating.toFixed(1)}★ · {t.gallery.ratings.replace('{n}', String(displayRating.count))}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable
              key={i}
              onPress={() => onRate(i)}
              accessibilityRole="button"
              accessibilityLabel={`${i} stars`}
              hitSlop={spacing.sm}
            >
              <MaterialCommunityIcons
                name={myStars >= i ? 'star' : 'star-outline'}
                size={36}
                color={myStars >= i ? colors.accent : colors.textTertiary}
              />
            </Pressable>
          ))}
        </View>
        <Text variant="caption" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: spacing.xs }}>
          {myStars > 0 ? t.gallery.yourRating.replace('{n}', String(myStars)) : t.gallery.tapToRate}
        </Text>
      </TableCard>

      <Button title={t.gallery.play} onPress={onPlay} />
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
