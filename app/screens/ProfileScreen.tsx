import React from 'react';
import { View } from 'react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { TableCard } from '../components/TableCard';
import { useStrings } from '../i18n';
import { useLocale } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { useSession } from '../store/session';

/** Profile + wallet: coins, VIP membership, language. Spec §8. */
export function ProfileScreen() {
  const { t } = useStrings();
  const { locale, setLocale } = useLocale();
  const { colors, spacing } = useTheme();
  const { vip, coins, animalTitles } = useSession();

  return (
    <Screen>
      <Text variant="h1">{t.profile.title}</Text>

      <TableCard>
        <Text variant="overline" color={colors.textTertiary}>
          {t.profile.coins}
        </Text>
        <Text variant="display">{coins}</Text>
        <View style={{ height: spacing.sm }} />
        <Button title={t.profile.buyCoins} variant="secondary" onPress={() => {}} />
      </TableCard>

      <TableCard vip>
        <Text variant="overline" color={colors.gold}>
          {t.profile.vip}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {t.profile.vipSub}
        </Text>
        <View style={{ height: spacing.sm }} />
        <Button
          title={vip ? t.profile.vip : t.profile.becomeVip}
          variant="gold"
          disabled={vip}
          onPress={() => {}}
        />
      </TableCard>

      {animalTitles.length > 0 && (
        <TableCard>
          <Text variant="h3">{animalTitles.join(' · ')}</Text>
        </TableCard>
      )}

      <TableCard>
        <Text variant="h3">{t.profile.language}</Text>
        <View style={{ height: spacing.sm }} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            title="English"
            variant={locale === 'en' ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => setLocale('en')}
          />
          <Button
            title="العربية"
            variant={locale === 'ar' ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => setLocale('ar')}
          />
        </View>
      </TableCard>
    </Screen>
  );
}
