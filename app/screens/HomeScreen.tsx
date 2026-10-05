import React, { useState } from 'react';
import {
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { TableCard } from '../components/TableCard';
import { AdBanner } from '../components/AdBanner';
import { HouseTableRow, type MockTable } from '../components/HouseTableRow';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { useSession } from '../store/session';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

// ponytail: mock tables until engine/realtime hooks up (parallel track).
// Venue names stay untranslated in both locales — like real casino floors.
const MOCK_TABLES: MockTable[] = [
  {
    id: 'house-uno',
    name: 'Emerald Uno Night',
    deck: 'uno108',
    template: 'shedding',
    seated: 3,
    capacity: 6,
    players: [{ initials: 'S' }, { initials: 'O' }, { initials: 'L' }],
  },
  {
    id: 'house-classic',
    name: 'Classic Corner',
    deck: 'classic52',
    template: 'shedding',
    seated: 2,
    capacity: 5,
    players: [{ initials: 'F' }, { initials: 'M' }],
  },
  {
    id: 'house-baloot',
    name: 'Baloot Corner',
    deck: 'baloot32',
    template: 'pointsRace',
    seated: 4,
    capacity: 4,
    players: [{ initials: 'Y' }, { initials: 'D' }, { initials: 'K' }, { initials: 'N' }],
  },
];

// ponytail: VIP tables are a separate, gold-accented section (spec §8).
// Same MockTable shape — VIP is a property of the listing, not the engine.
const VIP_TABLES: MockTable[] = [
  {
    id: 'vip-uno',
    name: 'Midnight Uno Lounge',
    deck: 'uno108',
    template: 'shedding',
    seated: 4,
    capacity: 6,
    players: [{ initials: 'L' }, { initials: 'F' }, { initials: 'S' }, { initials: 'A' }],
  },
  {
    id: 'vip-baloot',
    name: 'Golden Baloot Majlis',
    deck: 'baloot32',
    template: 'pointsRace',
    seated: 2,
    capacity: 4,
    players: [{ initials: 'K' }, { initials: 'T' }],
  },
  {
    id: 'vip-classic',
    name: 'Emerald Elite',
    deck: 'classic52',
    template: 'shedding',
    seated: 5,
    capacity: 6,
    players: [
      { initials: 'N' },
      { initials: 'O' },
      { initials: 'M' },
      { initials: 'R' },
      { initials: 'H' },
    ],
  },
];

/**
 * Home: the lobby. Felt-texture room in dark mode (the felt IS the room),
 * cream lobby in light mode. Structure follows the approved mockup:
 * VIP teaser → wordmark → open tables → Quick Play hero.
 *
 * Deliberate deviations from the mockup (brand rules win):
 * - gold is VIP-only: Quick Play + JOIN use accent amber, wordmark uses
 *   textPrimary. Gold appears only inside the VIP teaser.
 * - no gambling language: no blinds/bets/"high roller" — deck + template
 *   labels instead, per the halal guardrails.
 * - tables are our v1 decks (Uno-108, Classic 52, Baloot 32), not
 *   Hold'em/Blackjack/Rummy.
 */
export function HomeScreen({ navigation }: Props) {
  const { t } = useStrings();
  const { colors, spacing, radii, colorScheme } = useTheme();
  const { vip } = useSession();
  // Which VIP table the non-VIP user just tapped — shows the upsell card.
  const [upsellFor, setUpsellFor] = useState<string | null>(null);

  const joinTable = (table: MockTable) =>
    navigation.navigate('Table', {
      tableId: table.id,
      deck: table.deck,
      template: table.template,
    });

  const joinVipTable = (table: MockTable) => {
    if (vip) {
      navigation.navigate('Table', {
        tableId: table.id,
        deck: table.deck,
        template: table.template,
        isVip: true,
      });
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setUpsellFor(table.id);
    }
  };

  const quickPlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const open = MOCK_TABLES.filter((tbl) => tbl.seated < tbl.capacity);
    const liveliest = [...open].sort(
      (a, b) => b.seated / b.capacity - a.seated / a.capacity,
    )[0];
    if (liveliest) joinTable(liveliest);
  };

  // 'Profile' lives on the tab navigator; the action bubbles up from this stack.
  const goToProfile = () => navigation.navigate('Profile' as never);

  const activeTotal = MOCK_TABLES.reduce((sum, tbl) => sum + tbl.seated, 0);

  const content = (
    <>
      {/* VIP teaser — the one surface where gold is allowed */}
      <TableCard vip>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radii.full,
              borderWidth: 1.5,
              borderColor: colors.gold,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons
              name="crown"
              size={24}
              color={colors.gold}
            />
          </View>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="bodyBold" color={colors.gold}>
              {t.home.vipLounge}
            </Text>
            <Text variant="caption" color={colors.vipText}>
              {t.home.vipTeaser}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <MaterialCommunityIcons
              name="hand-coin"
              size={18}
              color={colors.gold}
            />
            <Text variant="bodyBold" color={colors.vipText}>
              1,250
            </Text>
          </View>
        </View>
        <View style={{ height: spacing.sm }} />
        <Button
          variant="gold"
          size="sm"
          title={t.profile.becomeVip}
          onPress={goToProfile}
        />
      </TableCard>

      {/* Wordmark plaque */}
      <TableCard>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <MaterialCommunityIcons
            name="cards-spade"
            size={36}
            color={colors.accent}
          />
          <View style={{ gap: spacing.xs }}>
            <Text variant="h1">{t.appName}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t.home.lobbySub}
            </Text>
          </View>
        </View>
      </TableCard>

      {/* Open tables */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="h1">{t.home.openTables}</Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {activeTotal} {t.home.active}
        </Text>
      </View>

      {MOCK_TABLES.map((table, i) => (
        <HouseTableRow
          key={table.id}
          table={table}
          index={i}
          onJoin={joinTable}
        />
      ))}

      {/* VIP Tables — gold-accented, members only (spec §8) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <MaterialCommunityIcons name="crown" size={22} color={colors.gold} />
        <View style={{ flex: 1 }}>
          <Text variant="h1" color={colors.gold}>
            {t.vip.tables}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {t.vip.tablesSub}
          </Text>
        </View>
      </View>

      {VIP_TABLES.map((table) => {
        const deckLabel = t.decks[table.deck];
        const templateLabel =
          table.template === 'shedding' ? t.home.shedding : t.home.pointsRace;
        return (
          <TableCard key={table.id} vip>
            <Pressable
              onPress={() => joinVipTable(table)}
              accessibilityRole="button"
              accessibilityLabel={table.name}
              android_ripple={{ color: 'rgba(201,162,39,0.2)' }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                }}
              >
                <MaterialCommunityIcons
                  name="crown"
                  size={28}
                  color={colors.gold}
                />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="bodyBold" color={colors.vipText}>
                    {table.name}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    {deckLabel} • {templateLabel} • {table.seated}/
                    {table.capacity} {t.home.players}
                  </Text>
                </View>
                {vip ? (
                  <Button
                    size="sm"
                    variant="gold"
                    title={t.home.join}
                    onPress={() => joinVipTable(table)}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="lock"
                    size={22}
                    color={colors.gold}
                  />
                )}
              </View>
            </Pressable>
            {upsellFor === table.id && !vip && (
              <View style={{ paddingTop: spacing.md, gap: spacing.sm }}>
                <Text variant="bodyBold" color={colors.gold}>
                  {t.vip.membersOnly}
                </Text>
                <Text variant="bodySmall" color={colors.vipText}>
                  {t.vip.upsellBody}
                </Text>
                <Button
                  variant="gold"
                  size="sm"
                  title={t.vip.viewMembership}
                  onPress={() => navigation.navigate('Vip')}
                />
              </View>
            )}
          </TableCard>
        );
      })}

      {/* Quick Play hero — accent amber, never gold (free-tier CTA) */}
      <Pressable
        onPress={quickPlay}
        accessibilityRole="button"
        accessibilityLabel={t.home.quickPlay}
        android_ripple={{ color: 'rgba(0,0,0,0.15)' }}
        style={({ pressed }) => ({
          backgroundColor: colors.accent,
          borderRadius: radii.full,
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <MaterialCommunityIcons
          name="play"
          size={28}
          color={colors.textInverse}
        />
        <Text variant="h2" color={colors.textInverse}>
          {t.home.quickPlay}
        </Text>
      </Pressable>

      {/* Private-table entry point */}
      <Pressable
        onPress={() => navigation.navigate('PrivateTable', {})}
        accessibilityRole="link"
        style={{ alignItems: 'center', paddingVertical: spacing.sm }}
      >
        <Text variant="bodySmall" color={colors.accent}>
          {t.home.haveCode} {t.home.joinPrivate}
        </Text>
      </Pressable>

      {/* Free-tier ad slot — hidden for VIPs (spec §8) */}
      <AdBanner />
    </>
  );

  const scroll = (
    <ScrollView
      contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  );

  // Dark mode: the felt table IS the room (spec §10). Light mode keeps the
  // cream lobby — felt never covers the whole background there (light.ts).
  if (colorScheme === 'dark') {
    return (
      <ImageBackground
        source={require('../assets/felt.jpg')}
        resizeMode="cover"
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>{scroll}</SafeAreaView>
      </ImageBackground>
    );
  }
  return <Screen>{scroll}</Screen>;
}
