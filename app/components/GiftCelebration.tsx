import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Text } from './Text';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { useSession } from '../store/session';
import type { Gift } from '../economy';

/**
 * Emoji bounce overlay for sent gifts — works on web + native
 * (lottie-react-native does not work reliably on web export).
 * VIP gifts (falcon) get the gold-ringed variant.
 * VIP SENDERS get the premium treatment (spec §8 "fancier gift animations"):
 * gold particle burst, crown accent, pulsing gold halo, gold backdrop glow.
 * Non-VIP celebrations render exactly as before — the VIP layers are purely additive.
 */
const VIP_PARTICLES = ['✨', '⭐', '🌟', '💫', '🎉', '✨', '⭐', '🌟', '💫', '🎉'];

function CenterLayer({ children }: { children: React.ReactNode }) {
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
      {children}
    </View>
  );
}

export function GiftCelebration({ gift }: { gift: Gift }) {
  const { t } = useStrings();
  const { colors, spacing } = useTheme();
  const { vip: isVipSender } = useSession();
  const scale = useRef(new Animated.Value(0)).current;
  const burst = useRef(VIP_PARTICLES.map(() => new Animated.Value(0))).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [scale]);

  // VIP-only: one-shot gold particle burst + looping halo pulse.
  useEffect(() => {
    if (!isVipSender) return;
    Animated.parallel(
      burst.map((v, i) =>
        Animated.timing(v, { toValue: 1, duration: 1100, delay: i * 70, useNativeDriver: true }),
      ),
    ).start();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isVipSender, burst, glow]);

  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.45] });

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
      {isVipSender && (
        <CenterLayer>
          <View
            style={{
              width: 340,
              height: 340,
              borderRadius: 170,
              backgroundColor: colors.gold,
              opacity: 0.12,
            }}
          />
        </CenterLayer>
      )}
      {isVipSender && (
        <CenterLayer>
          <Animated.View
            style={{
              width: 184,
              height: 184,
              borderRadius: 92,
              borderWidth: 3,
              borderColor: colors.gold,
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            }}
          />
        </CenterLayer>
      )}
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
          ...(isVipSender ? { borderWidth: 5, borderColor: colors.gold } : null),
        }}
      >
        {isVipSender && (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, top: -20, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 34 }}>👑</Text>
          </View>
        )}
        <Text style={{ fontSize: 76 }}>{gift.emoji}</Text>
      </Animated.View>
      {isVipSender && (
        <CenterLayer>
          {burst.map((v, i) => {
            const angle = (i / VIP_PARTICLES.length) * Math.PI * 2 - Math.PI / 2;
            const dist = 105 + (i % 3) * 26;
            return (
              <Animated.Text
                key={i}
                style={{
                  position: 'absolute',
                  fontSize: 26,
                  opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }),
                  transform: [
                    {
                      translateX: v.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.cos(angle) * dist],
                      }),
                    },
                    {
                      translateY: v.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.sin(angle) * dist],
                      }),
                    },
                    { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.1] }) },
                  ],
                }}
              >
                {VIP_PARTICLES[i]}
              </Animated.Text>
            );
          })}
        </CenterLayer>
      )}
      <Text variant="bodyBold" style={{ color: '#FFFFFF', marginTop: spacing.sm }}>
        {t.economy.giftSent}
      </Text>
    </View>
  );
}
