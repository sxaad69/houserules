import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography, type TypographyVariant } from '../theme/typography';

interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: string;
  children: React.ReactNode;
}

/** Themed text. `variant` picks the type scale; `color` overrides. */
export function Text({ variant = 'body', color, style, children, ...rest }: TextProps) {
  const { colors } = useTheme();
  const base: TextStyle = {
    ...typography[variant],
    color: color ?? colors.textPrimary,
  };
  return (
    <RNText style={[base, style]} {...rest}>
      {children}
    </RNText>
  );
}
