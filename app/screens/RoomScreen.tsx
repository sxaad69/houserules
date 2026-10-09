import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { TableCard } from '../components/TableCard';
import { PlayingCard } from '../components/PlayingCard';
import { SeatView } from '../components/SeatView';
import { GiftPicker } from '../components/GiftPicker';
import { GiftCelebration } from '../components/GiftCelebration';
import { useGiftSending } from '../economy/useGiftSending';
import { crazyGames } from '../integrations/crazygames';
import { audioManager } from '../audio/manager';
import { useTheme } from '../theme/ThemeProvider';
import { TABLE_THEMES } from '../theme/tableThemes';
import { useStrings } from '../i18n';
import { useSession } from '../store/session';
import { useThemes } from '../store/themes';
import { avatarForName } from '../bots/personas';
import { useRoom, type LiveEmote, type RoomRole } from '../realtime/useRoom';
import { EMOTES, PHRASE_KEYS, generateRoomCode, type PhraseKey } from '../realtime/protocol';
import type { Card } from '../engine/cards';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Room'>;

const DOT_COLORS: Record<string, string> = {
  red: '#D64545',
  yellow: '#D9A62E',
  green: '#3FA34D',
  blue: '#3D7BE8',
};

function botAvatar(name: string): string {
  return avatarForName(name.replace(/ \(bot\)$/, ''));
}

/** Floating reaction bubble over a seat: fades in, holds, fades out (~2.5s).
 *  Web-safe: opacity-only Animated, same pattern as SeatView's pulse. */
function EmoteBubble({ emote, style }: { emote: LiveEmote; style: StyleProp<ViewStyle> }) {
  const { t } = useStrings();
  const { colors, radii, spacing } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const seq = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1700),
      Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]);
    seq.start();
    return () => seq.stop();
  }, [opacity]);

  const label = emote.kind === 'emote' ? emote.value : t.social[emote.value as PhraseKey];

  return (
    <Animated.View style={[{ opacity }, style]} pointerEvents="none">
      <View
        style={{
          backgroundColor: 'rgba(0,0,0,0.65)',
          borderRadius: radii.full,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: emote.kind === 'emote' ? 30 : 15, color: '#FFFFFF', fontWeight: emote.kind === 'emote' ? '400' : '700' }}>
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}

/** Emote + quick-phrase picker: a polished bottom sheet with chat-bubble
 *  phrase pills and a clean emote grid. Theme tokens only — no gold. */
