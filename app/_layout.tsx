import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
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

        <Stack.Screen name="teacher/dashboard" />
        <Stack.Screen name="teacher/create-classroom" />
        <Stack.Screen name="teacher/classroom-created" />

        <Stack.Screen name="learner/dashboard" />
        <Stack.Screen name="learner/join-classroom" />
        <Stack.Screen name="learner/classroom-joined" />
      </Stack>
    </ThemeProvider>
  );
}