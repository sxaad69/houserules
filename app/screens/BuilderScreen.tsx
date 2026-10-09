// screens/BuilderScreen.tsx — Rulebook Builder wizard (Phase 2, spec §6).
// Guided wizard: template → deck → specials → win → settings → name → save.
// Templates + toggles only. Never a form wall, never scripting.

import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { TableCard } from '../components/TableCard';
import { PlayingCard } from '../components/PlayingCard';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import type { RootStackParamList } from '../navigation';
import type { DeckKind, RuleTemplate } from '../engine/types';
import {
  buildRulebook,
  cardBackById,
  customFeltById,
  saveRulebook,
  CARD_BACKS,
  CUSTOM_FELTS,
  DEFAULT_DRAFT,
  type CustomRulebook,
  type RulebookDraft,
} from '../builder';

type Props = NativeStackScreenProps<RootStackParamList, 'Builder'>;

const STEPS = 6;
const TIMER_OPTIONS = [0, 15, 30, 60];

function useDraft(from?: CustomRulebook) {
  const [draft, setDraft] = useState<RulebookDraft>(() =>
    from ? draftFromRulebook(from) : { ...DEFAULT_DRAFT },
  );
  const patch = (p: Partial<RulebookDraft>) =>
    setDraft((d) => ({ ...d, ...p }));
  const patchSpecials = (p: Partial<RulebookDraft['specials']>) =>
    setDraft((d) => ({ ...d, specials: { ...d.specials, ...p } }));
  return { draft, patch, patchSpecials };
}

/** Convert a saved rulebook back into an editable draft (creator nudge). */
function draftFromRulebook(rb: CustomRulebook): RulebookDraft {
  return {
    template: rb.template,
    deck: rb.deck,
    specials: { ...rb.specials },
    includeJokers: rb.includeJokers,
    winCondition: rb.winCondition,
    rounds: rb.rounds,
    playerCount: rb.maxPlayers,
    turnSeconds: rb.turnSeconds,
    cardBackId: rb.cardBackId,
    feltThemeId: rb.feltThemeId,
    // Blank name so the user gives the remix its own identity.
    name: '',
  };
}

