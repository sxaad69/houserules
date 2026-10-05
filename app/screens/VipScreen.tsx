import React, { useState } from 'react';
import { View } from 'react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { TableCard } from '../components/TableCard';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { useSession } from '../store/session';

/**
 * VIP membership: flat monthly tier (spec §8) — no ads, VIP tables, VIP
 * leaderboard, fancier gift animations. A club membership, never staked on
 * outcomes. Real IAP is blocked on the Play Console account — subscribe shows
 * an honest "coming soon" placeholder, no fake billing.
 * Gold appears here because this is a VIP surface (gold is VIP-only).
 */
export function VipScreen() {
  const { t } = useStrings();
  const { colors, spacing } = useTheme();
  const { vip } = useSession();
  const [notice, setNotice] = useState(false);

  const benefits = [
    t.economy.vipBenefitAds,
    t.economy.vipBenefitTables,
    t.economy.vipBenefitBoards,
    t.economy.vipBenefitGifts,
  ];

  return (
    <Screen>
      <Text variant="h1" color={colors.gold}>
        {t.economy.vipTitle}
      </Text>

      <TableCard vip>
        {vip ? (
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ fontSize: 52 }}>👑</Text>
            <Text variant="h2" color={colors.gold}>
              {t.economy.vipActive}
            </Text>
          </View>
        ) : (
          <>
            {benefits.map((b) => (
              <View
                key={b}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.xs,
                }}
              >
                <Text variant="bodyBold" color={colors.gold}>
                  ✓
                </Text>
                <Text variant="body" color={colors.vipText}>
                  {b}
                </Text>
              </View>
            ))}
            <View style={{ height: spacing.md }} />
            <Text
              variant="bodySmall"
              color={colors.vipText}
              style={{ textAlign: 'center', marginBottom: spacing.sm }}
            >
              {t.economy.vipPrice}
            </Text>
            <Button title={t.economy.subscribe} variant="gold" onPress={() => setNotice(true)} />
          </>
        )}
      </TableCard>

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
    </Screen>
  );
}
