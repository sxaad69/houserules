import React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface TableCardProps {
  children: React.ReactNode;
  vip?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Felt table card — the primary container. `vip` switches to the midnight
 * lounge surface with a gold edge. Platform-correct elevation.
 */
export function TableCard({ children, vip = false, style }: TableCardProps) {
  const { colors, spacing, radii } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: vip ? colors.vip : colors.surface,
          borderRadius: radii.xl,
          padding: spacing.lg,
          borderWidth: vip ? 1 : 0,
          borderColor: vip ? colors.gold : 'transparent',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
            },
            android: { elevation: 4 },
            default: {},
          }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
