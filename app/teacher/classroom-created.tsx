import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

export default function ClassroomCreated() {
  const { colors } = useTheme();
  const { name, code } = useLocalSearchParams<{ name: string; code: string }>();

  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Ionicons
          name="checkmark-circle"
          size={72}
          color={colors.primary}
          style={{ marginBottom: spacing.sm }}
        />

        <Text
          style={[
            typography.display.xl,
            { color: colors.primary, textAlign: "center", marginBottom: spacing.lg },
          ]}
        >
          Classroom Created!
        </Text>

        <Text style={[typography.reading.sm, { color: colors.textMuted, marginTop: spacing.md }]}>
          Classroom Name
        </Text>
        <Text style={[typography.display.sm, { color: colors.text }]}>{name}</Text>

        <Text style={[typography.reading.sm, { color: colors.textMuted, marginTop: spacing.md }]}>
          Classroom Code
        </Text>

        <Pressable
          onPress={handleCopy}
          style={({ pressed }) => [
            styles.codeBox,
            {
              backgroundColor: colors.surface,
              borderColor: copied ? colors.primary : colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[typography.display.lg, { color: colors.primary, letterSpacing: 4 }]}>
            {code}
          </Text>
          <View style={styles.copyRow}>
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={14}
              color={colors.textMuted}
            />
            <Text style={[typography.reading.sm, { color: colors.textMuted, marginLeft: 4 }]}>
              {copied ? "Copied!" : "Tap to copy"}
            </Text>
          </View>
        </Pressable>

        <Text
          style={[
            typography.reading.sm,
            { color: colors.textMuted, textAlign: "center", marginVertical: spacing.lg },
          ]}
        >
          Share this code with your learners so they can join your classroom.
        </Text>

        <Button
          label="Go to Dashboard"
          variant="primary"
          onPress={() => router.replace("/teacher/dashboard")}
          style={{ width: "100%" }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  codeBox: {
    borderWidth: 3,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs ?? 8,
    alignItems: "center",
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
});