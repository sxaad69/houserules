import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { TableCard } from '../components/TableCard';
import { Button } from '../components/Button';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { useSession } from '../store/session';
import { fetchLeaderboard } from '../boards/data';
import type { BoardEntry } from '../boards/types';

/**
 * Leaderboards (spec §9): public for everyone, VIP visible to all but
 * fully readable only by VIPs. Visible exclusivity converts: non-VIPs see
 * the top 3 and locked silhouettes below.
 *
 * Halal: ranked by XP/tier only — never coins, never money won (spec §8).
 */

// Rows everyone can read on the VIP board before the lock kicks in.
const VIP_VISIBLE_ROWS = 3;

function rankMedal(rank: number): string | null {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

function BoardRow({
  entry,
  rank,
  locked = false,
}: {
  entry: BoardEntry;
  rank: number;
  locked?: boolean;
}) {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const medal = rankMedal(rank);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.md,
        backgroundColor: entry.isCurrent ? colors.accentMuted : 'transparent',
        opacity: locked ? 0.5 : 1,
      }}
    >
      <View style={{ width: 32, alignItems: 'center' }}>
        {medal ? (
          <Text variant="h2">{medal}</Text>
        ) : (
          <Text variant="bodySmall" color={colors.textSecondary}>
            {rank}
          </Text>
        )}
      </View>
      <Text variant="h2">{entry.avatar}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text variant="bodyBold" numberOfLines={1}>
            {entry.name}
          </Text>
          {entry.isCurrent && (
            <View
              style={{
                backgroundColor: colors.accent,
                borderRadius: radii.sm,
                paddingHorizontal: spacing.xs,
              }}
            >
              <Text variant="caption" color={colors.textInverse}>
                {t.boards.you}
              </Text>
            </View>
          )}
          {entry.isBot && (
            <Text variant="caption" color={colors.textTertiary}>
              {t.boards.bot}
            </Text>
          )}
        </View>
        <Text variant="caption" color={colors.textSecondary}>
          {entry.tier} · {entry.roundsWon} {t.boards.roundsWon}
        </Text>
      </View>
      {locked ? (
        <MaterialCommunityIcons
          name="lock"
          size={20}
          color={colors.gold}
        />
      ) : (
        <Text variant="bodyBold" color={colors.gold}>
          {entry.xp.toLocaleString()} {t.boards.xp}
        </Text>
      )}
    </View>
  );
}

export function LeaderboardsScreen() {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const { vip, playerId, displayName } = useSession();
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<'public' | 'vip'>('public');
  const [entries, setEntries] = useState<BoardEntry[] | null>(null);

  useEffect(() => {
    let alive = true;
    setEntries(null);
    fetchLeaderboard(tab, { playerId, displayName, vip }).then((rows) => {
      if (alive) setEntries(rows);
    });
    return () => {
      alive = false;
    };
  }, [tab, playerId, displayName, vip]);

  const isVipTab = tab === 'vip';
  const visibleEntries =
    isVipTab && !vip ? entries?.slice(0, VIP_VISIBLE_ROWS) ?? null : entries;
  const lockedCount =
    isVipTab && !vip && entries ? entries.length - VIP_VISIBLE_ROWS : 0;

  return (
    <Screen>
      <Text variant="h1">{t.boards.title}</Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(['public', 'vip'] as const).map((key) => {
          const active = tab === key;
          const goldTab = key === 'vip';
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: radii.lg,
                alignItems: 'center',
                backgroundColor: active
                  ? goldTab
                    ? colors.gold
                    : colors.accent
                  : colors.surfaceAlt,
              }}
            >
              <Text
                variant="bodyBold"
                color={active ? colors.textInverse : colors.textPrimary}
              >
                {key === 'public' ? t.boards.public : t.boards.vip}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TableCard vip={isVipTab}>
        {entries === null ? (
          <ActivityIndicator color={isVipTab ? colors.gold : colors.accent} />
        ) : (
          <View style={{ gap: spacing.xs }}>
            {visibleEntries!.map((entry, i) => (
              <BoardRow key={entry.playerId} entry={entry} rank={i + 1} />
            ))}
            {lockedCount > 0 && (
              <>
                {entries!
                  .slice(VIP_VISIBLE_ROWS)
                  .map((entry, i) => (
                    <BoardRow
                      key={entry.playerId}
                      entry={entry}
                      rank={VIP_VISIBLE_ROWS + i + 1}
                      locked
                    />
                  ))}
                <View style={{ height: spacing.sm }} />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: colors.gold,
                    paddingTop: spacing.md,
                  }}
                >
                  <MaterialCommunityIcons
                    name="crown"
                    size={28}
                    color={colors.gold}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyBold" color={colors.gold}>
                      {t.boards.unlockVip}
                    </Text>
                    <Text variant="caption" color={colors.vipText}>
                      {t.boards.vipRowsLocked}
                    </Text>
                  </View>
                </View>
                <View style={{ height: spacing.sm }} />
                <Button
                  variant="gold"
                  size="sm"
                  title={t.profile.becomeVip}
                  onPress={() => navigation.navigate('Vip')}
                />
              </>
            )}
          </View>
        )}
      </TableCard>
    </Screen>
  );
}
