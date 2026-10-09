import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { PlayingCard } from '../components/PlayingCard';
import { SeatView } from '../components/SeatView';
import { TABLE_THEMES } from '../theme/tableThemes';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { useThemes } from '../store/themes';
import { useProgression } from '../store/progression';
import { audioManager } from '../audio/manager';
import { xpForGame } from '../progression/awards';
import { loadRivalry, recordRivalry, type RivalryMap } from '../progression/rivalry';
import {
  applyAction,
  createGame,
  currentPlayer,
  declarableColors,
  legalPlays,
  type Action,
  type Card,
  type GameState,
  type SeatInput,
} from '../engine';
import { botForSeat, playBotTurn, botReaction, type BotDifficulty, type BotReactionEvent } from '../bots';
import { avatarForName } from '../bots/personas';
import { GiftPicker } from '../components/GiftPicker';
import { GiftCelebration } from '../components/GiftCelebration';
import { useGiftSending } from '../economy/useGiftSending';
import type { Rulebook } from '../engine/types';
import { crazyGames } from '../integrations/crazygames';
import { customFeltById, isCustomRulebook, type CustomRulebook } from '../builder';
import { recordPlay } from '../gallery/storage';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Table'>;

const HUMAN_ID = 'you';
/** Selected table felt from the theme library (was: single felt.jpg). */
/**
 * Per-deck table theming (spec §10: theming system, not one palette).
 * The felt texture stays; a deck-tinted overlay sets the atmosphere.
 * Classic 52 keeps the pure emerald casino felt.
 */
/* TABLE_THEMES moved to theme/tableThemes.ts — single source of truth. */
/** Bot "thinking" pause — human-like, not instant (1.5–3s). */
const BOT_MIN_MS = 1500;
const BOT_JITTER_MS = 1500;

const DEFAULT_SPECIALS = {
  skip: true,
  reverse: true,
  drawTwo: true,
  wild: true,
  wildDrawFour: true,
};

const DOT_COLORS: Record<string, string> = {
  red: '#D64545',
  yellow: '#D9A62E',
  green: '#3FA34D',
  blue: '#3D7BE8',
};
const SUIT_GLYPH: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

function buildSeats(tableId: string, botCount: number): { seats: SeatInput[]; difficulties: Record<string, BotDifficulty> } {
  const seats: SeatInput[] = [{ id: HUMAN_ID, name: 'you', isBot: false }];
  const difficulties: Record<string, BotDifficulty> = {};
  for (let i = 0; i < botCount; i++) {
    const bot = botForSeat(tableId, i);
    seats.push({ id: bot.id, name: bot.name, isBot: true });
    difficulties[bot.id] = bot.difficulty;
  }
  return { seats, difficulties };
}

/**
 * The game table — top-down, solo vs bots (v1). Engine owns all rules;
 * this screen only renders state and forwards intents as Actions.
 * File ownership: screens/ — engine/, bots/, realtime/ are read-only.
 */
