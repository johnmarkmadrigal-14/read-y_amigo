import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { createClass } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

export default function CreateClassroom() {
  const { colors } = useTheme();

  const [classroomName, setClassroomName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!classroomName.trim()) {
      Alert.alert("Classroom Name Required", "Please enter a name for your classroom.");
      return;
    }

    setLoading(true);
    try {
      const newClass = await createClass({
        title: classroomName.trim(),
        description: description.trim() || undefined,
      });

      router.replace({
        pathname: "/teacher/classroom-created",
        params: {
          name: newClass.title,
          code: newClass.code,
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      Alert.alert("Couldn't create classroom", message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
    typography.reading.sm,
  ];

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? spacing.xl ?? 32 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[
              typography.display.xl,
              { color: colors.primary, textAlign: "center", marginBottom: spacing.lg },
            ]}
          >
            Create Classroom
          </Text>

          <View>
            <TextInput
              style={inputStyle}
              placeholder="Classroom Name"
              placeholderTextColor={colors.textMuted}
              value={classroomName}
              onChangeText={setClassroomName}
              autoFocus
            />
            <TextInput
              style={inputStyle}
              placeholder="What's this class about? (optional)"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <Button
            label="Create Classroom"
            variant="primary"
            onPress={handleCreate}
            loading={loading}
            style={{ marginTop: spacing.sm }}
          />

          <Button
            label="← Back"
            variant="secondary"
            onPress={() => router.back()}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

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