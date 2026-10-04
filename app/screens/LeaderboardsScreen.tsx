import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { TableCard } from '../components/TableCard';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { useSession } from '../store/session';

/**
 * Two leaderboards (spec §9): public for everyone, VIP visible to all but
 * joinable only by VIPs. Visible exclusivity converts.
 */
export function LeaderboardsScreen() {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const { vip } = useSession();
  const [tab, setTab] = useState<'public' | 'vip'>('public');

  return (
    <Screen>
      <Text variant="h1">{t.boards.title}</Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(['public', 'vip'] as const).map((key) => {
          const active = tab === key;
          const isVipTab = key === 'vip';
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
                  ? isVipTab
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

      <TableCard vip={tab === 'vip'}>
        {tab === 'vip' && !vip ? (
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t.boards.vipLocked}
          </Text>
        ) : (
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t.common.comingSoon}
          </Text>
        )}
      </TableCard>
    </Screen>
  );
}
