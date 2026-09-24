// app/learner/join-classroom.tsx
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { joinClassroom } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

export default function JoinClassroom() {
  const { colors } = useTheme();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert("Code required", "Enter the classroom code your teacher gave you.");
      return;
    }

    setLoading(true);
    try {
      const result = await joinClassroom(trimmed);
      router.replace({
        pathname: "/learner/classroom-joined",
        params: { className: result.class.title },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't join that classroom. Check the code and try again.";
      Alert.alert("Couldn't join", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[typography.display.xl, { color: colors.primary, textAlign: "center", marginBottom: spacing.sm }]}>
          Join Classroom
        </Text>
        <Text style={[typography.reading.sm, { color: colors.textMuted, textAlign: "center", marginBottom: spacing.xl }]}>
          Enter the classroom code given by your teacher.
        </Text>

        <TextInput
          style={[
            styles.codeInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
              ...typography.display.lg,
            },
          ]}
          placeholder="ABC123"
          placeholderTextColor={colors.textMuted}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          textAlign="center"
          autoFocus
        />

        <Button
          label="Join Classroom"
          variant="primary"
          onPress={handleJoin}
          loading={loading}
          style={{ marginTop: spacing.sm }}
        />
        <Button
          label="← Back"
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginTop: spacing.md }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  codeInput: {
    borderWidth: 3,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 6,
    textAlign: "center",
  },
});