function SocialPanel({ onPick }: { onPick: (kind: 'emote' | 'phrase', value: string) => void }) {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();

  return (
    <View
      testID="emote-picker"
      style={{
        position: 'absolute',
        bottom: 265,
        left: spacing.md,
        right: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        paddingTop: spacing.xs,
        paddingBottom: spacing.md,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 10,
      }}
    >
      {/* drag handle */}
      <View style={{ alignItems: 'center', marginBottom: spacing.xs }}>
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.borderStrong,
          }}
        />
      </View>
      <Text
        variant="overline"
        color={colors.textTertiary}
        style={{ marginBottom: spacing.xs, letterSpacing: 1.2 }}
      >
        {t.social.emotes}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
        {EMOTES.map((e) => (
          <Pressable
            key={e}
            onPress={() => onPick('emote', e)}
            accessibilityRole="button"
            accessibilityLabel={e}
            testID={`emote-pick-${e}`}
            style={({ pressed }) => ({
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: pressed ? colors.accentMuted : colors.felt,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: 26 }}>{e}</Text>
          </Pressable>
        ))}
      </View>
      <Text
        variant="overline"
        color={colors.textTertiary}
        style={{ marginBottom: spacing.xs, letterSpacing: 1.2 }}
      >
        {t.social.phrases}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {PHRASE_KEYS.map((k) => (
          <Pressable
            key={k}
            onPress={() => onPick('phrase', k)}
            accessibilityRole="button"
            accessibilityLabel={t.social[k]}
            testID={`phrase-pick-${k}`}
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.accent : colors.surfaceAlt,
              borderRadius: radii.full,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderWidth: 1,
              borderColor: pressed ? colors.accent : colors.borderStrong,
              // chat-bubble tail hint: slightly squarer on the leading edge
              borderTopLeftRadius: radii.sm,
            })}
          >
            <Text
              variant="bodySmall"
              style={{ fontWeight: '700' }}
              color={colors.textPrimary}
            >
              {t.social[k]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Pre-game lobby: room code, player list, host controls. */
function RoomLobby({ code, role, room }: { code: string; role: RoomRole; room: ReturnType<typeof useRoom> }) {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const players = room.lobby?.players ?? [];

  return (
    <Screen>
      <Text variant="h1">{role === 'host' ? t.room.hostTitle : t.room.guestTitle}</Text>
      <TableCard>
        <Text variant="caption" color={colors.textSecondary}>
          {t.room.codeLabel}
        </Text>
        <Text variant="h1" style={{ letterSpacing: 6, marginVertical: spacing.xs }} testID="room-code">
          {code}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {t.room.codeHint}
        </Text>
      </TableCard>

      <TableCard>
        <Text variant="h2" style={{ marginBottom: spacing.sm }}>
          {t.room.players} ({players.length})
        </Text>
        {players.map((p) => (
          <View
            key={p.playerId}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 }}
          >
            <Text style={{ fontSize: 24 }}>{p.isBot ? botAvatar(p.name) : '🧑'}</Text>
            <Text variant="body" style={{ flex: 1 }}>
              {p.name}
            </Text>
            {p.isBot && (
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.full, backgroundColor: colors.surfaceAlt }}>
                <Text variant="caption" color={colors.textSecondary}>BOT</Text>
              </View>
            )}
          </View>
        ))}
        {players.length === 0 && (
          <Text variant="bodySmall" color={colors.textSecondary}>
            {room.connected ? t.room.waitingPlayers : t.room.connecting}
          </Text>
        )}
      </TableCard>

      {role === 'host' ? (
        <View style={{ gap: spacing.sm }}>
          <Button title={t.room.addBot} onPress={room.addBot} variant="secondary" />
          <Button
            title={t.room.startGame}
            onPress={room.startGame}
            disabled={players.filter((p) => !p.isBot).length < 1}
          />
        </View>
      ) : (
        <Text variant="bodySmall" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          {t.room.waitingHost}
        </Text>
      )}
    </Screen>
  );
}

