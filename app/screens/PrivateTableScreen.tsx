import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { TableCard } from '../components/TableCard';
import { useStrings } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { generateRoomCode } from '../realtime/protocol';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivateTable'>;

/** Private tables: create (become host) or join via 6-letter room code. */
export function PrivateTableScreen({ navigation }: Props) {
  const { t } = useStrings();
  const { colors, spacing, typography } = useTheme();
  const [code, setCode] = useState('');

  const create = () => {
    navigation.navigate('Room', {
      code: generateRoomCode(),
      role: 'host',
      deck: 'classic52',
      template: 'shedding',
    });
  };

  const join = () => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) return;
    navigation.navigate('Room', {
      code: clean,
      role: 'guest',
      deck: 'classic52',
      template: 'shedding',
    });
  };

  return (
    <Screen>
      <Text variant="h1">{t.privateTable.title}</Text>

      <TableCard>
        <Text variant="h2" style={{ marginBottom: spacing.xs }}>
          {t.room.hostTitle}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
          {t.room.codeHint}
        </Text>
        <Button title={t.privateTable.create} onPress={create} />
      </TableCard>

      <TableCard>
        <Text variant="h2" style={{ marginBottom: spacing.xs }}>
          {t.room.guestTitle}
        </Text>
        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
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
            borderRadius: 12,
            padding: spacing.md,
            letterSpacing: 4,
            textAlign: 'center',
            marginBottom: spacing.sm,
          }}
        />
        <Button title={t.privateTable.join} onPress={join} variant="secondary" disabled={code.trim().length < 4} />
      </TableCard>
    </Screen>
  );
}
