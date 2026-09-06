import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Screen } from "../components/Screen";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, typography, radius } from "../theme/tokens";

export default function TeacherDashboard() {
  const { colors } = useTheme();

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[typography.display.xl, { color: colors.text, marginTop: spacing.sm }]}>
          My Classrooms
        </Text>

        <View style={styles.emptyContainer}>
          <Text style={[typography.display.md, { color: colors.text, textAlign: "center" }]}>
            You don't have any classrooms yet.
          </Text>
          <Text
            style={[
              typography.reading.sm,
              { color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
            ]}
          >
            Create your first classroom to get started.
          </Text>
        </View>

        {/* Floating + button */}
        <Pressable
          style={[styles.plusButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/teacher/create-classroom")}
        >
          <Text style={[styles.plus, { color: colors.primaryText }]}>+</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  plusButton: {
    position: "absolute",
    alignSelf: "center",
    bottom: spacing.xl,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  plus: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "300",
  },
});