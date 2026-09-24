import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ClassCard } from "../components/ClassCard";
import { Screen } from "../components/Screen";
import { ApiClass, getArchivedClasses, restoreClass } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

// Muted, uniform palette on purpose - archived classes shouldn't compete
// visually with the active dashboard's per-class colors, and using one
// fixed palette avoids the index-shifting problem where a class's color
// would change every time something above it gets restored/archived.
const ARCHIVED_PALETTE = { fill: "#ECECEC", shadow: "#6B6B6B", text: "#2B2B2B" };

export default function ArchivedClassesScreen() {
  const { colors } = useTheme();

  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    setError(null);
    try {
      const data = await getArchivedClasses();
      setClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load archived classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [loadClasses])
  );

  function confirmRestore(classItem: ApiClass) {
    Alert.alert(
      `Restore "${classItem.title}"?`,
      "This brings the class back to your active list.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", onPress: () => handleRestore(classItem._id) },
      ]
    );
  }

  async function handleRestore(classId: string) {
    setRestoringId(classId);
    try {
      await restoreClass(classId);
      setClasses((prev) => prev.filter((c) => c._id !== classId));
    } catch (err) {
      Alert.alert(
        "Couldn't restore class",
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setRestoringId(null);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={[typography.reading.sm, { color: colors.text, textAlign: "center" }]}>
            {error}
          </Text>
          <Pressable onPress={loadClasses} style={[styles.retryButton, { borderColor: colors.retry }]}>
            <Text style={[typography.reading.sm, { color: colors.retryText, fontWeight: "600" }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={[typography.display.lg, { color: colors.text, marginBottom: spacing.lg }]}>
        Archived classes
      </Text>

      {classes.length === 0 && (
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
          No archived classes. Anything you archive from your dashboard shows up here.
        </Text>
      )}

      {classes.map((classItem) => (
        <ClassCard
          key={classItem._id}
          variant="banner"
          title={classItem.title}
          subtitle={classItem.description || "Archived"}
          fill={ARCHIVED_PALETTE.fill}
          shadowColor={ARCHIVED_PALETTE.shadow}
          textColor={ARCHIVED_PALETTE.text}
          onPress={() => {}}
          footer={
            <View style={styles.footerRow}>
              <View style={[styles.codeBadge, { borderColor: ARCHIVED_PALETTE.shadow }]}>
                <Text
                  style={[
                    typography.reading.sm,
                    { color: ARCHIVED_PALETTE.text, fontWeight: "700", letterSpacing: 1 },
                  ]}
                >
                  {classItem.code}
                </Text>
              </View>
              <Pressable
                onPress={() => confirmRestore(classItem)}
                disabled={restoringId === classItem._id}
                style={[styles.restoreButton, { borderColor: colors.primary }]}
              >
                {restoringId === classItem._id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[typography.reading.sm, { color: colors.primary, fontWeight: "700" }]}>
                    Restore
                  </Text>
                )}
              </Pressable>
            </View>
          }
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  retryButton: {
    borderWidth: 2,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  codeBadge: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  restoreButton: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
});