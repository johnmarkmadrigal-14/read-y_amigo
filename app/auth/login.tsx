import { router } from "expo-router";
import { useState } from "react";
import { Image, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, typography } from "../theme/tokens";

export default function LoginScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email || !password) {
      setError("Enter your email and password");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // TODO: replace with your real auth call to backend/
      await new Promise((res) => setTimeout(res, 800));
      router.replace("/auth/choose-role");
    } catch (e) {
      setError("Couldn't log in. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.xl }}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={{
            width: 100,
            height: 100,
            marginBottom: spacing.xs,
          }}
          resizeMode="contain"
        />
        <Text style={{ ...typography.display.lg, color: colors.text }}>Welcome back!</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
          Log in to continue the story.
        </Text>
      </View>

      <TextField
        label="Email"
        placeholder="you@email.com"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label="Password"
        placeholder="••••••••"
        isPassword
        value={password}
        onChangeText={setPassword}
      />

      {error && (
        <Text style={{ color: colors.retryText, fontSize: 13, marginBottom: spacing.sm }}>
          {error}
        </Text>
      )}

      <View style={{ alignItems: "flex-end", marginBottom: spacing.lg }}>
        <Text style={{ color: colors.primary, fontSize: 12 }} onPress={() => {}}>
          Forgot password?
        </Text>
      </View>

      <Button label="Log in" onPress={handleLogin} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.lg }}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>New here? </Text>
        <Text
          style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}
          onPress={() => router.push("/auth/choose-role")}
        >
          Create an account
        </Text>
      </View>
    </Screen>
  );
}