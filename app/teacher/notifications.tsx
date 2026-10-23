import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, typography } from "../theme/tokens";

// There's no notifications endpoint in the API yet (no ApiNotification type,
// no /notifications route). Shipping this as a static empty state so the
// tab exists and looks intentional; swap the body for a real fetch + list
// once a backend route exists to back it.
export default function NotificationsScreen() {
  const { colors } = useTheme();

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[typography.display.lg, { color: colors.text, marginBottom: spacing.lg }]}>
          Notifications
        </Text>
        <View style={styles.centered}>
          <Text style={[typography.reading.sm, { color: colors.textMuted, textAlign: "center" }]}>
            You're all caught up. Notifications about your classes will show up here.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: spacing.xl,
  },
});