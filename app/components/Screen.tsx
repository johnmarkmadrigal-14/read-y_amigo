// components/Screen.tsx
// Every screen in the app should be wrapped in this so safe areas and
// background color are handled consistently — no repeating boilerplate.
import React from 'react';
import { View, ScrollView, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, scroll = false, style }: Props) {
  const { colors } = useTheme();

  const Container = scroll ? ScrollView : View;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'bottom']}
    >
      <Container
        style={[{ flex: 1, padding: spacing.md }, style]}
        contentContainerStyle={scroll ? { paddingBottom: spacing.xl } : undefined}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}