// components/TextField.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, typography } from '../theme/tokens';

type Props = TextInputProps & {
  label: string;
  isPassword?: boolean;
};

export function TextField({ label, isPassword = false, ...inputProps }: Props) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(isPassword);

  return (
    <View style={{ marginBottom: spacing.sm + 4 }}>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 12,
          marginBottom: spacing.sm,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
        }}
      >
        <TextInput
          style={{
            flex: 1,
            paddingVertical: spacing.sm + 4,
            color: colors.text,
            fontSize: typography.reading.sm.fontSize,
          }}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          autoCapitalize="none"
          {...inputProps}
        />
        {isPassword && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={12}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}