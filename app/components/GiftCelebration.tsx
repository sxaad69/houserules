import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Text } from './Text';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import type { Gift } from '../economy';

/**
 * Emoji bounce overlay for sent gifts — works on web + native
 * (lottie-react-native does not work reliably on web export).
 * VIP gifts (falcon) get the gold-ringed variant.
 */
export function GiftCelebration({ gift }: { gift: Gift }) {
  const { t } = useStrings();
  const { colors, spacing } = useTheme();
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [scale]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          width: 148,
          height: 148,
          borderRadius: 74,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.45)',
          ...(gift.vipOnly ? { borderWidth: 3, borderColor: colors.gold } : null),
        }}
      >
        <Text style={{ fontSize: 76 }}>{gift.emoji}</Text>
      </Animated.View>
      <Text variant="bodyBold" style={{ color: '#FFFFFF', marginTop: spacing.sm }}>
        {t.economy.giftSent}
      </Text>
    </View>
  );
}
