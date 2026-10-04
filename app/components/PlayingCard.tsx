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

function FaceContent({ card, font }: { card: Card; font: number }) {
  const { colors } = useTheme();

  if (card.deck === 'uno108') {
    const isWild = card.action === 'wild' || card.action === 'wild4';
    const bg = isWild ? '#2E2E3E' : UNO_BG[card.color ?? 'red'];
    const label = card.action ? ACTION_LABEL[card.action] : card.rank;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="h2" style={{ color: '#FFFFFF', fontSize: font, fontWeight: '700' }}>
          {label}
        </Text>
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
    <FaceContent card={card} font={d.font} />
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
