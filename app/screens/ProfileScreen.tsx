import React from 'react';
import { View, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { TableCard } from '../components/TableCard';
import { useStrings } from '../i18n';
import { useLocale } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { useSession } from '../store/session';
import { useAudio } from '../store/audio';

function VolumeBar({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const { colors, spacing } = useTheme();
  const steps = [0, 0.25, 0.5, 0.75, 1];
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      {steps.map((s) => {
        const filled = s === 0 ? value === 0 : value >= s;
        return (
          <Pressable
            key={s}
            onPress={() => onChange(s)}
            style={{
              flex: 1,
              height: 28,
              borderRadius: 6,
              backgroundColor: filled ? colors.accent : colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              variant="bodySmall"
              color={filled ? colors.textInverse : colors.textTertiary}
            >
              {s === 0 ? '✕' : `${Math.round(s * 100)}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Profile + wallet: coins, VIP membership, language. Spec §8. */
export function ProfileScreen({ navigation }: { navigation: any }) {
  const { t } = useStrings();
  const { locale, setLocale } = useLocale();
  const { colors, spacing } = useTheme();
  const { vip, setVip, coins, animalTitles } = useSession();
  const {
    musicOn,
    setMusicOn,
    musicVolume,
    setMusicVolume,
    sfxOn,
    setSfxOn,
    sfxVolume,
    setSfxVolume,
  } = useAudio();

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
        <Text variant="h3">🔊 {t.profile.sound}</Text>
        <View style={{ height: spacing.sm }} />

        <Text variant="bodySmall" color={colors.textTertiary}>
          {t.profile.music}
        </Text>
        <View style={{ height: spacing.xs }} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            title={t.profile.on}
            variant={musicOn ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => setMusicOn(true)}
          />
          <Button
            title={t.profile.off}
            variant={!musicOn ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => setMusicOn(false)}
          />
        </View>
        <View style={{ height: spacing.xs }} />
        <Text variant="bodySmall" color={colors.textTertiary}>
          {t.profile.musicVolume}
        </Text>
        <View style={{ height: spacing.xs }} />
        <VolumeBar value={musicVolume} onChange={setMusicVolume} />

        <View style={{ height: spacing.md }} />
        <Text variant="bodySmall" color={colors.textTertiary}>
          {t.profile.sfx}
        </Text>
        <View style={{ height: spacing.xs }} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            title={t.profile.on}
            variant={sfxOn ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => setSfxOn(true)}
          />
          <Button
            title={t.profile.off}
            variant={!sfxOn ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => setSfxOn(false)}
          />
        </View>
        <View style={{ height: spacing.xs }} />
        <Text variant="bodySmall" color={colors.textTertiary}>
          {t.profile.sfxVolume}
        </Text>
        <View style={{ height: spacing.xs }} />
        <VolumeBar value={sfxVolume} onChange={setSfxVolume} />
      </TableCard>

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
