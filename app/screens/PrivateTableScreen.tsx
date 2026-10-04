import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { TableCard } from '../components/TableCard';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivateTable'>;

/** Private tables: join via 6-letter room code, or create one. Spec §4. */
export function PrivateTableScreen({ navigation, route }: Props) {
  const { t } = useStrings();
  const { colors, spacing, radii, typography } = useTheme();
  const [code, setCode] = useState(route.params.code ?? '');

  const join = () => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) return;
    navigation.navigate('Table', {
      tableId: `private-${clean}`,
      deck: 'classic52',
      template: 'shedding',
    });
  };

  return (
    <Screen>
      <Text variant="h1">{t.privateTable.title}</Text>
      <TableCard>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {t.privateTable.codeHint}
        </Text>
        <View style={{ height: spacing.sm }} />
        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z]/g, ''))}
          placeholder={t.privateTable.enterCode}
          placeholderTextColor={colors.textTertiary}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel={t.privateTable.enterCode}
          style={{
            ...typography.h2,
            color: colors.textPrimary,
            backgroundColor: colors.surfaceAlt,
            borderRadius: radii.md,
            padding: spacing.md,
            textAlign: 'center',
            letterSpacing: 4,
          }}
        />
        <View style={{ height: spacing.sm }} />
        <Button title={t.privateTable.join} onPress={join} disabled={code.trim().length < 4} />
      </TableCard>
      <Button
        title={t.privateTable.create}
        variant="ghost"
        onPress={() =>
          navigation.navigate('Table', {
            tableId: `private-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            deck: 'classic52',
            template: 'shedding',
          })
        }
      />
    </Screen>
  );
}
