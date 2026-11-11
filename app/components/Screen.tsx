// components/Screen.tsx
// Every screen in the app should be wrapped in this so safe areas and
// background color are handled consistently — no repeating boilerplate.
import { router } from 'expo-router';
import React from 'react';
import { View, ScrollView, Text, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, typography } from '../theme/tokens';
import { TextAction } from './InterfaceChrome';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  back?: boolean;
  onBack?: () => void;
};

export function Screen({ children, scroll = false, style, back = false, onBack }: Props) {
  const { colors } = useTheme();

  const Container = scroll ? ScrollView : View;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'bottom']}
    >
      {(back || onBack) && (
        <TextAction
          icon="chevron-back"
          onPress={onBack ?? (() => router.back())}
          style={{ marginHorizontal: spacing.md, marginTop: spacing.sm, minHeight: 44 }}
        >
          <Text style={[typography.reading.sm, { color: colors.text }]}>Back</Text>
        </TextAction>
      )}
      <Container
        style={[{ flex: 1, padding: spacing.md }, style]}
        contentContainerStyle={scroll ? { paddingBottom: spacing.xl } : undefined}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}