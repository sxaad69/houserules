import React, { useState } from 'react';
import { View } from 'react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { TableCard } from '../components/TableCard';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { useSession } from '../store/session';
import { COIN_PACKS } from '../economy';

/**
 * Coins wallet: balance + purchasable coin packs.
 * Halal guardrails (spec §8): coins are spent on gifts ONLY — never staked,
 * never bet, never cashed out. Winners receive ranks, never coins.
 * Real IAP is blocked on the Play Console account — the buy button shows an
 * honest "coming soon" placeholder, no fake billing.
 */
export function WalletScreen() {
  const { t } = useStrings();
  const { colors, spacing } = useTheme();
  const { coins } = useSession();
  const [notice, setNotice] = useState(false);

  return (
    <Screen>
      <Text variant="h1">{t.economy.title}</Text>

      <TableCard>
        <Text variant="overline" color={colors.textTertiary}>
          {t.economy.balance}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: 34 }}>🪙</Text>
          <Text variant="display">{coins}</Text>
        </View>
      </TableCard>

      <Text variant="h2">{t.economy.coinPacks}</Text>

      {COIN_PACKS.map((pack) => (
        <TableCard key={pack.sku}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ fontSize: 30 }}>🪙</Text>
              <Text variant="h3">
                {pack.coins} {t.economy.coins}
              </Text>
            </View>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t.economy.priceTbd}
            </Text>
          </View>
          <Button title={t.economy.buy} variant="secondary" onPress={() => setNotice(true)} />
        </TableCard>
      ))}

      {notice && (
        <TableCard>
          <Text variant="h3" style={{ marginBottom: spacing.xs }}>
            {t.economy.comingSoonTitle}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
            {t.economy.comingSoonBody}
          </Text>
          <Button title={t.common.close} variant="ghost" size="sm" onPress={() => setNotice(false)} />
        </TableCard>
      )}

      <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center' }}>
        {t.economy.halalNote}
      </Text>
    </Screen>
  );
}
