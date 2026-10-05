import React, { useCallback, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { TableCard } from '../components/TableCard';
import { HouseTableRow, type MockTable } from '../components/HouseTableRow';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import type { RootStackParamList } from '../navigation';
import {
  deleteRulebook,
  loadRulebooks,
  type CustomRulebook,
} from '../builder';
import {
  dismissNudge,
  isPublished,
  loadPlayCounts,
  loadPublished,
  markNudgeShown,
  nudgeStateFor,
  pickQuickMatch,
  publishRulebook,
  unpublishRulebook,
} from '../gallery';

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
  const [rulebooks, setRulebooks] = useState<CustomRulebook[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [nudge, setNudge] = useState<CustomRulebook | null>(null);

  // Reload "My Rulebooks" whenever Home regains focus (e.g. after saving).
  // Also refresh published state and check the creator nudge (spec §6:
  // after 3 plays of one rulebook, nudge "tweak these rules, make it yours").
  useFocusEffect(
    useCallback(() => {
      let live = true;
      loadRulebooks().then((list) => {
        if (!live) return;
        setRulebooks(list);
        loadPlayCounts().then(async (counts) => {
          if (!live) return;
          for (const rb of list) {
            if ((counts[rb.id] ?? 0) >= 3 && (await nudgeStateFor(rb.id)) == null) {
              setNudge(rb);
              await markNudgeShown(rb.id);
              break;
            }
          }
        });
      });
      loadPublished().then((pub) => {
        if (live) setPublishedIds(new Set(pub.map((x) => x.id)));
      });
      return () => {
        live = false;
      };
    }, []),
  );

  const joinTable = (table: MockTable) =>
    navigation.navigate('Table', {
      tableId: table.id,
      deck: table.deck,
      template: table.template,
    });

  const playRulebook = (rb: CustomRulebook) =>
    navigation.navigate('Table', {
      tableId: `custom-${rb.id}`,
      deck: rb.deck,
      template: rb.template,
      rulebook: rb,
    });

  const onDelete = (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    deleteRulebook(id).then(setRulebooks).catch(() => {});
  };

  const togglePublish = (rb: CustomRulebook) => {
    (publishedIds.has(rb.id) ? unpublishRulebook(rb.id) : publishRulebook(rb))
      .then(() => loadPublished())
      .then((pub) => setPublishedIds(new Set(pub.map((x) => x.id))))
      .catch(() => {});
  };

  /** Phase 2: drop into a random community table, solo vs bots. */
  const quickMatch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    pickQuickMatch()
      .then((entry) => {
        if (!entry) return;
        const rb = entry.rulebook;
        navigation.navigate('Table', {
          tableId: `quick-${rb.id}`,
          deck: rb.deck,
          template: rb.template,
          rulebook: rb,
        });
      })
      .catch(() => {});
  };

  const dismissNudgeCard = () => {
    if (nudge) dismissNudge(nudge.id).catch(() => {});
    setNudge(null);
  };

  const openNudgeInBuilder = () => {
    if (!nudge) return;
    const rb = nudge;
    setNudge(null);
    navigation.navigate('Builder', { from: rb });
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

      {/* Phase 2: Browse community rulebooks + Quick Match (spec home order) */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Pressable
          onPress={() => navigation.navigate('Gallery')}
          accessibilityRole="button"
          accessibilityLabel={t.gallery.browse}
          android_ripple={{ color: 'rgba(0,0,0,0.15)' }}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: colors.surfaceAlt,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <MaterialCommunityIcons name="view-grid-outline" size={22} color={colors.accent} />
          <Text variant="bodyBold" color={colors.textPrimary}>
            {t.gallery.browse}
          </Text>
        </Pressable>
        <Pressable
          onPress={quickMatch}
          accessibilityRole="button"
          accessibilityLabel={t.gallery.quickMatch}
          android_ripple={{ color: 'rgba(0,0,0,0.15)' }}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: colors.surfaceAlt,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <MaterialCommunityIcons name="shuffle" size={22} color={colors.accent} />
          <Text variant="bodyBold" color={colors.textPrimary}>
            {t.gallery.quickMatch}
          </Text>
        </Pressable>
      </View>

      {/* Phase 2: Creator nudge — 3 plays of one rulebook (spec §6) */}
      {nudge && (
        <TableCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <MaterialCommunityIcons name="hammer-wrench" size={30} color={colors.accent} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text variant="bodyBold" color={colors.textPrimary}>
                {t.gallery.nudgeTitle}
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t.gallery.nudgeBody.replace('{name}', nudge.name)}
              </Text>
            </View>
            <Pressable
              onPress={dismissNudgeCard}
              accessibilityRole="button"
              accessibilityLabel={t.gallery.nudgeDismiss}
              hitSlop={spacing.sm}
              style={{ padding: spacing.xs }}
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.textTertiary} />
            </Pressable>
          </View>
          <View style={{ height: spacing.sm }} />
          <Button title={t.gallery.nudgeCta} onPress={openNudgeInBuilder} />
        </TableCard>
      )}

      {/* Phase 2: Create — Rulebook Builder entry point */}
      <TableCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <MaterialCommunityIcons
            name="hammer-wrench"
            size={36}
            color={colors.accent}
          />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="h2">{t.builder.create}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t.builder.createSub}
            </Text>
          </View>
        </View>
        <View style={{ height: spacing.sm }} />
        <Button
          title={t.builder.title}
          onPress={() => navigation.navigate('Builder')}
        />
      </TableCard>

      {/* Phase 2: My Rulebooks */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="h1">{t.builder.myRulebooks}</Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {rulebooks.length}
        </Text>
      </View>
      {rulebooks.length === 0 ? (
        <TableCard>
          <Text variant="bodyBold" color={colors.textPrimary} style={{ textAlign: 'center' }}>
            {t.builder.empty}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: spacing.xs }}>
            {t.builder.emptySub}
          </Text>
        </TableCard>
      ) : (
        rulebooks.map((rb) => {
          const deckName =
            rb.deck === 'uno108' ? t.decks.uno108
            : rb.deck === 'classic52' ? t.decks.classic52
            : rb.deck === 'baloot32' ? t.decks.baloot32
            : t.decks.animals12;
          const templateName = rb.template === 'shedding' ? t.home.shedding : t.home.pointsRace;
          const confirming = confirmDeleteId === rb.id;
          return (
            <TableCard key={rb.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="bodyBold" color={colors.textPrimary}>{rb.name}</Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    {`${deckName} · ${templateName} · ${rb.maxPlayers} ${t.home.players}`}
                  </Text>
                </View>
                <Button size="sm" title={t.builder.play} onPress={() => playRulebook(rb)} />
                <Pressable
                  onPress={() => togglePublish(rb)}
                  accessibilityRole="button"
                  accessibilityLabel={publishedIds.has(rb.id) ? t.gallery.unpublish : t.gallery.publish}
                  hitSlop={spacing.sm}
                  style={{ padding: spacing.xs }}
                >
                  <MaterialCommunityIcons
                    name={publishedIds.has(rb.id) ? 'cloud-check' : 'cloud-upload-outline'}
                    size={22}
                    color={publishedIds.has(rb.id) ? colors.success : colors.textSecondary}
                  />
                </Pressable>
                <Pressable
                  onPress={() => onDelete(rb.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t.builder.delete}
                  hitSlop={spacing.sm}
                  style={{ padding: spacing.xs }}
                >
                  <MaterialCommunityIcons
                    name={confirming ? 'delete-alert' : 'delete-outline'}
                    size={22}
                    color={confirming ? colors.danger : colors.textSecondary}
                  />
                </Pressable>
              </View>
              {confirming && (
                <Text variant="caption" color={colors.danger} style={{ marginTop: spacing.xs }}>
                  {t.builder.confirmDelete}
                </Text>
              )}
            </TableCard>
          );
        })
      )}
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
