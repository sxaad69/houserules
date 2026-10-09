import React, { useEffect, useRef } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { PlayingCard } from './PlayingCard';
import { useTheme } from '../theme/ThemeProvider';
import type { Card } from '../engine/cards';

interface SeatViewProps {
  name: string;
  /** Emoji avatar shown on the seat instead of an initial. */
  avatar?: string;
  /** Cards in hand — rendered as a mini face-down fan. */
  handCount: number;
  /** It's this seat's turn: amber ring + pulse. Never gold (VIP-only). */
  active: boolean;
  /** Bot reaction text (emote or phrase) — shown as a speech bubble. */
  bubble?: string | null;
  style?: StyleProp<ViewStyle>;
}

const AVATAR = 46;
const MINI_VISIBLE = 4;

/**
 * One opponent seat: avatar, name, face-down fan, live count.
 * Spatial (top/left/right) — no RTL flipping needed for seat positions.
 */
export function SeatView({ name, avatar, handCount, active, bubble, style }: SeatViewProps) {
  const { colors, spacing, radii } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const shown = Math.min(handCount, MINI_VISIBLE);

  return (
    <View style={[{ alignItems: 'center' }, style]} accessibilityLabel={`${name}, ${handCount} cards`}>
      {bubble ? (
        <View
          style={{
            marginBottom: spacing.xs,
            backgroundColor: colors.cardFace,
            borderRadius: radii.lg,
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
            maxWidth: 170,
          }}
        >
          <Text variant="caption" color={colors.textPrimary} style={{ textAlign: 'center', fontWeight: '600' }} numberOfLines={2}>
            {bubble}
          </Text>
        </View>
      ) : null}
      <View>
        {active && (
          <Animated.View
            style={{
              position: 'absolute',
              top: -5,
              left: -5,
              width: AVATAR + 10,
              height: AVATAR + 10,
              borderRadius: (AVATAR + 10) / 2,
              borderWidth: 3,
              borderColor: colors.accent,
              opacity: ringOpacity,
            }}
          />
        )}
        <View
          style={{
            width: AVATAR,
            height: AVATAR,
            borderRadius: AVATAR / 2,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 2,
            borderColor: active ? colors.accent : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 26 }} accessibilityLabel={`${name} avatar`}>
            {avatar ?? name.charAt(0).toUpperCase()}
          </Text>
        </View>
        {handCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              minWidth: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 5,
            }}
          >
            <Text variant="caption" style={{ color: colors.textInverse, fontWeight: '700' }}>
              {handCount}
            </Text>
          </View>
        )}
      </View>
      <View
        style={{
          marginTop: spacing.xs,
          backgroundColor: 'rgba(0,0,0,0.45)',
          borderRadius: radii.full,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
        }}
      >
        <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '600' }}>
          {name}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.xs, height: 52 }}>
        {Array.from({ length: shown }).map((_, i) => (
          <View key={i} style={{ marginLeft: i === 0 ? 0 : -22 }}>
            {/* ponytail: faceDown needs a Card — the back art is identical for
                every card, so a throwaway stub is the ceiling, not a fetch. */}
            <PlayingCard
              card={{ id: `stub-${i}`, deck: 'uno108', color: null, suit: null, rank: '', action: null, animal: null }}
              size="sm"
              faceDown
            />
          </View>
        ))}
      </View>
    </View>
  );
}