export function TableScreen({ route, navigation }: Props) {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const { felt } = useThemes();

  const deck = route.params.deck ?? 'uno108';
  const template = route.params.template ?? 'shedding';
  // Phase 2: a custom rulebook from the Builder overrides the house preset.
  const custom: CustomRulebook | undefined = isCustomRulebook(route.params.rulebook)
    ? route.params.rulebook
    : undefined;
  const feltOverride = custom ? customFeltById(custom.feltThemeId) : null;
  const tableTheme = feltOverride
    ? { overlay: feltOverride.overlay, opacity: feltOverride.opacity }
    : TABLE_THEMES[deck] ?? TABLE_THEMES.classic52;
  const botCount = custom ? Math.max(1, custom.maxPlayers - 1) : 3;

  const rulebook: Rulebook = useMemo(
    () =>
      custom ?? {
        id: `house-${deck}`,
        name: 'House Table',
        deck,
        template,
        specials: { ...DEFAULT_SPECIALS },
        winCondition: template === 'pointsRace' ? 'lowestScore' : 'emptyHand',
        minPlayers: 2,
        maxPlayers: 8,
        turnSeconds: 0,
      },
    [custom, deck, template],
  );

  const [game, setGame] = useState<GameState | null>(null);
  const [difficulties, setDifficulties] = useState<Record<string, BotDifficulty>>({});
  const [wildCard, setWildCard] = useState<Card | null>(null);
  const [roundKey, setRoundKey] = useState(0);
  const gift = useGiftSending();

  // Phase B — game feel.
  /** Move timer: seconds left on the human's turn (null = timer inactive). */
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  /** Bot reaction speech bubble: which opponent seat + text. */
  const [bubble, setBubble] = useState<{ seatIdx: number; text: string } | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Rate-limit: log.length at each bot's last reaction (max 1 per 3 turns). */
  const lastReactionLog = useRef<Record<string, number>>({});
  /** Spectacle: gold flash overlay 0..1 over 0.6s on big moments. */
  const spectacleAnim = useRef(new Animated.Value(0)).current;

  // --- Phase B: game feel -------------------------------------------------
  const turnSeconds = rulebook.turnSeconds;

  /** Big-moment celebration: the played card pulses larger + a gold flash. */
  const triggerSpectacle = () => {
    popAnim.setValue(0.55);
    Animated.spring(popAnim, { toValue: 1.28, friction: 5, useNativeDriver: true }).start(() => {
      Animated.spring(popAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    });
    spectacleAnim.setValue(0);
    Animated.timing(spectacleAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  };

  /**
   * Bot personality: maybe show a reaction bubble above the bot's seat.
   * Tasteful: max 1 reaction per 3 turns per bot (+ the reaction itself is gated).
   */
  const maybeBotReact = (g: GameState, botId: string, event: BotReactionEvent, seatIdx: number) => {
    const last = lastReactionLog.current[botId] ?? -Infinity;
    if (g.log.length - last < 3) return;
    const r = botReaction(g, botId, event, Date.now());
    if (!r) return;
    lastReactionLog.current[botId] = g.log.length;
    const text = r.kind === 'emote' ? r.value : ((t.social as Record<string, string>)[r.value] ?? r.value);
    setBubble({ seatIdx, text });
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 2500);
  };

  /** Move timer expired: play a random legal card, else draw. */
  const autoPlay = () => {
    setGame((prev) => {
      if (!prev || prev.phase !== 'playing') return prev;
      if (currentPlayer(prev).id !== HUMAN_ID) return prev;
      try {
        const plays = legalPlays(prev, HUMAN_ID);
        if (plays.length > 0) {
          const card = plays[Math.floor(Math.random() * plays.length)];
          const dc = declarableColors(prev.deckKind);
          const action: Action =
            card.action === 'wild' || card.action === 'wild4'
              ? {
                  type: 'play',
                  playerId: HUMAN_ID,
                  cardId: card.id,
                  declaredColor: dc[Math.floor(Math.random() * dc.length)],
                }
              : { type: 'play', playerId: HUMAN_ID, cardId: card.id };
          return applyAction(prev, action, Date.now());
        }
        return applyAction(prev, { type: 'draw', playerId: HUMAN_ID }, Date.now());
      } catch {
        return prev;
      }
    });
  };

  // Clear any lingering bubble timer on unmount.
  useEffect(
    () => () => {
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    },
    [],
  );

  // Modest motion: deal-in on mount/rematch, pop on new discard.
  const dealAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(1)).current;
  const lastDiscardLen = useRef(0);

  useEffect(() => {
    const { seats, difficulties: diffs } = buildSeats(route.params.tableId, botCount);
    setDifficulties(diffs);
    setGame(
      createGame(rulebook, seats, {
        seed: Date.now(),
        rounds: custom?.rounds,
        includeJokers: custom?.includeJokers,
      }),
    );
    setWildCard(null);
    lastDiscardLen.current = 0;
    dealAnim.setValue(0);
    audioManager.playSfx('shuffle');
    Animated.timing(dealAnim, { toValue: 1, duration: 450, useNativeDriver: true })
      .start();
    crazyGames.gameplayStart();
    return () => crazyGames.gameplayStop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulebook, route.params.tableId, roundKey]);

  useEffect(() => {
    const len = game?.discardPile.length ?? 0;
    if (game && len !== lastDiscardLen.current) {
      lastDiscardLen.current = len;
      const top = game.discardPile[game.discardPile.length - 1];
      // Spectacle on big moments; modest pop otherwise.
      const isSpectacle = !!top && (top.action === 'wild' || top.action === 'wild4' || top.action === 'draw2');
      if (isSpectacle) {
        triggerSpectacle();
      } else {
        popAnim.setValue(0.55);
        Animated.spring(popAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
      }
      // Sound: someone played a card. Wilds get the magic treatment.
      if (top && (top.action === 'wild' || top.action === 'wild4')) {
        audioManager.playSfx('wild');
      } else {
        audioManager.playSfx('cardPlay');
      }
      // Special card sounds.
      if (top?.action === 'skip') audioManager.playSfx('skip');
      if (top?.action === 'reverse') audioManager.playSfx('reverse');
      if (top?.action === 'draw2' || top?.action === 'wild4') audioManager.playSfx('drawPenalty');
      // Bot personality: react to attacks and wilds (rate-limited).
      const lastPlay = [...game.log].reverse().find((a) => a.type === 'play');
      if (top && lastPlay && lastPlay.playerId !== HUMAN_ID) {
        const foes = game.players.filter((p) => p.id !== HUMAN_ID);
        const seatIdx = foes.findIndex((p) => p.id === lastPlay.playerId);
        const event: BotReactionEvent | null =
          top.action === 'draw2' || top.action === 'wild4'
            ? 'attack'
            : top.action === 'wild'
              ? 'wild'
              : null;
        if (event && seatIdx >= 0) maybeBotReact(game, lastPlay.playerId, event, seatIdx);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.discardPile.length, game, popAnim]);

  // Sound: your turn chime + game-over fanfare.
  const lastTurnKey = useRef<string | null>(null);
  useEffect(() => {
    if (!game || game.phase !== 'playing') return;
    const cur = currentPlayer(game);
    const key = `${cur.id}:${game.discardPile.length}`;
    if (cur.id === HUMAN_ID && lastTurnKey.current !== key) {
      lastTurnKey.current = key;
      audioManager.playSfx('yourTurn');
    } else if (cur.id !== HUMAN_ID) {
      lastTurnKey.current = key;
    }
  }, [game]);
  useEffect(() => {
    if (game?.phase === 'gameOver' && game.winnerId) {
      audioManager.playSfx(game.winnerId === HUMAN_ID ? 'win' : 'lose');
      triggerSpectacle();
      // Bot personality: the winning bot celebrates (rate-limited).
      if (game.winnerId !== HUMAN_ID) {
        const foes = game.players.filter((p) => p.id !== HUMAN_ID);
        const seatIdx = foes.findIndex((p) => p.id === game.winnerId);
        if (seatIdx >= 0) maybeBotReact(game, game.winnerId, 'win', seatIdx);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase]);

  // Load rivalry records for the game-over display.
  const [rivalry, setRivalry] = useState<RivalryMap>({});
  useEffect(() => {
    loadRivalry().then(setRivalry).catch(() => {});
  }, []);

  // Move timer: reset the countdown whenever the turn passes to the human.
  // turnSeconds 0 = no timer (house tables keep their relaxed pace).
  useEffect(() => {
    if (turnSeconds <= 0 || !game || game.phase !== 'playing' || currentPlayer(game).id !== HUMAN_ID) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(turnSeconds);
  }, [turnSeconds, game?.turn, roundKey, game?.phase]);

  // Move timer: tick down; tick SFX at 5s and below; auto-play at zero.
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      autoPlay();
      setTimeLeft(null);
      return;
    }
    if (timeLeft <= 5) audioManager.playSfx('tick');
    const id = setTimeout(() => setTimeLeft((t) => (t === null ? null : t - 1)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Phase 2 gallery: record one finished game per custom rulebook (creator nudge).
  // Keyed by roundKey so rematches count as separate games; the ref guards
  // against double-counting the same gameOver across re-renders.
  const countedGameRef = useRef<string | null>(null);
  useEffect(() => {
    if (!custom || !game || game.phase !== 'gameOver') return;
    const key = `${custom.id}:${roundKey}`;
    if (countedGameRef.current === key) return;
    countedGameRef.current = key;
    recordPlay(custom.id).catch(() => {});
  }, [custom, game, roundKey]);

  // Phase C: XP + rivalry, recorded once per finished game (all tables).
  const { addXp } = useProgression();
  const xpCountedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!game || game.phase !== 'gameOver' || !game.winnerId) return;
    const key = `xp:${route.params.tableId}:${roundKey}`;
    if (xpCountedRef.current === key) return;
    xpCountedRef.current = key;
    const humanWon = game.winnerId === HUMAN_ID;
    addXp(xpForGame(humanWon));
    const winner = game.players.find((p) => p.id === game.winnerId);
    const bots = game.players.filter((p) => p.isBot).map((p) => p.name);
    const human = game.players.find((p) => p.id === HUMAN_ID);
    recordRivalry(bots, winner?.name ?? '', human?.name ?? t.table.you)
      .then(setRivalry)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase, roundKey]);

  // Bot driver: when a bot holds the turn, think briefly, then act.
  // Human-like pace (1.5–3s). When a move timer is on, always act with
  // at least 1.5s to spare so bots never eat a timeout.
  useEffect(() => {
    if (!game || game.phase !== 'playing') return;
    if (!currentPlayer(game).isBot) return;
    const baseDelay = BOT_MIN_MS + Math.random() * BOT_JITTER_MS;
    const delay =
      turnSeconds > 0 ? Math.min(baseDelay, Math.max(600, turnSeconds * 1000 - 1500)) : baseDelay;
    const timer = setTimeout(() => {
      setGame((prev) => {
        if (!prev || prev.phase !== 'playing') return prev;
        const cur = currentPlayer(prev);
        if (!cur.isBot) return prev;
        try {
          return playBotTurn(prev, cur.id, difficulties[cur.id] ?? 'medium', Date.now());
        } catch {
          // ponytail: a failed bot turn must never brick the table.
          return prev;
        }
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [game, difficulties, turnSeconds]);

  const tryAction = (action: Action) => {
    setGame((prev) => {
      if (!prev) return prev;
      try {
        return applyAction(prev, action, Date.now());
      } catch {
        return prev; // illegal intent ignored — validation lives in the engine
      }
    });
  };

  const onCardPress = (card: Card) => {
    if (!game || game.phase !== 'playing') return;
    if (currentPlayer(game).id !== HUMAN_ID || game.pendingDraw > 0) return;
    if (!legalPlays(game, HUMAN_ID).some((c) => c.id === card.id)) return;
    if (card.action === 'wild' || card.action === 'wild4') {
      setWildCard(card); // color picker modal takes it from here
      return;
    }
    tryAction({ type: 'play', playerId: HUMAN_ID, cardId: card.id });
  };

  const onWildColor = (color: string) => {
    if (wildCard) tryAction({ type: 'play', playerId: HUMAN_ID, cardId: wildCard.id, declaredColor: color });
    setWildCard(null);
  };

  const onDraw = () => {
    if (!game || game.phase !== 'playing' || currentPlayer(game).id !== HUMAN_ID) return;
    audioManager.playSfx('cardDraw');
    tryAction({ type: 'draw', playerId: HUMAN_ID });
  };

  const displayName = (id: string, name: string) => (id === HUMAN_ID ? t.table.you : name);

  // CrazyGames: stop gameplay telemetry when the game ends.
  // (Placed before the !game early-return: hooks must run unconditionally.)
  const isOver = game?.phase === 'gameOver';
  useEffect(() => {
    if (isOver) crazyGames.gameplayStop();
  }, [isOver]);

  if (!game) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.feltDeep, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="body" color={colors.cardFace}>{t.table.waiting}</Text>
      </View>
    );
  }

  const me = game.players.find((p) => p.id === HUMAN_ID)!;
  const cur = currentPlayer(game);
  const isHumanTurn = game.phase === 'playing' && cur.id === HUMAN_ID;
  const legal = isHumanTurn ? legalPlays(game, HUMAN_ID) : [];
  const legalIds = new Set(legal.map((c) => c.id));
  const mustDraw = isHumanTurn && game.pendingDraw === 0 && legal.length === 0;
  const topCard = game.discardPile[game.discardPile.length - 1];
  const opponents = game.players.filter((p) => p.id !== HUMAN_ID);
  const winner = isOver ? game.players.find((p) => p.id === game.winnerId) : null;
  const colorsForWild = declarableColors(game.deckKind);
  const useSuits = game.deckKind === 'classic52' || game.deckKind === 'baloot32';

  const statusText = isOver
    ? ''
    : !isHumanTurn
      ? t.table.thinking.replace('{name}', displayName(cur.id, cur.name))
      : game.pendingDraw > 0
        ? t.table.drawN.replace('{n}', String(game.pendingDraw))
        : legal.length > 0
          ? t.table.yourTurn
          : t.table.draw;


  return (
    <View style={{ flex: 1, backgroundColor: colors.feltDeep }}>
      <ImageBackground source={felt()} style={{ flex: 1 }} resizeMode="cover">
        {tableTheme.opacity > 0 && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: tableTheme.overlay,
              opacity: tableTheme.opacity,
            }}
          />
        )}
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Top bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityLabel={t.table.leave}
              accessibilityRole="button"
              hitSlop={spacing.md}
              style={{ padding: spacing.xs }}
            >
              <Text variant="h2" style={{ color: '#FFFFFF' }}>‹</Text>
            </Pressable>
            <Text variant="bodySmall" style={{ color: '#FFFFFF', fontWeight: '700', letterSpacing: 2 }}>
              {`${t.table.round} ${game.round}${game.template === 'pointsRace' ? `/${game.rounds}` : ''} · ${template === 'shedding' ? 'SHEDDING' : 'POINTS'}`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {deck === 'uno108' ? 'UNO 108' : deck === 'classic52' ? '52' : deck === 'baloot32' ? '32' : '12'}
              </Text>
              <Pressable
                onPress={gift.openPicker}
                accessibilityLabel={t.economy.sendGift}
                accessibilityRole="button"
                hitSlop={spacing.md}
                style={{ padding: spacing.xs }}
              >
                <Text style={{ fontSize: 22 }}>🎁</Text>
              </Pressable>
            </View>
          </View>

          {/* Points-race scoreboard */}
          {game.template === 'pointsRace' && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md, paddingBottom: spacing.xs }}>
              {game.players.map((p) => (
                <Text key={p.id} variant="caption" style={{ color: p.id === cur.id ? colors.accent : 'rgba(255,255,255,0.75)', fontWeight: p.id === cur.id ? '700' : '400' }}>
                  {`${displayName(p.id, p.name)}: ${p.score}`}
                </Text>
              ))}
            </View>
          )}

          {/* Table area */}
          <Animated.View style={{ flex: 1, minHeight: 0, opacity: dealAnim }}>
            {/* Opponent seats */}
            {opponents.slice(0, 1).map((p) => (
              <SeatView
                key={p.id}
                name={displayName(p.id, p.name)}
                avatar={avatarForName(p.name)}
                handCount={p.hand.length}
                active={!isOver && cur.id === p.id}
                bubble={bubble?.seatIdx === 0 ? bubble.text : null}
                style={{ position: 'absolute', top: spacing.sm, alignSelf: 'center' }}
              />
            ))}
            {opponents.slice(1, 2).map((p) => (
              <SeatView
                key={p.id}
                name={displayName(p.id, p.name)}
                avatar={avatarForName(p.name)}
                handCount={p.hand.length}
                active={!isOver && cur.id === p.id}
                bubble={bubble?.seatIdx === 1 ? bubble.text : null}
                style={{ position: 'absolute', left: spacing.sm, top: '34%' }}
              />
            ))}
            {opponents.slice(2, 3).map((p) => (
              <SeatView
                key={p.id}
                name={displayName(p.id, p.name)}
                avatar={avatarForName(p.name)}
                handCount={p.hand.length}
                active={!isOver && cur.id === p.id}
                bubble={bubble?.seatIdx === 2 ? bubble.text : null}
                style={{ position: 'absolute', right: spacing.sm, top: '34%' }}
              />
            ))}
            {opponents.slice(3).map((p, i) => (
              <SeatView
                key={p.id}
                name={displayName(p.id, p.name)}
                avatar={avatarForName(p.name)}
                handCount={p.hand.length}
                active={!isOver && cur.id === p.id}
                bubble={bubble?.seatIdx === 3 + i ? bubble.text : null}
                style={{ position: 'absolute', top: spacing.sm, alignSelf: 'center', marginTop: 120 }}
              />
            ))}

            {/* Center piles */}
            <View style={{ position: 'absolute', top: '42%', alignSelf: 'center', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                {/* Draw pile */}
                <Pressable
                  onPress={onDraw}
                  disabled={!isHumanTurn}
                  accessibilityLabel={t.table.draw}
                  accessibilityRole="button"
                  hitSlop={spacing.sm}
                  style={{ opacity: isHumanTurn ? 1 : 0.85, alignItems: 'center' }}
                >
                  <PlayingCard
                    card={{ id: 'draw-stub', deck, color: null, suit: null, rank: '', action: null, animal: null }}
                    size="md"
                    faceDown
                    backId={custom?.cardBackId}
                  />
                  <View
                    style={{
                      marginTop: 4,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      borderRadius: radii.full,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 2,
                    }}
                  >
                    <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                      {game.drawPile.length}
                    </Text>
                  </View>
                  {isHumanTurn && (
                    <View
                      style={{
                        marginTop: 4,
                        backgroundColor: colors.accent,
                        borderRadius: radii.full,
                        paddingHorizontal: spacing.md,
                        paddingVertical: 4,
                      }}
                    >
                      <Text variant="caption" style={{ color: colors.textInverse, fontWeight: '700' }}>
                        {t.table.draw}
                      </Text>
                    </View>
                  )}
                </Pressable>
                {/* Discard pile */}
                <Animated.View style={{ transform: [{ scale: popAnim }] }}>
                  {topCard && <PlayingCard card={topCard} size="md" />}
                </Animated.View>
              </View>
              {/* Active color indicator (wilds) */}
              {game.activeColor && (
                <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm }}>
                  {colorsForWild.map((c) => (
                    <View
                      key={c}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: useSuits ? 'rgba(255,255,255,0.25)' : DOT_COLORS[c],
                        borderWidth: game.activeColor === c ? 2 : 0,
                        borderColor: '#FFFFFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {useSuits && (
                        <Text variant="caption" style={{ color: '#FFFFFF', fontSize: 11 }}>
                          {SUIT_GLYPH[c]}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>

          {/* Spectacle: gold flash on wilds, attacks and wins (0.6s). */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: colors.gold,
              opacity: spectacleAnim.interpolate({
                inputRange: [0, 0.35, 1],
                outputRange: [0, 0.3, 0],
              }),
            }}
          />

          {/* Status + actions */}
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
            {!isOver && (
              <View style={{ alignItems: 'center', marginBottom: spacing.xs }}>
                {isHumanTurn && turnSeconds > 0 && timeLeft !== null && (
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      borderWidth: 3,
                      borderColor: timeLeft <= 5 ? colors.danger : colors.accent,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: spacing.xs,
                    }}
                    accessibilityLabel={`${timeLeft} seconds left`}
                  >
                    <Text variant="h3" style={{ color: '#FFFFFF' }}>
                      {timeLeft}
                    </Text>
                  </View>
                )}
                <Text
                  variant="bodySmall"
                  style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }}
                >
                  {statusText}
                </Text>
              </View>
            )}
            {isHumanTurn && (mustDraw || game.pendingDraw > 0) && (
              <Button
                title={game.pendingDraw > 0 ? t.table.drawN.replace('{n}', String(game.pendingDraw)) : t.table.draw}
                onPress={onDraw}
                style={{ marginBottom: spacing.sm }}
              />
            )}
            {/* Human hand */}
            {!isOver && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.xs }}
              >
                {me.hand.map((card, i) => {
                  const playable = legalIds.has(card.id);
                  return (
                    <View key={card.id} style={{ marginLeft: i === 0 ? 0 : -34 }}>
                      <PlayingCard
                        card={card}
                        size="lg"
                        highlighted={isHumanTurn && playable}
                        dimmed={isHumanTurn && !playable && legal.length > 0}
                        onPress={isHumanTurn ? () => onCardPress(card) : undefined}
                        accessibilityLabel={`${card.rank} ${card.color ?? card.suit ?? ''}`}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Wild color picker */}
          <Modal visible={wildCard !== null} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, width: '72%' }}>
                <Text variant="h3" color={colors.textPrimary} style={{ textAlign: 'center', marginBottom: spacing.md }}>
                  {t.table.chooseColor}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md }}>
                  {colorsForWild.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => onWildColor(c)}
                      accessibilityLabel={c}
                      accessibilityRole="button"
                      hitSlop={spacing.sm}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: useSuits ? colors.surfaceAlt : DOT_COLORS[c],
                        borderWidth: 2,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {useSuits && (
                        <Text variant="h2" color={colors.textPrimary}>{SUIT_GLYPH[c]}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </Modal>

          {/* Round-end overlay */}
          <Modal visible={isOver} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
              <View style={{ backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, width: '84%', alignItems: 'center' }}>
                <Text variant="h1" color={colors.textPrimary} style={{ textAlign: 'center' }}>
                  {winner && winner.id === HUMAN_ID
                    ? t.table.youWin
                    : t.table.winsRound.replace('{name}', winner ? displayName(winner.id, winner.name) : '')}
                </Text>
                {game.winningCard?.animal && (
                  <Text variant="body" color={colors.accent} style={{ marginTop: spacing.sm, textAlign: 'center', fontWeight: '700' }}>
                    {t.table.claimsTitle.replace('{animal}', game.winningCard.animal.toUpperCase())}
                  </Text>
                )}
                {/* Phase C: head-to-head rivalry records */}
                {opponents.length > 0 && (
                  <View style={{ marginTop: spacing.md, width: '100%' }}>
                    <Text variant="overline" color={colors.textTertiary} style={{ textAlign: 'center', marginBottom: spacing.xs }}>
                      {t.rivalry.title}
                    </Text>
                    {opponents.map((p) => {
                      const rec = rivalry[p.name];
                      if (!rec || (rec.wins === 0 && rec.losses === 0)) return null;
                      return (
                        <View
                          key={p.id}
                          style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}
                        >
                          <Text variant="bodySmall" color={colors.textSecondary}>{p.name}</Text>
                          <Text variant="bodySmall" color={colors.textPrimary} style={{ fontWeight: '700' }}>
                            {t.rivalry.you} {rec.wins} — {rec.losses} {p.name}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
                  <Button title={t.table.rematch} onPress={() => setRoundKey((k) => k + 1)} />
                  <Button title={t.table.leave} variant="secondary" onPress={() => navigation.goBack()} />
                </View>
              </View>
            </View>
          </Modal>

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
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}
