import { NotificationSync } from "../components/NotificationSync";
import { ConfirmationProvider } from "../components/ConfirmationDialog";
import { ReadingPreferencesProvider } from "../components/ReadingPreferences";
import { SessionProvider, useSession } from "../components/auth/SessionProvider";
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
    <ThemeProvider><SessionProvider><ReadingPreferencesProvider><ConfirmationProvider>
      <AppStack />
      <NotificationSync />
    </ConfirmationProvider></ReadingPreferencesProvider></SessionProvider></ThemeProvider>
  );
}

function AppStack() {
  const { ready, user } = useSession();
  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!user}>
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/choose-role" />
        <Stack.Screen name="auth/teacher-signup" />
        <Stack.Screen name="auth/learner-signup" />
        <Stack.Screen name="auth/complete-google-profile" />
      </Stack.Protected>
      <Stack.Protected guard={user?.role === "teacher"}>
        <Stack.Screen name="teacher" />
      </Stack.Protected>
      <Stack.Protected guard={user?.role === "learner"}>
        <Stack.Screen name="learner" />
      </Stack.Protected>
    </Stack>
  );
}
