import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';
import { audioManager } from '../audio/manager';

type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Themed button. `gold` is reserved for VIP/status surfaces — never use it
 * on free-tier CTAs (spec: gold is VIP-only). Android ripple + iOS opacity.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { colors, spacing, radii } = useTheme();

  const background =
    variant === 'primary'
      ? colors.accent
      : variant === 'gold'
        ? colors.gold
        : variant === 'secondary'
          ? colors.surfaceAlt
          : 'transparent';

  const textColor =
    variant === 'ghost'
      ? colors.textPrimary
      : variant === 'secondary'
        ? colors.textPrimary
        : colors.textInverse;

  const paddingV = size === 'sm' ? spacing.sm : size === 'lg' ? spacing.lg : spacing.md;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    audioManager.playSfx('tap');
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading }}
      android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
      style={({ pressed }) => [
        {
          backgroundColor: background,
          borderRadius: radii.lg,
          paddingVertical: paddingV,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.borderStrong,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text variant="bodyBold" color={textColor}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
