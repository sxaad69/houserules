import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { TableCard } from '../components/TableCard';
import { PlayingCard } from '../components/PlayingCard';
import { SeatView } from '../components/SeatView';
import { useTheme } from '../theme/ThemeProvider';
import { TABLE_THEMES } from '../theme/tableThemes';
import { useStrings } from '../i18n';
import { useSession } from '../store/session';
import { avatarForName } from '../bots/personas';
import { useRoom, type RoomRole } from '../realtime/useRoom';
import { generateRoomCode } from '../realtime/protocol';
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
function NetTable({ room }: { room: ReturnType<typeof useRoom> }) {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const { playerId } = useSession();
  const [wildCard, setWildCard] = useState<Card | null>(null);

  const ps = room.publicState!;
  const theme = TABLE_THEMES[ps.deckKind] ?? TABLE_THEMES.classic52;
  const opponents = ps.players.filter((p) => p.id !== playerId);
  const legal = new Set(ps.legalByPlayer[playerId] ?? []);
  const me = ps.players.find((p) => p.id === playerId);
  const isWild = (c: Card) => c.action === 'wild' || c.action === 'wild4';

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
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlay, opacity: theme.opacity }} />

      {/* top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingTop: spacing.lg }}>
        <Text variant="caption" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {t.room.round} {ps.round} · {ps.deckKind === 'uno108' ? 'UNO 108' : ps.deckKind === 'classic52' ? 'Classic 52' : ps.deckKind === 'baloot32' ? 'Baloot 32' : 'Animals 12'}
        </Text>
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
  return <NetTable room={room} />;
}

export { generateRoomCode };
