import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { Screen } from "../components/Screen";
import { logout } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

export default function LearnerSettingsScreen() {
  const { colors } = useTheme();

  function confirmLogout() {
    Alert.alert("Log out?", "You'll need to log back in to access your classrooms.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth/login");
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
        onPress={confirmLogout}
      >
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
});