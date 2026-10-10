import React from 'react';
import { View, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { TableCard } from '../components/TableCard';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { useSession } from '../store/session';

/** Profile + wallet: coins, VIP membership. Settings live on their own screen. */
export function ProfileScreen({ navigation }: { navigation: any }) {
  const { t } = useStrings();
  const { colors, spacing } = useTheme();
  const { vip, setVip, coins, animalTitles } = useSession();

  return (
    <Screen>
      <Text variant="h1">{t.profile.title}</Text>

      <TableCard>
        <Text variant="overline" color={colors.textTertiary}>
          {t.profile.coins}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: 28 }}>🪙</Text>
          <Text variant="display">{coins}</Text>
        </View>
        <View style={{ height: spacing.sm }} />
        <Button
          title={t.profile.buyCoins}
          variant="secondary"
          onPress={() => navigation.navigate('Wallet')}
        />
      </TableCard>

      <TableCard vip>
        <Text variant="overline" color={colors.gold}>
          {t.profile.vip}
        </Text>
        <Text variant="bodySmall" color={colors.vipText}>
          {vip ? t.economy.vipActive : t.profile.vipSub}
        </Text>
        <View style={{ height: spacing.sm }} />
        <Button
          title={vip ? t.profile.vip : t.profile.becomeVip}
          variant="gold"
          onPress={() => navigation.navigate('Vip')}
        />
        <View style={{ height: spacing.sm }} />
        <Button
          title={`${t.economy.testToggle}: ${vip ? 'ON' : 'OFF'}`}
          variant="secondary"
          size="sm"
          onPress={() => setVip(!vip)}
        />
      </TableCard>

      {animalTitles.length > 0 && (
        <TableCard>
          <Text variant="h3">{animalTitles.join(' · ')}</Text>
        </TableCard>
      )}

      <TableCard>
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        >
          <Text variant="h3">⚙️ {t.profile.settings}</Text>
          <View style={{ flex: 1 }} />
          <Text variant="body" color={colors.textTertiary}>›</Text>
        </Pressable>
      </TableCard>
    </Screen>
  );
}
