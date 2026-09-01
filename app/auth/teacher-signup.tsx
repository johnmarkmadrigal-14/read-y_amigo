import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

export default function TeacherSignup() {
  const { colors } = useTheme();

  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [learnerLevel, setLearnerLevel] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const numericAge = Number(age);

    if (!firstName || !secondName || !displayName || !age) {
      Alert.alert("Incomplete", "Please complete all required fields.");
      return;
    }

    if (numericAge < 15) {
      Alert.alert("Age Requirement", "Teachers must be at least 15 years old.");
      return;
    }

    setLoading(true);
    try {
      // Temporary navigation.
      // Later, this will send data to MongoDB through the backend.
      router.replace("/teacher/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text
          style={[
            typography.display.xl,
            { color: colors.primary, textAlign: "center", marginBottom: spacing.xl },
          ]}
        >
          Teacher Account
        </Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }, typography.reading.sm]}
          placeholder="First Name"
          placeholderTextColor={colors.textMuted}
          value={firstName}
          onChangeText={setFirstName}
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }, typography.reading.sm]}
          placeholder="Second / Last Name"
          placeholderTextColor={colors.textMuted}
          value={secondName}
          onChangeText={setSecondName}
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }, typography.reading.sm]}
          placeholder="Middle Initial"
          placeholderTextColor={colors.textMuted}
          value={middleInitial}
          onChangeText={setMiddleInitial}
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }, typography.reading.sm]}
          placeholder="How should learners address you?"
          placeholderTextColor={colors.textMuted}
          value={displayName}
          onChangeText={setDisplayName}
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }, typography.reading.sm]}
          placeholder="Age"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }, typography.reading.sm]}
          placeholder="Level of learners you teach"
          placeholderTextColor={colors.textMuted}
          value={learnerLevel}
          onChangeText={setLearnerLevel}
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }, typography.reading.sm]}
          placeholder="Email Address"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }, typography.reading.sm]}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button
          label="Create Teacher Account"
          variant="primary"
          onPress={handleSignup}
          loading={loading}
          style={{ marginTop: spacing.sm }}
        />

        <Text
          onPress={() => router.back()}
          style={[
            typography.reading.sm,
            { textAlign: "center", color: colors.success, marginTop: spacing.md },
          ]}
        >
          ← Back
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },

  input: {
    borderWidth: 3,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});