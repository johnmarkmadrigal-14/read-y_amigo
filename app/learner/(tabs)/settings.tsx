import { useConfirmation } from '../../../components/ConfirmationDialog';
import { AppInformationLinks } from "../../../components/AppInformationScreen";
import { HeadingLabel } from "../../components/InterfaceChrome";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { Screen } from "../../components/Screen";
import { logout } from "../../lib/api";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";

export default function LearnerSettingsScreen() {
  const confirm = useConfirmation();
  const { colors } = useTheme();

  function confirmLogout() {
    confirm({
      title: "Log out?",
      message: "You'll need to log back in to access your classrooms.",
      icon: "log-out-outline",
      confirmLabel: "Log out",
      onConfirm: async () => {
        await logout();
        router.replace("/auth/login");
      },
    });
  }

  return (
    <Screen scroll>
      <HeadingLabel icon="settings-outline" style={[typography.display.lg, { color: colors.text, marginBottom: spacing.lg }]}>
        Settings
      </HeadingLabel>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push("/learner/profile")}>
        <Ionicons name="person-outline" size={20} color={colors.text} />
        <Text style={[typography.reading.sm, { color: colors.text }]}>Profile and reading preferences</Text>
      </Pressable>

      <AppInformationLinks role="learner" />

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
