import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
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
  DECK_FILTERS,
  DEFAULT_FILTERS,
  PLAYERS_FILTERS,
  fetchGallery,
  loadRatings,
  type DeckFilter,
  type GalleryEntry,
  type GalleryFilters,
  type GallerySort,
  type PlayersFilter,
} from '../gallery';

type Props = NativeStackScreenProps<RootStackParamList, 'Gallery'>;

const SORTS: GallerySort[] = ['popular', 'topRated', 'newest'];

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialCommunityIcons
          key={i}
          name={value >= i - 0.25 ? 'star' : value >= i - 0.75 ? 'star-half-full' : 'star-outline'}
          size={size}
          color={colors.accent}
        />
      ))}
    </View>
  );
}

function EntryCard({ entry, onOpen }: { entry: GalleryEntry; onOpen: () => void }) {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const rb = entry.rulebook;
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={rb.name}>
      <TableCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radii.lg,
              backgroundColor: colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="cards-playing" size={28} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text variant="bodyBold" color={colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>
                {rb.name}
              </Text>
              {entry.featured && (
                <View
                  style={{
                    backgroundColor: colors.accentMuted,
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.xs,
                    paddingVertical: 2,
                  }}
                >
                  <Text variant="caption" color={colors.accent}>
                    {t.gallery.featured}
                  </Text>
                </View>
              )}
              {entry.mine && (
                <View
                  style={{
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.xs,
                    paddingVertical: 2,
                  }}
                >
                  <Text variant="caption" color={colors.textSecondary}>
                    {t.gallery.mine}
                  </Text>
                </View>
              )}
            </View>
            <Text variant="caption" color={colors.textSecondary}>
              {entry.mine
                ? t.gallery.youAuthor
                // Isolate the author name so RTL names (e.g. Arabic) don't
                // scramble the surrounding LTR text (bidi).
                : t.gallery.byAuthor.replace('{name}', "\u2066" + entry.author + "\u2069")}
              {' · '}
              {rb.maxPlayers} {t.gallery.players.toLowerCase()}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 }}>
              {entry.rating > 0 ? (
                <>
                  <Stars value={entry.rating} />
                  <Text variant="caption" color={colors.textSecondary}>
                    {entry.rating.toFixed(1)} ({entry.ratingsCount})
                  </Text>
                </>
              ) : (
                <Text variant="caption" color={colors.textSecondary}>
                  {t.gallery.tapToRate}
                </Text>
              )}
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
        </View>
        {(entry.humansNow > 0 || entry.plays > 0) && (
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
            {entry.humansNow > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View
                  style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }}
                />
                <Text variant="caption" color={colors.success}>
                  {t.gallery.humansNow.replace('{n}', String(entry.humansNow))}
                </Text>
              </View>
            )}
            {entry.plays > 0 && (
              <Text variant="caption" color={colors.textTertiary}>
                {t.gallery.plays.replace('{n}', entry.plays.toLocaleString())}
              </Text>
            )}
          </View>
        )}
      </TableCard>
    </Pressable>
  );
}

