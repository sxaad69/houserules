import React from 'react';
import {
  Image,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import type { Card } from '../engine/cards';

export type CardSize = 'sm' | 'md' | 'lg';

const DIMS: Record<CardSize, { w: number; h: number; font: number; radius: number }> = {
  sm: { w: 34, h: 50, font: 13, radius: 6 },
  md: { w: 62, h: 90, font: 22, radius: 8 },
  lg: { w: 70, h: 100, font: 26, radius: 9 },
};

/** Uno color families — strong, readable, convention. */
const UNO_BG: Record<string, string> = {
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

const ACTION_LABEL: Record<string, string> = {
  skip: '⊘',
  reverse: '⇄',
  draw2: '+2',
  wild: 'WILD',
  wild4: '+4',
};

const CARD_BACK = require('../assets/card-back.png');

interface PlayingCardProps {
  card: Card;
  size?: CardSize;
  /** Show the card back instead of the face. */
  faceDown?: boolean;
  /** Legal play on the human's turn — raised + amber edge. */
  highlighted?: boolean;
  /** Not playable right now. */
  dimmed?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

function FaceContent({ card, d }: { card: Card; d: { w: number; h: number; font: number; radius: number } }) {
  const { colors } = useTheme();
  const font = d.font;

  if (card.deck === 'uno108') {
    const isWild = card.action === 'wild' || card.action === 'wild4';
    const bg = isWild ? '#2E2E3E' : UNO_BG[card.color ?? 'red'];
    const label = card.action ? ACTION_LABEL[card.action] : card.rank;
    // Center medallion: white oval, tilted; glyph counter-rotated upright.
    // Wilds show the 4-color quadrant grid instead of a glyph.
    const medallionW = d.w * 0.66;
    const medallionH = d.h * 0.44;
    return (
      <View style={{ flex: 1, backgroundColor: bg, borderRadius: 8 }}>
        {/* crisp inner keyline */}
        <View
          style={{
            position: 'absolute',
            left: 3,
            right: 3,
            top: 3,
            bottom: 3,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.4)',
          }}
        />
        {/* corner indices */}
        <Text
          variant="bodySmall"
          style={{
            position: 'absolute',
            top: 5,
            left: 7,
            color: '#FFFFFF',
            fontSize: font * 0.48,
            fontWeight: '800',
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 1,
          }}
        >
          {label}
        </Text>
        <Text
          variant="bodySmall"
          style={{
            position: 'absolute',
            bottom: 5,
            right: 7,
            color: '#FFFFFF',
            fontSize: font * 0.48,
            fontWeight: '800',
            transform: [{ rotate: '180deg' }],
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 1,
          }}
        >
          {label}
        </Text>
        {/* center medallion */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: medallionW,
              height: medallionH,
              borderRadius: medallionH / 2,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: '-16deg' }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            {isWild ? (
              <View
                style={{
                  width: medallionW * 0.52,
                  height: medallionH * 0.52,
                  transform: [{ rotate: '16deg' }],
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  overflow: 'hidden',
                  borderRadius: 3,
                }}
              >
                {['#D64545', '#D9A62E', '#3FA34D', '#3D7BE8'].map((c) => (
                  <View key={c} style={{ width: '50%', height: '50%', backgroundColor: c }} />
                ))}
              </View>
            ) : (
              <Text
                variant="h2"
                style={{
                  color: bg,
                  fontSize: font * 0.95,
                  fontWeight: '800',
                  transform: [{ rotate: '16deg' }],
                }}
              >
                {label}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (card.deck === 'animals12') {
    const tint = UNO_BG[card.color ?? 'green'];
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.cardFace,
          borderRadius: 8,
          borderTopWidth: 6,
          borderTopColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 2,
        }}
      >
        <Text
          variant="bodySmall"
          style={{ color: colors.textPrimary, fontSize: font * 0.42, fontWeight: '700', textAlign: 'center' }}
        >
          {(card.animal ?? card.rank).toUpperCase()}
        </Text>
      </View>
    );
  }

  // classic52 + baloot32: universal convention — white face, suit glyph.
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  const fg = red ? colors.danger : colors.textPrimary;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cardFace,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="h2" style={{ color: fg, fontSize: font, fontWeight: '700' }}>
        {card.rank}
      </Text>
      <Text variant="h2" style={{ color: fg, fontSize: font * 0.9 }}>
        {SUIT_GLYPH[card.suit ?? 'spades']}
      </Text>
    </View>
  );
}

/**
 * One playing card. Faces follow universal conventions (readability);
 * backs are our signature art. Theme tokens only — no hardcoded chrome.
 */
export function PlayingCard({
  card,
  size = 'md',
  faceDown = false,
  highlighted = false,
  dimmed = false,
  onPress,
  style,
  accessibilityLabel,
}: PlayingCardProps) {
  const { colors, spacing } = useTheme();
  const d = DIMS[size];

  const frame: ViewStyle = {
    width: d.w,
    height: d.h,
    borderRadius: d.radius,
    overflow: 'hidden',
    opacity: dimmed ? 0.4 : 1,
    transform: highlighted ? [{ translateY: -8 }] : [],
    borderWidth: highlighted ? 2 : 1,
    // ponytail: gold is VIP-only — legal-play highlight uses amber, always.
    borderColor: highlighted ? colors.accent : 'rgba(0,0,0,0.25)',
  };

  const inner = faceDown ? (
    <Image source={CARD_BACK} style={{ flex: 1, width: '100%', height: '100%' }} resizeMode="cover" />
  ) : (
    <FaceContent card={card} d={d} />
  );

  if (!onPress) return <View style={[frame, style]}>{inner}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={spacing.sm}
      style={({ pressed }) => [frame, style, pressed && { opacity: dimmed ? 0.4 : 0.75 }]}
    >
      {inner}
    </Pressable>
  );
}
