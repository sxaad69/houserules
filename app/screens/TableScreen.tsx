import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { TableCard } from '../components/TableCard';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { DECK_CARD_COUNTS } from '../engine/types';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Table'>;

/**
 * The game table. v1 build wires the engine, bots and realtime here;
 * the scaffold proves routing + params flow.
 */
export function TableScreen({ route }: Props) {
  const { t } = useStrings();
  const { colors, spacing } = useTheme();
  const { tableId, deck, template, isVip } = route.params;

  return (
    <Screen>
      <TableCard vip={isVip} style={{ backgroundColor: colors.felt }}>
        <Text variant="h1" color={colors.cardFace}>
          {t.table.title}
        </Text>
        <Text variant="bodySmall" color={colors.cardFace}>
          {t.table.waiting}
        </Text>
      </TableCard>
      <Text variant="caption" color={colors.textTertiary}>
        {`table=${tableId} · deck=${deck} (${DECK_CARD_COUNTS[deck]}) · rules=${template}`}
      </Text>
      <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: spacing.sm }}>
        {t.common.comingSoon}
      </Text>
    </Screen>
  );
}
