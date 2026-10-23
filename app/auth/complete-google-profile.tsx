import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { completeGoogleSignup } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, typography } from "../theme/tokens";

// Expects route params, passed when navigating here:
//   pendingToken          — from GoogleSignInButton's onNeedsProfile
//   suggestedDisplayName  — from GoogleSignInButton's onNeedsProfile
//   role                  — "teacher" or "learner", so this screen knows
//                            whether to also ask for learnerLevel
export default function CompleteGoogleProfileScreen() {
  const { colors } = useTheme();
  const { pendingToken, suggestedDisplayName, role } = useLocalSearchParams<{
    pendingToken: string;
    suggestedDisplayName: string;
    role: "teacher" | "learner";
  }>();

  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [displayName, setDisplayName] = useState(suggestedDisplayName ?? "");
  const [age, setAge] = useState("");
  const [learnerLevel, setLearnerLevel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!firstName || !secondName || !displayName || !age) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await completeGoogleSignup({
        pendingToken,
        firstName,
        secondName,
        middleInitial: middleInitial || undefined,
        displayName,
        age,
        learnerLevel: role === "teacher" ? learnerLevel || undefined : undefined,
      });
      // Session is now persisted — send them into the app.
      router.replace(role === "teacher" ? "/teacher/dashboard" : "/learner/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[typography.display.lg, { color: colors.text }]}>
          Almost done!
        </Text>
        <Text
          style={[
            typography.reading.sm,
            { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.lg },
          ]}
        >
          Google didn't share a few details we need — fill these in to finish creating your account.
        </Text>

        <Field label="First name" value={firstName} onChangeText={setFirstName} colors={colors} />
        <Field label="Last name" value={secondName} onChangeText={setSecondName} colors={colors} />
        <Field
          label="Middle initial (optional)"
          value={middleInitial}
          onChangeText={setMiddleInitial}
          colors={colors}
        />
        <Field label="Display name" value={displayName} onChangeText={setDisplayName} colors={colors} />
        <Field
          label="Age"
          value={age}
          onChangeText={setAge}
          colors={colors}
          keyboardType="number-pad"
        />
        {role === "teacher" && (
          <Field
            label="Learner level you teach (optional)"
            value={learnerLevel}
            onChangeText={setLearnerLevel}
            colors={colors}
          />
        )}

        {error && (
          <Text style={[typography.reading.sm, { color: "#B3261E", marginBottom: spacing.md }]}>
            {error}
          </Text>
        )}

        <Button
          label={submitting ? "Creating account..." : "Finish signing up"}
          onPress={handleSubmit}
          disabled={submitting}
          style={{ marginTop: spacing.sm }}
        />
        {submitting && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />}
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  colors: ReturnType<typeof useTheme>["colors"];
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.reading.sm, { color: colors.textMuted, marginBottom: spacing.xs ?? 4 }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={[
          styles.input,
          { borderColor: colors.border, color: colors.text },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  input: {
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
});