import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

export default function ClassroomJoined() {
  const { colors } = useTheme();

  return (
    <Screen>
      <View style={styles.container}>
        {/* Success badge */}
        <View style={[styles.checkBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: 48 }}>✓</Text>
        </View>

        <Text
          style={[
            typography.display.xl,
            { color: colors.primary, textAlign: "center", marginTop: spacing.lg, marginBottom: spacing.md },
          ]}
        >
          Classroom Joined!
        </Text>

        <Text
          style={[
            typography.reading.sm,
            { color: colors.textMuted, textAlign: "center", marginBottom: spacing.xl, paddingHorizontal: spacing.md },
          ]}
        >
          You have successfully joined the classroom.
        </Text>

        <Button
          label="Go to My Classrooms"
          variant="primary"
          onPress={() => router.replace("/learner/dashboard")}
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
  checkBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
});