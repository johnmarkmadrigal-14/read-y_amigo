
import { router } from "expo-router";
import { useState } from "react";
import { Image, Platform, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { login } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, typography } from "../theme/tokens";

export default function LoginScreen() {
  const { colors } = useTheme();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier || !password) {
      setError("Enter your email/username and password.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await login(trimmedIdentifier, password);

      if (!result?.user) {
        throw new Error("Invalid login response from the server.");
      }

      if (result.user.role === "teacher") {
        router.replace("/teacher/dashboard");
      } else if (result.user.role === "learner") {
        router.replace("/learner/dashboard");
      } else {
        throw new Error("Your account has an unrecognized role.");
      }
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Couldn't log in. Check your details and try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View
        style={{
          alignItems: "center",
          marginTop: spacing.xl,
          marginBottom: spacing.xl,
        }}
      >
        <Image
          source={require("../../assets/images/logo.png")}
          style={{
            width: 100,
            height: 100,
            marginBottom: spacing.xs,
          }}
          resizeMode="contain"
        />

        <Text style={{ ...typography.display.lg, color: colors.text }}>
          Welcome back!
        </Text>

        <Text
          style={{
            color: colors.textMuted,
            fontSize: 13,
            marginTop: 2,
          }}
        >
          Log in to continue the story.
        </Text>
      </View>

      <TextField
        label="Email or Username"
        placeholder="you@email.com or username"
        autoCapitalize="none"
        value={identifier}
        onChangeText={setIdentifier}
      />

      <TextField
        label="Password"
        placeholder="Enter your password"
        isPassword
        value={password}
        onChangeText={setPassword}
      />

      {error && (
        <Text
          accessibilityRole="alert"
          style={{
            color: colors.retryText,
            fontSize: 13,
            marginBottom: spacing.sm,
          }}
        >
          {error}
        </Text>
      )}

      <View
        style={{
          alignItems: "flex-end",
          marginBottom: spacing.lg,
        }}
      >
        <Text
          style={{ color: colors.primary, fontSize: 12 }}
          onPress={() => {
            // Connect your forgot-password screen here.
          }}
        >
          Forgot password?
        </Text>
      </View>

      <Button
        label="Log in"
        onPress={handleLogin}
        loading={loading}
      />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginTop: spacing.lg,
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          New here?{" "}
        </Text>

        <Text
          style={{
            color: colors.primary,
            fontSize: 13,
            fontWeight: "600",
          }}
          onPress={() => router.push("/auth/choose-role")}
        >
          Create an account
        </Text>
      </View>
    </Screen>
  );
}
