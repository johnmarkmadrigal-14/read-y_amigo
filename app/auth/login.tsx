import { AuthButton, AuthCanvas, AuthHeader, AuthInput, authStyles } from '../../components/auth/AuthUI';
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { login } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { typography } from "../theme/tokens";

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

  return <AuthCanvas scroll>
    <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 24 }}>
      <AuthHeader title="Log in" onBack={() => router.back()} />
      <AuthInput label="Email or username" placeholder="Enter email or username" value={identifier} onChangeText={setIdentifier} autoComplete="username" editable={!loading} />
      <AuthInput label="Password" placeholder="Enter password" password value={password} onChangeText={setPassword} autoComplete="current-password" editable={!loading} onSubmitEditing={() => { if (!loading) void handleLogin(); }} />
      {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText, marginBottom: 16 }]}>{error}</Text>}
      <AuthButton label="Log in" onPress={() => { void handleLogin(); }} busy={loading} />
      <Pressable accessibilityRole="button" onPress={() => router.push('/auth/choose-role')} style={[authStyles.link, { marginTop: 20 }]}><Text style={[typography.reading.sm, { color: colors.primary }]}>Create an account</Text></Pressable>
    </View>
  </AuthCanvas>;
}
