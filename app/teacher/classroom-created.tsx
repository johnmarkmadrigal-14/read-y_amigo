import { View, Text, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

export default function ClassroomCreated() {
  const { colors } = useTheme();
  const { name, code } = useLocalSearchParams<{ name: string; code: string }>();

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
            { color: colors.primary, textAlign: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
          ]}
        >
          Classroom Created!
        </Text>

        {/* Classroom name card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.reading.sm, { color: colors.textMuted, marginBottom: 4 }]}>
            Classroom Name
          </Text>
          <Text style={[typography.display.lg, { color: colors.text }]}>{name}</Text>
        </View>

        {/* Classroom code card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.reading.sm, { color: colors.textMuted, marginBottom: 4 }]}>
            Classroom Code
          </Text>
          <Text
            style={[
              typography.display.xl,
              { color: colors.primary, letterSpacing: 6, textAlign: "center" },
            ]}
          >
            {code}
          </Text>
        </View>

        <Text
          style={[
            typography.reading.sm,
            { color: colors.textMuted, textAlign: "center", marginVertical: spacing.lg, paddingHorizontal: spacing.md },
          ]}
        >
          Share this code with your learners so they can join your classroom.
        </Text>

        <Button
          label="Go to Dashboard"
          variant="primary"
          onPress={() => router.replace("/teacher/dashboard")}
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
  infoCard: {
    width: "100%",
    borderWidth: 3,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
  },
});