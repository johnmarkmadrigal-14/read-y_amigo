import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

export default function JoinClassroom() {
  const { colors } = useTheme();
  const [code, setCode] = useState("");

  const handleJoin = () => {
    if (!code.trim()) {
      Alert.alert(
        "Classroom Code Required",
        "Please enter the code given by your teacher."
      );
      return;
    }

    // Temporary Phase 1 behavior
    router.replace("/learner/classroom-joined");
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text
          style={[
            typography.display.xl,
            { color: colors.primary, textAlign: "center", marginBottom: spacing.sm },
          ]}
        >
          Join Classroom
        </Text>

        <Text
          style={[
            typography.reading.sm,
            { color: colors.textMuted, textAlign: "center", marginBottom: spacing.xl },
          ]}
        >
          Enter the classroom code given by your teacher.
        </Text>

        <TextInput
          style={[
            styles.codeInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
            typography.display.lg,
          ]}
          placeholder="ABC123"
          placeholderTextColor={colors.textMuted}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          textAlign="center"
        />

        <Button
          label="Join Classroom"
          variant="primary"
          onPress={handleJoin}
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