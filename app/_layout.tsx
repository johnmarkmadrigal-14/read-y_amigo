import { ReadingPreferencesProvider } from "../components/ReadingPreferences";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useAppFonts } from "./theme/fonts";
import { ThemeProvider } from "./theme/ThemeProvider";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // splash screen stays visible until fonts are ready
  }

  return (
    <ThemeProvider><ReadingPreferencesProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />

        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/choose-role" />
        <Stack.Screen name="auth/teacher-signup" />
        <Stack.Screen name="auth/learner-signup" />

        <Stack.Screen name="teacher" />

        <Stack.Screen name="learner" />
      </Stack>
    </ReadingPreferencesProvider></ThemeProvider>
  );
}