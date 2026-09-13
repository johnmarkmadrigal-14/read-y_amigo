import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { Screen } from "../components/Screen";
import { logout } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

// Profile and Reports used to be their own tabs; both are used less often
// than Home/To-do/Notifications, so they're folded in here as menu rows
// instead, matching how Classroom tucks less-frequent destinations behind
// a single menu rather than giving each one its own nav slot.
export default function SettingsScreen() {
  const { colors } = useTheme();

  function confirmLogout() {
    Alert.alert("Log out?", "You'll need to log back in to access your classes.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("../login");
        },
      },
    ]);
  }

  return (
    <Screen scroll>
      <Text style={[typography.display.lg, { color: colors.text, marginBottom: spacing.lg }]}>
        Settings
      </Text>

      <Pressable
        style={[styles.row, { borderColor: colors.border }]}
        onPress={() => router.push("./teacher/profile")}
      >
        <Ionicons name="person-outline" size={20} color={colors.text} />
        <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
          Profile
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.chevron} />
      </Pressable>

      <Pressable
        style={[styles.row, { borderColor: colors.border }]}
        onPress={() => router.push("./teacher/reports")}
      >
        <Ionicons name="bar-chart-outline" size={20} color={colors.text} />
        <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
          Reports
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.chevron} />
      </Pressable>

      <Pressable
        style={[styles.row, { borderColor: colors.border }]}
        onPress={() => router.push("/teacher/archived-classes")}
      >
        <Ionicons name="archive-outline" size={20} color={colors.text} />
        <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
          Archived classes
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.chevron} />
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.primary} />
        <Text style={[typography.reading.sm, { color: colors.primary, fontWeight: "600" }]}>
          Log out
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  chevron: {
    marginLeft: "auto",
  },
});