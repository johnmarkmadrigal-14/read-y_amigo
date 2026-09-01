// theme/ThemeProvider.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, Theme } from './tokens';

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme(); // 'light' | 'dark' | null

  const theme = useMemo(
    () => (scheme === 'dark' ? darkTheme : lightTheme),
    [scheme]
  );

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

// Usage in any component: const { colors } = useTheme();
export function useTheme() {
  return useContext(ThemeContext);
}