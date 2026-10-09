import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { TableCard } from '../components/TableCard';
import { useTheme } from '../theme/ThemeProvider';
import { useStrings } from '../i18n';
import { useSession } from '../store/session';
import { useThemes } from '../store/themes';
import { BACK_VARIANTS, CARD_BACKS, DECKS, FELTS, type BackVariant, type FeltDef } from '../theme/library';
import { backRequiredLevel, feltRequiredLevel, useProgression, xpForNextLevel } from '../store/progression';
import type { DeckKind } from '../engine/types';

// ThemesScreen — the theme library browser. Two sections:
// 1. Card backs, grouped by deck (3 each, tap to select)
// 2. Table felts, grid of 9 (royal is VIP-only)

const BACK_W = 62;
const BACK_H = 90;

function CheckBadge() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        position: 'absolute',
        top: -8,
        right: -8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>✓</Text>
    </View>
  );
}

function BackOption({
  deck,
  variant,
  name,
}: {
  deck: DeckKind;
  variant: BackVariant;
  name: string;
}) {
  const { colors, spacing } = useTheme();
  const { t } = useStrings();
  const { backVariant, setBackVariant } = useThemes();
  const { isBackUnlocked } = useProgression();
  const active = backVariant[deck] === variant;
  const unlocked = isBackUnlocked(deck, variant);
  const reqLevel = backRequiredLevel(deck, variant);
  const asset = CARD_BACKS.find((d) => d.deck === deck && d.variant === variant)!.asset;
  return (
    <Pressable
      onPress={() => {
        if (unlocked) setBackVariant(deck, variant);
      }}
      accessibilityRole="button"
      accessibilityLabel={unlocked ? name : `${name} — ${t.themes.lockedLevel.replace('{n}', String(reqLevel))}`}
      accessibilityState={{ selected: active }}
      style={{ alignItems: 'center', width: BACK_W + 16 }}
    >
      <View>
        {active && <CheckBadge />}
        <Image
          source={asset}
          style={{
            width: BACK_W,
            height: BACK_H,
            borderRadius: 8,
            borderWidth: active ? 3 : 1,
            borderColor: active ? colors.accent : 'rgba(0,0,0,0.25)',
            opacity: unlocked ? 1 : 0.45,
          }}
          resizeMode="cover"
        />
        {!unlocked && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 8,
              backgroundColor: 'rgba(0,0,0,0.45)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22 }}>🔒</Text>
            <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '800', marginTop: 2 }}>
              {t.themes.lockedLevel.replace('{n}', String(reqLevel))}
            </Text>
          </View>
        )}
      </View>
      <Text
        variant="caption"
        style={{
          marginTop: 4,
          textAlign: 'center',
          fontWeight: active ? '800' : '400',
          color: active ? colors.textPrimary : colors.textSecondary,
        }}
      >
        {name}
      </Text>
      <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.xs }}>
        {variant.toUpperCase()}
      </Text>
    </Pressable>
  );
}

function BackSection({ deck }: { deck: DeckKind }) {
  const { t } = useStrings();
  const { colors, spacing } = useTheme();
  const names = t.themes.backNames as Record<string, string>;
  return (
    <TableCard>
      <Text variant="h2" style={{ marginBottom: spacing.sm }}>
        {t.decks[deck]}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {BACK_VARIANTS.map((v) => (
          <BackOption key={v} deck={deck} variant={v} name={names[`${deck}-${v}`] ?? v} />
        ))}
      </View>
    </TableCard>
  );
}

function FeltOption({ felt, name }: { felt: FeltDef; name: string }) {
  const { colors, spacing, radii } = useTheme();
  const { t } = useStrings();
  const { vip } = useSession();
  const { feltId, setFeltId } = useThemes();
  const { isFeltUnlocked } = useProgression();
  const navigation = useNavigation<any>();
  const active = feltId === felt.id;
  const vipLocked = !!felt.vipOnly && !vip;
  const reqLevel = feltRequiredLevel(felt.id);
  const levelLocked = !felt.vipOnly && reqLevel !== null && !isFeltUnlocked(felt.id);
  const locked = vipLocked || levelLocked;

  const onPress = () => {
    if (vipLocked) {
      navigation.navigate('Vip');
      return;
    }
    if (levelLocked) return;
    setFeltId(felt.id);
  };

  const lockLabel = vipLocked
    ? t.themes.vipOnly
    : t.themes.lockedLevel.replace('{n}', String(reqLevel));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${name} — ${lockLabel}` : name}
      accessibilityState={{ selected: active }}
      style={{ width: '31%', marginBottom: spacing.md }}
    >
      <View>
        {active && <CheckBadge />}
        <Image
          source={felt.asset}
          style={{
            width: '100%',
            height: 110,
            borderRadius: radii.md,
            borderWidth: active ? 3 : 1,
            borderColor: active ? colors.accent : colors.border,
          }}
          resizeMode="cover"
        />
        {locked && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: radii.md,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 26 }}>{vipLocked ? '👑' : '🔒'}</Text>
            <Text variant="caption" style={{ color: vipLocked ? '#C9A227' : '#FFFFFF', fontWeight: '800', marginTop: 2 }}>
              {lockLabel}
            </Text>
          </View>
        )}
      </View>
      <Text
        variant="caption"
        style={{
          marginTop: 4,
          textAlign: 'center',
          fontWeight: active ? '800' : '400',
          color: active ? colors.textPrimary : colors.textSecondary,
        }}
      >
        {name}
      </Text>
    </Pressable>
  );
}

export function ThemesScreen() {
  const { t } = useStrings();
  const { colors, spacing } = useTheme();
  const { level, xp } = useProgression();
  const feltNames = t.themes.feltNames as Record<string, string>;
  const next = xpForNextLevel(level, xp);
  return (
    <Screen>
      <Text variant="h1">{t.themes.title}</Text>
      <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.xs }}>
        {t.progression.level.replace('{n}', String(level))}
        {next !== null
          ? ` · ${t.progression.xpToNext.replace('{n}', String(next)).replace('{m}', String(level + 1))}`
          : ` · ${t.progression.maxLevel}`}
      </Text>
      <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
        {t.themes.playToUnlock}
      </Text>

      {/* Card backs — one row per deck */}
      <Text variant="h2" style={{ marginBottom: spacing.sm }}>
        {t.themes.cardBacks}
      </Text>
      {DECKS.map((deck) => (
        <BackSection key={deck} deck={deck} />
      ))}

      {/* Table felts */}
      <Text variant="h2" style={{ marginBottom: spacing.xs }}>
        {t.themes.tableFelts}
      </Text>
      <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
        {t.themes.vipFeltHint}
      </Text>
      <TableCard>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {FELTS.map((f) => (
            <FeltOption key={f.id} felt={f} name={feltNames[f.nameKey] ?? f.id} />
          ))}
        </View>
      </TableCard>
    </Screen>
  );
}