export function GalleryScreen({ navigation }: Props) {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const [filters, setFilters] = useState<GalleryFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<GallerySort>('popular');
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([fetchGallery(filters, sort), loadRatings()])
      .then(([list, ratings]) => {
        // Blend local ratings into displayed averages (honest: local only).
        const blended = list.map((e) => {
          const mine = ratings[e.id];
          if (mine == null) return e;
          const total = e.rating * e.ratingsCount + mine;
          const count = e.ratingsCount + 1;
          return { ...e, rating: total / count, ratingsCount: count };
        });
        setEntries(blended);
        setMyRatings(ratings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters, sort]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Refresh when returning from detail (ratings may have changed).
  useEffect(() => {
    const unsub = navigation.addListener('focus', reload);
    return unsub;
  }, [navigation, reload]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.deck !== 'all') n++;
    if (filters.players !== 'all') n++;
    if (filters.minRating > 0) n++;
    if (filters.liveOnly) n++;
    return n;
  }, [filters]);

  const deckName = (d: DeckFilter) =>
    d === 'all' ? t.gallery.anyDeck : t.decks[d];

  const openEntry = (entry: GalleryEntry) => navigation.navigate('GalleryDetail', { entryId: entry.id });

  return (
    <Screen>
      <Text variant="h1">{t.gallery.title}</Text>
      <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
        {t.gallery.subtitle}
      </Text>

      {/* Sort tabs */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
        {SORTS.map((s) => {
          const active = sort === s;
          const label =
            s === 'popular' ? t.gallery.sortPopular : s === 'topRated' ? t.gallery.sortTopRated : t.gallery.sortNewest;
          return (
            <Pressable
              key={s}
              onPress={() => setSort(s)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                borderRadius: radii.lg,
                alignItems: 'center',
                backgroundColor: active ? colors.accent : colors.surfaceAlt,
              }}
            >
              <Text variant="bodyBold" color={active ? colors.textInverse : colors.textSecondary}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Filters toggle */}
      <Pressable
        onPress={() => setFiltersOpen((v) => !v)}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          marginBottom: filtersOpen ? spacing.sm : spacing.md,
        }}
      >
        <MaterialCommunityIcons name="filter-variant" size={20} color={colors.accent} />
        <Text variant="bodyBold" color={colors.accent}>
          {t.gallery.filters}
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </Text>
        <MaterialCommunityIcons
          name={filtersOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.accent}
        />
        {activeFilterCount > 0 && (
          <Pressable
            onPress={() => setFilters(DEFAULT_FILTERS)}
            hitSlop={spacing.sm}
            style={{ marginStart: 'auto' }}
          >
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t.gallery.clearFilters}
            </Text>
          </Pressable>
        )}
      </Pressable>

      {filtersOpen && (
        <TableCard>
          <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.xs }}>
            {t.gallery.deck}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
            {DECK_FILTERS.map((d) => {
              const active = filters.deck === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setFilters((f) => ({ ...f, deck: d }))}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    borderRadius: radii.full,
                    backgroundColor: active ? colors.accent : colors.surfaceAlt,
                  }}
                >
                  <Text variant="bodySmall" color={active ? colors.textInverse : colors.textPrimary}>
                    {deckName(d)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.xs }}>
            {t.gallery.players}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
            {PLAYERS_FILTERS.map((p) => {
              const active = filters.players === p;
              return (
                <Pressable
                  key={String(p)}
                  onPress={() => setFilters((f) => ({ ...f, players: p as PlayersFilter }))}
                  style={{
                    minWidth: 44,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    borderRadius: radii.full,
                    alignItems: 'center',
                    backgroundColor: active ? colors.accent : colors.surfaceAlt,
                  }}
                >
                  <Text variant="bodySmall" color={active ? colors.textInverse : colors.textPrimary}>
                    {p === 'all' ? t.gallery.anyPlayers : String(p)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.xs }}>
            {t.gallery.minRating}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm }}>
            {[0, 3, 4, 4.5].map((r) => {
              const active = filters.minRating === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setFilters((f) => ({ ...f, minRating: r }))}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    borderRadius: radii.full,
                    backgroundColor: active ? colors.accent : colors.surfaceAlt,
                  }}
                >
                  <Text variant="bodySmall" color={active ? colors.textInverse : colors.textPrimary}>
                    {r === 0 ? t.gallery.anyRating : `${r}★+`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => setFilters((f) => ({ ...f, liveOnly: !f.liveOnly }))}
            accessibilityRole="switch"
            accessibilityState={{ checked: filters.liveOnly }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <MaterialCommunityIcons
              name={filters.liveOnly ? 'toggle-switch' : 'toggle-switch-off-outline'}
              size={30}
              color={filters.liveOnly ? colors.success : colors.textTertiary}
            />
            <Text variant="body" color={colors.textPrimary}>
              {t.gallery.liveOnly}
            </Text>
          </Pressable>
        </TableCard>
      )}

      {/* Results */}
      {loading ? (
        <Text variant="bodySmall" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: spacing.lg }}>
          …
        </Text>
      ) : entries.length === 0 ? (
        <TableCard>
          <Text variant="bodyBold" color={colors.textPrimary} style={{ textAlign: 'center' }}>
            {t.gallery.empty}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: spacing.xs }}>
            {t.gallery.emptySub}
          </Text>
        </TableCard>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {entries.map((e) => (
            <EntryCard key={e.id} entry={e} onOpen={() => openEntry(e)} />
          ))}
        </View>
      )}
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
