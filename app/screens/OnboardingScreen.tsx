import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { DECK_GUIDES, type DeckGuide } from '../guides/decks';
import type { DeckKind } from '../engine/types';

// Onboarding — 3 swipeable intro cards shown once on first launch.
// Emerald/amber brand, dots pager, Skip, and a "How to play" guide sheet.

export const ONBOARDED_KEY = '@houserules:onboarded/v1';

const CARDS = [
  { emoji: '🏠', titleKey: 'card1Title', bodyKey: 'card1Body' },
  { emoji: '🃏', titleKey: 'card2Title', bodyKey: 'card2Body' },
  { emoji: '⚡', titleKey: 'card3Title', bodyKey: 'card3Body' },
] as const;

const GUIDE_DECKS: DeckKind[] = ['uno108', 'classic52', 'baloot32', 'animals12'];

function GuideSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const [deck, setDeck] = useState<DeckKind>('uno108');
  const guide: DeckGuide = DECK_GUIDES[deck];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            maxHeight: '85%',
            padding: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text variant="h2">{t.onboarding.howToPlay}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t.common.close} hitSlop={12}>
              <Text variant="h2" color={colors.textTertiary}>✕</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md }}>
            {GUIDE_DECKS.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDeck(d)}
                accessibilityRole="button"
                style={{
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radii.md,
                  backgroundColor: deck === d ? colors.accent : colors.surfaceAlt,
                }}
              >
                <Text
                  variant="bodySmall"
                  color={deck === d ? colors.textInverse : colors.textPrimary}
                  style={{ fontWeight: deck === d ? '700' : '400' }}
                >
                  {t.decks[d]}
                </Text>
              </Pressable>
            ))}
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="h3" color={colors.accent}>{guide.tagline}</Text>
            <View style={{ height: spacing.sm }} />
            {guide.sections.map((s) => (
              <View key={s.title} style={{ marginBottom: spacing.md }}>
                <Text variant="body" style={{ fontWeight: '700' }}>{s.title}</Text>
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {s.body}
                </Text>
              </View>
            ))}
            <Text variant="body" style={{ fontWeight: '700', marginBottom: spacing.xs }}>
              {t.onboarding.tips}
            </Text>
            {guide.tips.map((tip) => (
              <Text key={tip} variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: 4 }}>
                • {tip}
              </Text>
            ))}
            <View style={{ height: spacing.lg }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { t } = useStrings();
  const { colors, spacing } = useTheme();
  const [page, setPage] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);

  const finish = () => {
    AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
    onDone();
  };

  const card = CARDS[page];
  const last = page === CARDS.length - 1;
  const ot = t.onboarding as Record<string, string>;

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, padding: spacing.lg }}>
        {/* Skip */}
        <View style={{ alignItems: 'flex-end' }}>
          <Pressable onPress={finish} accessibilityRole="button" hitSlop={12}>
            <Text variant="body" color={colors.textTertiary} style={{ fontWeight: '600' }}>
              {t.onboarding.skip}
            </Text>
          </Pressable>
        </View>

        {/* Card */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: colors.accentMuted,
              borderWidth: 2,
              borderColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.xl,
            }}
          >
            <Text style={{ fontSize: 56 }}>{card.emoji}</Text>
          </View>
          <Text variant="display" style={{ textAlign: 'center', marginBottom: spacing.sm }}>
            {ot[card.titleKey]}
          </Text>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', maxWidth: 300 }}>
            {ot[card.bodyKey]}
          </Text>

          {/* Dots */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
            {CARDS.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => setPage(i)}
                accessibilityRole="button"
                accessibilityLabel={`${i + 1} / ${CARDS.length}`}
                hitSlop={8}
                style={{
                  width: i === page ? 28 : 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: i === page ? colors.accent : colors.border,
                }}
              />
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={{ gap: spacing.sm }}>
          <Button
            title={last ? t.onboarding.start : t.onboarding.next}
            onPress={() => (last ? finish() : setPage(page + 1))}
          />
          {!last && (
            <Button title={t.onboarding.back} variant="ghost" onPress={() => setPage(Math.max(0, page - 1))} />
          )}
          <Pressable onPress={() => setGuideOpen(true)} accessibilityRole="button" style={{ alignItems: 'center', padding: spacing.sm }}>
            <Text variant="body" color={colors.accent} style={{ fontWeight: '700', textDecorationLine: 'underline' }}>
              📖 {t.onboarding.howToPlay}
            </Text>
          </Pressable>
        </View>
      </View>

      <GuideSheet visible={guideOpen} onClose={() => setGuideOpen(false)} />
    </Screen>
  );
}
