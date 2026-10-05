import React from 'react';
import { View } from 'react-native';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { useSession } from '../store/session';
import { Text } from './Text';

/**
 * Free-tier ad slot. Renders ONLY for non-VIP users (VIP = no ads, spec §8).
 *
 * v1 is a clearly-labeled placeholder — no AdMob SDK is bundled (that needs
 * a real AdMob account + app ID). The seam: replace the inner placeholder
 * <View> with the real banner, e.g.
 *
 *   import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
 *   <BannerAd unitId={TestIds.BANNER} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
 *
 * keeping the `if (vip) return null` gate above it.
 */
export function AdBanner() {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const { vip } = useSession();

  if (vip) return null;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={t.ads.placeholder}
      style={{
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.borderStrong,
        borderRadius: radii.lg,
        backgroundColor: colors.surfaceAlt,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        gap: spacing.xs,
      }}
    >
      <View
        style={{
          backgroundColor: colors.textTertiary,
          borderRadius: radii.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
        }}
      >
        <Text variant="caption" color={colors.surface}>
          {t.ads.sponsored}
        </Text>
      </View>
      <Text variant="bodySmall" color={colors.textSecondary}>
        {t.ads.placeholder}
      </Text>
    </View>
  );
}
