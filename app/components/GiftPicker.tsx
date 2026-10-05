import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { GIFTS, type Gift } from '../economy';
import type { GiftError } from '../economy/useGiftSending';

interface GiftPickerProps {
  visible: boolean;
  coins: number;
  vip: boolean;
  error: GiftError;
  onSelect: (gift: Gift) => void;
  onClose: () => void;
  onGoToWallet: () => void;
}

/** Direct-sale gift picker: every gift shows its exact coin price (spec §8 — no loot boxes). */
export function GiftPicker({ visible, coins, vip, error, onSelect, onClose, onGoToWallet }: GiftPickerProps) {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, width: '84%', maxWidth: 360 }}>
          <Text variant="h3" color={colors.textPrimary} style={{ textAlign: 'center' }}>
            {t.economy.sendGift}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xs, marginBottom: spacing.md }}>
            <Text style={{ fontSize: 18 }}>🪙</Text>
            <Text variant="bodyBold" color={colors.textSecondary}>
              {coins}
            </Text>
          </View>

          {GIFTS.map((gift) => {
            const locked = gift.vipOnly && !vip;
            const giftName = t.gifts[gift.nameKey as keyof typeof t.gifts];
            return (
              <Pressable
                key={gift.id}
                onPress={() => onSelect(gift)}
                disabled={locked}
                accessibilityRole="button"
                accessibilityLabel={`${giftName} — ${gift.costCoins} coins${locked ? ` (${t.economy.vipOnly})` : ''}`}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radii.md,
                  backgroundColor: pressed && !locked ? colors.surfaceAlt : 'transparent',
                  opacity: locked ? 0.45 : 1,
                  ...(gift.vipOnly
                    ? { borderWidth: 1, borderColor: colors.gold, marginBottom: spacing.xs }
                    : null),
                })}
              >
                <Text style={{ fontSize: 36 }}>{gift.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyBold" color={colors.textPrimary}>
                    {giftName} {locked ? '🔒' : ''}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    {locked ? t.economy.vipOnly : `🪙 ${gift.costCoins}`}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {error === 'insufficient' && (
            <View style={{ marginTop: spacing.sm, alignItems: 'center', gap: spacing.xs }}>
              <Text variant="bodySmall" color={colors.warning} style={{ fontWeight: '700' }}>
                {t.economy.notEnough}
              </Text>
              <Button title={t.economy.getCoins} size="sm" onPress={onGoToWallet} />
            </View>
          )}
          {error === 'vipOnly' && (
            <Text variant="bodySmall" color={colors.warning} style={{ textAlign: 'center', marginTop: spacing.sm, fontWeight: '700' }}>
              {t.economy.vipOnly}
            </Text>
          )}

          <View style={{ marginTop: spacing.md }}>
            <Button title={t.common.close} variant="ghost" size="sm" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
