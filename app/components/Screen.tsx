import React from 'react';
import { SafeAreaView, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Top-level screen wrapper: safe area + theme background. Not scrollable
 *  by default — game screens manage their own layout. */
export function Screen({ children, scroll = true, style }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      {content}
    </SafeAreaView>
  );
}
