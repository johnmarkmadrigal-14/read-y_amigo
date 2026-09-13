import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { ApiUser, googleAuth } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";

// Required once per app so the auth popup closes properly on Android/iOS.
WebBrowser.maybeCompleteAuthSession();

// Paste your Web Client ID from Google Cloud Console here.
// (iOS/Android-specific client IDs aren't needed yet — those only matter
// once you create a standalone EAS build. A single `clientId` here is used
// for every platform, including Expo Go.)
const GOOGLE_CLIENT_IDS = {
  clientId: "389325768571-lmou7c6pp8n9gsmqj4hj6snai2fo533d.apps.googleusercontent.com",
};

type Props = {
  // Role to use ONLY if this Google account doesn't have one of your
  // accounts yet. Ignored for existing users, who keep their original role.
  roleForNewAccount: "teacher" | "learner";
  // Called when an existing account signed in successfully.
  onSuccess: (user: ApiUser) => void;
  // Called when this is a brand-new Google user — no account exists yet.
  // Navigate to the complete-profile screen with these two values.
  onNeedsProfile: (pendingToken: string, suggestedDisplayName: string) => void;
  onError: (message: string) => void;
};

export function GoogleSignInButton({
  roleForNewAccount,
  onSuccess,
  onNeedsProfile,
  onError,
}: Props) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest(GOOGLE_CLIENT_IDS);

  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type !== "success") return;

      const idToken = response.authentication?.idToken ?? response.params?.id_token;
      if (!idToken) {
        onError("Google didn't return an ID token. Please try again.");
        return;
      }

      setLoading(true);
      try {
        const result = await googleAuth(idToken, roleForNewAccount);
        if ("needsProfile" in result) {
          onNeedsProfile(result.pendingToken, result.suggestedDisplayName);
        } else {
          onSuccess(result.user);
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : "Google sign-in failed.");
      } finally {
        setLoading(false);
      }
    };

    handleResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  // Temporarily disabled: expo-auth-session's Google flow doesn't work
  // reliably in Expo Go anymore (the auth.expo.io proxy is deprecated).
  // Remove this early return once Google Sign-In is set up with a custom
  // dev build and a native library (e.g. @react-native-google-signin/google-signin).
  return null;

}

const styles = StyleSheet.create({
  button: {
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});