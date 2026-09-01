// theme/fonts.ts
// Loads the app fonts via Expo's Google Fonts packages.
// Install first:
//   npx expo install @expo-google-fonts/baloo-2 @expo-google-fonts/fredoka @expo-google-fonts/atkinson-hyperlegible expo-font expo-splash-screen

import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_400Regular_Italic,
  AtkinsonHyperlegible_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible';
import {
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  useFonts,
} from '@expo-google-fonts/baloo-2';
import {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';

// Call this once in your root layout (app/_layout.tsx).
// Returns `true` once fonts are ready — hold your splash screen until then.
export function useAppFonts() {
  const [fontsLoaded] = useFonts({
    Baloo2_500Medium,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_400Regular_Italic,
    AtkinsonHyperlegible_700Bold,
  });

  return fontsLoaded;
}