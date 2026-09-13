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
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />

        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/choose-role" />
        <Stack.Screen name="auth/teacher-signup" />
        <Stack.Screen name="auth/learner-signup" />

        {/* teacher/ has its own _layout.tsx (the Tabs navigator) - hand the
            whole group off to it instead of listing each screen here.
            Listing them individually caused screens like classroom-created
            to render as top-level Stack screens outside the tab bar. */}
        <Stack.Screen name="teacher" />

        <Stack.Screen name="learner/dashboard" />
        <Stack.Screen name="learner/join-classroom" />
        <Stack.Screen name="learner/classroom-joined" />
      </Stack>
    </ThemeProvider>
  );
}