/** Live network table: dumb terminal rendering host state. */
function NetTable({ room, navigation }: { room: ReturnType<typeof useRoom>; navigation: Props['navigation'] }) {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const { playerId } = useSession();
  const { felt } = useThemes();
  const [wildCard, setWildCard] = useState<Card | null>(null);
  const gift = useGiftSending();

  const ps = room.publicState!;
  const theme = TABLE_THEMES[ps.deckKind] ?? TABLE_THEMES.classic52;
  const opponents = ps.players.filter((p) => p.id !== playerId);
  const legal = new Set(ps.legalByPlayer[playerId] ?? []);
  const me = ps.players.find((p) => p.id === playerId);
  const isWild = (c: Card) => c.action === 'wild' || c.action === 'wild4';
  const [socialOpen, setSocialOpen] = useState(false);

  const pickSocial = (kind: 'emote' | 'phrase', value: string) => {
    room.sendEmote(kind, value);
    audioManager.playSfx('emote');
    setSocialOpen(false);
  };

  // CrazyGames: gameplay telemetry for network tables.
  useEffect(() => {
    if (ps.phase === 'playing') crazyGames.gameplayStart();
    if (ps.phase === 'gameOver') crazyGames.gameplayStop();
  }, [ps.phase]);
  useEffect(() => () => crazyGames.gameplayStop(), []);

  /** Bubble anchor per seat — mirrors the SeatView positions above. */
  const bubbleStyleFor = (from: string): StyleProp<ViewStyle> => {
    if (from === playerId) return { position: 'absolute', bottom: 195, alignSelf: 'center' };
    const idx = opponents.findIndex((p) => p.id === from);
    if (idx === 0) return { position: 'absolute', top: 128, alignSelf: 'center' };
    if (idx === 1) return { position: 'absolute', top: '24%', left: spacing.lg };
    if (idx === 2) return { position: 'absolute', top: '24%', right: spacing.lg };
    return { position: 'absolute', top: 128, alignSelf: 'center' };
  };

  const playCard = (card: Card, declaredColor?: string) => {
    if (!room.isMyTurn) return;
    room.sendAction({ type: 'play', playerId, cardId: card.id, ...(declaredColor ? { declaredColor } : {}) });
    setWildCard(null);
  };

  const onCardTap = (card: Card) => {
    if (!room.isMyTurn || !legal.has(card.id)) return;
    if (isWild(card)) setWildCard(card);
    else playCard(card);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.feltDeep }}>
      <Image
        source={felt()}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlay, opacity: theme.opacity }} />

      {/* top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingTop: spacing.lg }}>
        <Text variant="caption" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {t.room.round} {ps.round} · {ps.deckKind === 'uno108' ? 'UNO 108' : ps.deckKind === 'classic52' ? 'Classic 52' : ps.deckKind === 'baloot32' ? 'Baloot 32' : 'Animals 12'}
        </Text>
        <Pressable
          onPress={gift.openPicker}
          accessibilityLabel={t.economy.sendGift}
          accessibilityRole="button"
          hitSlop={spacing.md}
          style={{ marginLeft: 'auto', padding: spacing.xs }}
        >
          <Text style={{ fontSize: 22 }}>🎁</Text>
        </Pressable>
      </View>

      {/* opponent seats */}
      {opponents.slice(0, 1).map((p) => (
        <SeatView key={p.id} name={p.name} avatar={p.isBot ? botAvatar(p.name) : undefined} handCount={p.handCount} active={ps.turnPlayerId === p.id} style={{ position: 'absolute', top: 70, alignSelf: 'center' }} />
      ))}
      {opponents.slice(1, 2).map((p) => (
        <SeatView key={p.id} name={p.name} avatar={p.isBot ? botAvatar(p.name) : undefined} handCount={p.handCount} active={ps.turnPlayerId === p.id} style={{ position: 'absolute', left: spacing.sm, top: '30%' }} />
      ))}
      {opponents.slice(2, 3).map((p) => (
        <SeatView key={p.id} name={p.name} avatar={p.isBot ? botAvatar(p.name) : undefined} handCount={p.handCount} active={ps.turnPlayerId === p.id} style={{ position: 'absolute', right: spacing.sm, top: '30%' }} />
      ))}

      {/* center piles */}
      <View style={{ position: 'absolute', top: '38%', alignSelf: 'center', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <Pressable
            onPress={() => room.isMyTurn && room.sendAction({ type: 'draw', playerId })}
            disabled={!room.isMyTurn}
            testID="draw-pile"
            accessibilityLabel={t.table.draw}
            accessibilityRole="button"
            style={{ opacity: room.isMyTurn ? 1 : 0.45 }}
          >
            <PlayingCard
              card={{ id: 'draw', deck: ps.deckKind, color: null, suit: null, rank: '', action: null, animal: null }}
              size="md"
              faceDown
            />
            <View style={{ position: 'absolute', top: -8, right: -8, minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="caption" style={{ color: colors.textInverse, fontWeight: '700' }}>{ps.drawCount}</Text>
            </View>
          </Pressable>
          {ps.discardTop && <PlayingCard card={ps.discardTop} size="md" />}
        </View>
        {ps.activeColor && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: spacing.sm }}>
            {Object.entries(DOT_COLORS).map(([name, hex]) => (
              <View key={name} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: hex, borderWidth: ps.activeColor === name ? 2 : 0, borderColor: '#fff' }} />
            ))}
          </View>
        )}
        {ps.pendingDraw > 0 && (
          <Text variant="caption" style={{ color: '#fff', marginTop: 4 }}>+{ps.pendingDraw}</Text>
        )}
      </View>

      {/* status */}
      <View style={{ position: 'absolute', bottom: 150, alignSelf: 'center' }}>
        <Text variant="bodySmall" style={{ color: '#fff', fontWeight: '600' }}>
          {ps.status || (room.isMyTurn ? t.table.yourTurn : '')}
        </Text>
      </View>

      {/* incoming reaction bubbles (touch-transparent overlay) */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {room.emotes.map((e) => (
          <EmoteBubble key={e.id} emote={e} style={bubbleStyleFor(e.from)} />
        ))}
      </View>

      {/* emote FAB */}
      <Pressable
        onPress={() => setSocialOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={t.social.openPanel}
        testID="emote-button"
        style={{
          position: 'absolute',
          bottom: 200,
          right: spacing.md,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Text style={{ fontSize: 26 }}>😊</Text>
      </Pressable>

      {socialOpen && <SocialPanel onPick={pickSocial} />}

      {/* my hand */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: spacing.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 6 }}>
          {room.myHand.map((card) => (
            <PlayingCard
              key={card.id}
              card={card}
              size="md"
              highlighted={room.isMyTurn && legal.has(card.id)}
              dimmed={room.isMyTurn && legal.size > 0 && !legal.has(card.id)}
              onPress={() => onCardTap(card)}
              testID={`hand-card-${card.id}`}
            />
          ))}
        </ScrollView>
        <Text variant="caption" style={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 4 }}>
          {me?.name} · {room.myHand.length} {t.room.cards}
        </Text>
      </View>

      {/* wild color picker */}
      {wildCard && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, alignItems: 'center' }}>
            <Text variant="h2" style={{ marginBottom: spacing.md }}>{t.table.chooseColor}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              {Object.entries(DOT_COLORS).map(([name, hex]) => (
                <Pressable
                  key={name}
                  onPress={() => playCard(wildCard, name)}
                  accessibilityLabel={name}
                  accessibilityRole="button"
                  style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: hex }}
                />
              ))}
            </View>
            <Pressable onPress={() => setWildCard(null)} style={{ marginTop: spacing.md }}>
              <Text variant="bodySmall" color={colors.textSecondary}>{t.common.cancel}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {ps.phase === 'gameOver' && ps.winnerId && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="h1" style={{ color: '#fff' }}>
            {ps.players.find((p) => p.id === ps.winnerId)?.name} {t.table.wins}
          </Text>
        </View>
      )}

      {/* Gift sending (spec §8: coins → gifts only, direct sale, no loot boxes) */}
      <GiftPicker
        visible={gift.pickerOpen}
        coins={gift.coins}
        vip={gift.vip}
        error={gift.error}
        onSelect={gift.send}
        onClose={gift.closePicker}
        onGoToWallet={() => {
          gift.closePicker();
          navigation.navigate('Wallet');
        }}
      />
      {gift.celebration && <GiftCelebration gift={gift.celebration} />}
    </View>
  );
}

export function RoomScreen({ route, navigation }: Props) {
  const { t } = useStrings();
  const [hostGone, setHostGone] = useState(false);
  const { code, role, deck, template } = route.params;
  const room = useRoom({ code, role, deck, template, onHostLeft: () => setHostGone(true) });

  React.useEffect(() => {
    if (hostGone) {
      const timer = setTimeout(() => navigation.goBack(), 2500);
      return () => clearTimeout(timer);
    }
  }, [hostGone, navigation]);

  if (hostGone) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="h2">{t.room.hostLeft}</Text>
        </View>
      </Screen>
    );
  }

  if (!room.publicState) {
    return <RoomLobby code={code} role={role} room={room} />;
  }
  return <NetTable room={room} navigation={navigation} />;
}

export { generateRoomCode };