export function BuilderScreen({ navigation, route }: Props) {
  const { t } = useStrings();
  const { colors, spacing, radii } = useTheme();
  const { draft, patch, patchSpecials } = useDraft(route.params?.from);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const stepNames = useMemo(
    () => [
      t.builder.stepTemplate,
      t.builder.stepDeck,
      t.builder.stepSpecials,
      t.builder.stepWin,
      t.builder.stepSettings,
      t.builder.stepName,
    ],
    [t],
  );

  const canNext = step < 5 || draft.name.trim().length >= 2;

  const onSave = async () => {
    if (draft.name.trim().length < 2 || saving) return;
    setSaving(true);
    try {
      await saveRulebook(buildRulebook(draft));
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const card = (selected: boolean): object => ({
    borderWidth: 2,
    borderColor: selected ? colors.accent : colors.border,
    backgroundColor: selected ? colors.surfaceAlt : colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    opacity: 1,
  });

  const renderTemplate = () => {
    const opts: { id: RuleTemplate; title: string; sub: string; icon: string }[] = [
      { id: 'shedding', title: t.builder.shedding, sub: t.builder.sheddingSub, icon: 'cards-outline' },
      { id: 'pointsRace', title: t.builder.pointsRace, sub: t.builder.pointsRaceSub, icon: 'trophy-outline' },
    ];
    return (
      <>
        <Text variant="h1">{t.builder.templateTitle}</Text>
        {opts.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => patch({ template: o.id, winCondition: o.id === 'pointsRace' ? 'lowestScore' : 'emptyHand' })}
            accessibilityRole="radio"
            accessibilityState={{ selected: draft.template === o.id }}
            style={card(draft.template === o.id)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <MaterialCommunityIcons
                name={o.icon as never}
                size={30}
                color={draft.template === o.id ? colors.accent : colors.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodyBold" color={colors.textPrimary}>{o.title}</Text>
                <Text variant="bodySmall" color={colors.textSecondary}>{o.sub}</Text>
              </View>
              {draft.template === o.id && (
                <MaterialCommunityIcons name="check-circle" size={24} color={colors.accent} />
              )}
            </View>
          </Pressable>
        ))}
      </>
    );
  };

  const renderDeck = () => {
    const decks: { id: DeckKind; name: string; sub: string; count: number }[] = [
      { id: 'uno108', name: t.decks.uno108, sub: t.decks.uno108Sub, count: 108 },
      { id: 'classic52', name: t.decks.classic52, sub: t.decks.classic52Sub, count: 52 },
      { id: 'baloot32', name: t.decks.baloot32, sub: t.decks.baloot32Sub, count: 32 },
      { id: 'animals12', name: t.decks.animals12, sub: t.decks.animals12Sub, count: 12 },
    ];
    return (
      <>
        <Text variant="h1">{t.builder.deckTitle}</Text>
        {decks.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => patch({ deck: d.id })}
            accessibilityRole="radio"
            accessibilityState={{ selected: draft.deck === d.id }}
            style={card(draft.deck === d.id)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyBold" color={colors.textPrimary}>{d.name}</Text>
                <Text variant="bodySmall" color={colors.textSecondary}>{d.sub}</Text>
              </View>
              <Text variant="caption" color={colors.textSecondary}>{d.count}</Text>
              {draft.deck === d.id && (
                <MaterialCommunityIcons name="check-circle" size={24} color={colors.accent} />
              )}
            </View>
          </Pressable>
        ))}
      </>
    );
  };

  const toggleRow = (
    label: string,
    value: boolean,
    onFlip: () => void,
  ) => (
    <View
      key={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text variant="body" color={colors.textPrimary}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onFlip}
        trackColor={{ false: colors.border, true: colors.accent }}
        accessibilityLabel={label}
      />
    </View>
  );

  const renderSpecials = () => (
    <>
      <Text variant="h1">{t.builder.specialsTitle}</Text>
      <Text variant="bodySmall" color={colors.textSecondary}>{t.builder.specialsSub}</Text>
      {draft.deck === 'uno108' && (
        <>
          {toggleRow(t.builder.skip, draft.specials.skip, () => patchSpecials({ skip: !draft.specials.skip }))}
          {toggleRow(t.builder.reverse, draft.specials.reverse, () => patchSpecials({ reverse: !draft.specials.reverse }))}
          {toggleRow(t.builder.drawTwo, draft.specials.drawTwo, () => patchSpecials({ drawTwo: !draft.specials.drawTwo }))}
          {toggleRow(t.builder.wild, draft.specials.wild, () => patchSpecials({ wild: !draft.specials.wild }))}
          {toggleRow(t.builder.wildDrawFour, draft.specials.wildDrawFour, () => patchSpecials({ wildDrawFour: !draft.specials.wildDrawFour }))}
        </>
      )}
      {draft.deck === 'classic52' &&
        toggleRow(t.builder.jokers, draft.includeJokers, () => patch({ includeJokers: !draft.includeJokers }))}
      {(draft.deck === 'baloot32' || draft.deck === 'animals12') && (
        <TableCard>
          <Text variant="bodySmall" color={colors.textSecondary} style={{ textAlign: 'center' }}>
            {t.builder.noSpecials}
          </Text>
        </TableCard>
      )}
    </>
  );

  const stepper = (
    value: number,
    min: number,
    max: number,
    onChange: (n: number) => void,
    label: string,
  ) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text variant="bodyBold" color={colors.textPrimary}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          accessibilityLabel="-"
          accessibilityRole="button"
          hitSlop={spacing.sm}
          style={{ opacity: value <= min ? 0.35 : 1, padding: spacing.xs }}
        >
          <MaterialCommunityIcons name="minus-circle-outline" size={30} color={colors.accent} />
        </Pressable>
        <Text variant="h2" color={colors.textPrimary} style={{ minWidth: 32, textAlign: 'center' }}>
          {value}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          accessibilityLabel="+"
          accessibilityRole="button"
          hitSlop={spacing.sm}
          style={{ opacity: value >= max ? 0.35 : 1, padding: spacing.xs }}
        >
          <MaterialCommunityIcons name="plus-circle-outline" size={30} color={colors.accent} />
        </Pressable>
      </View>
    </View>
  );

  const renderWin = () => (
    <>
      <Text variant="h1">{t.builder.winTitle}</Text>
      {draft.template === 'shedding' ? (
        <View style={card(true)}>
          <Text variant="bodyBold" color={colors.textPrimary}>{t.builder.firstToEmpty}</Text>
          <Text variant="bodySmall" color={colors.textSecondary}>{t.builder.firstToEmptySub}</Text>
        </View>
      ) : (
        <>
          <View style={card(true)}>
            <Text variant="bodyBold" color={colors.textPrimary}>{t.builder.lowestScore}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>{t.builder.lowestScoreSub}</Text>
          </View>
          {stepper(draft.rounds, 1, 10, (n) => patch({ rounds: n }), t.builder.rounds)}
        </>
      )}
    </>
  );

  const renderSettings = () => (
    <>
      <Text variant="h1">{t.builder.settingsTitle}</Text>
      {stepper(draft.playerCount, 2, 6, (n) => patch({ playerCount: n }), t.builder.players)}
      <Text variant="bodySmall" color={colors.textSecondary}>{t.builder.playersSub}</Text>

      <Text variant="bodyBold" color={colors.textPrimary}>{t.builder.turnTimer}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {TIMER_OPTIONS.map((s) => {
          const active = draft.turnSeconds === s;
          return (
            <Pressable
              key={s}
              onPress={() => patch({ turnSeconds: s })}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                borderRadius: radii.lg,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.surfaceAlt : colors.surface,
              }}
            >
              <Text variant="bodyBold" color={active ? colors.accent : colors.textSecondary}>
                {s === 0 ? t.builder.timerOff : `${s}s`}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" color={colors.textTertiary}>{t.builder.timerNote}</Text>

      <Text variant="bodyBold" color={colors.textPrimary}>{t.builder.cardBack}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }}>
        {CARD_BACKS.map((b) => {
          const active = draft.cardBackId === b.id;
          const design = cardBackById(b.id);
          return (
            <Pressable
              key={b.id}
              onPress={() => patch({ cardBackId: b.id })}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t.builder.backs[b.nameKey as keyof typeof t.builder.backs]}
              style={{ alignItems: 'center', gap: spacing.xs }}
            >
              <View
                style={{
                  borderWidth: 2,
                  borderColor: active ? colors.accent : 'transparent',
                  borderRadius: 10,
                  padding: 2,
                }}
              >
                <PlayingCard
                  card={{ id: 'preview', deck: draft.deck, color: null, suit: null, rank: '', action: null, animal: null }}
                  size="sm"
                  faceDown
                  backId={design.id}
                />
              </View>
              <Text variant="caption" color={active ? colors.accent : colors.textSecondary}>
                {t.builder.backs[b.nameKey as keyof typeof t.builder.backs]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="bodyBold" color={colors.textPrimary}>{t.builder.feltTheme}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }}>
        {CUSTOM_FELTS.map((f) => {
          const active = draft.feltThemeId === f.id;
          const felt = customFeltById(f.id);
          return (
            <Pressable
              key={f.id}
              onPress={() => patch({ feltThemeId: f.id })}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t.builder.felts[f.nameKey as keyof typeof t.builder.felts]}
              style={{ alignItems: 'center', gap: spacing.xs }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: felt.overlay,
                  borderWidth: 2,
                  borderColor: active ? colors.accent : colors.border,
                }}
              />
              <Text variant="caption" color={active ? colors.accent : colors.textSecondary}>
                {t.builder.felts[f.nameKey as keyof typeof t.builder.felts]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  const summaryLine = (label: string, value: string) => (
    <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
      <Text variant="bodySmall" color={colors.textSecondary}>{label}</Text>
      <Text variant="bodySmall" color={colors.textPrimary} style={{ fontWeight: '700' }}>{value}</Text>
    </View>
  );

  const renderName = () => {
    const deckName =
      draft.deck === 'uno108' ? t.decks.uno108
      : draft.deck === 'classic52' ? t.decks.classic52
      : draft.deck === 'baloot32' ? t.decks.baloot32
      : t.decks.animals12;
    return (
      <>
        <Text variant="h1">{t.builder.nameTitle}</Text>
        <TextInput
          value={draft.name}
          onChangeText={(v) => patch({ name: v.slice(0, 40) })}
          placeholder={t.builder.namePlaceholder}
          placeholderTextColor={colors.textTertiary}
          maxLength={40}
          autoFocus
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
            color: colors.textPrimary,
            fontSize: 17,
          }}
          accessibilityLabel={t.builder.nameTitle}
        />
        <Text variant="caption" color={colors.textTertiary}>{t.builder.nameHint}</Text>
        <TableCard>
          {summaryLine(t.builder.stepTemplate, draft.template === 'shedding' ? t.builder.shedding : t.builder.pointsRace)}
          {summaryLine(t.builder.stepDeck, deckName)}
          {summaryLine(
            t.builder.stepWin,
            draft.template === 'shedding'
              ? t.builder.firstToEmpty
              : `${t.builder.lowestScore} · ${draft.rounds}`,
          )}
          {summaryLine(t.builder.players, String(draft.playerCount))}
          {summaryLine(
            t.builder.cardBack,
            t.builder.backs[cardBackById(draft.cardBackId).nameKey as keyof typeof t.builder.backs],
          )}
          {summaryLine(
            t.builder.feltTheme,
            t.builder.felts[customFeltById(draft.feltThemeId).nameKey as keyof typeof t.builder.felts],
          )}
        </TableCard>
        {draft.name.trim().length < 2 && (
          <Text variant="caption" color={colors.danger}>{t.builder.nameEmpty}</Text>
        )}
      </>
    );
  };

  const bodies = [renderTemplate, renderDeck, renderSpecials, renderWin, renderSettings, renderName];

  return (
    <Screen>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t.common.close}
          hitSlop={spacing.md}
          style={{ padding: spacing.xs }}
        >
          <MaterialCommunityIcons name="close" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text variant="h2" color={colors.textPrimary}>{t.builder.title}</Text>
      </View>

      {/* Progress */}
      <View>
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.surfaceAlt,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${((step + 1) / STEPS) * 100}%`,
              backgroundColor: colors.accent,
              borderRadius: 3,
            }}
          />
        </View>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
          {t.builder.stepOf.replace('{n}', String(step + 1))} · {stepNames[step]}
        </Text>
      </View>

      {/* Step body */}
      <ScrollView
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {bodies[step]()}
      </ScrollView>

      {/* Footer */}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          {step > 0 && (
            <Button title={t.builder.back} variant="secondary" onPress={() => setStep((s) => s - 1)} />
          )}
        </View>
        <View style={{ flex: 2 }}>
          {step < 5 ? (
            <Button title={t.builder.next} onPress={() => setStep((s) => s + 1)} />
          ) : (
            <Button
              title={t.builder.save}
              onPress={onSave}
              disabled={!canNext || saving}
              loading={saving}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}
