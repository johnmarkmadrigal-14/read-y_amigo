import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

export default function CreateClassroom() {
  const { colors } = useTheme();
  const [classroomName, setClassroomName] = useState("");

  const handleCreate = () => {
    if (!classroomName.trim()) {
      Alert.alert(
        "Classroom Name Required",
        "Please enter a name for your classroom."
      );
      return;
    }

    // Temporary classroom code for Phase 1
    const classroomCode = "ABC123";

    router.replace({
      pathname: "/teacher/classroom-created",
      params: { name: classroomName, code: classroomCode },
    });
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text
          style={[
            typography.display.xl,
            { color: colors.primary, textAlign: "center", marginBottom: spacing.xl },
          ]}
        >
          Create Classroom
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
            typography.reading.sm,
          ]}
          placeholder="Classroom Name"
          placeholderTextColor={colors.textMuted}
          value={classroomName}
          onChangeText={setClassroomName}
        />

        <Button
          label="Create Classroom"
          variant="primary"
          onPress={handleCreate}
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
  input: {
    borderWidth: 3,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});