import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { ApiClass, ApiClasswork, getClasswork, getMyClasses } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

type TodoItem = ApiClasswork & { classTitle: string };

// Classroom's "To-do" screen is just every class's upcoming classwork
// merged into one due-date-sorted list. There's no dedicated to-do
// endpoint yet, so this fetches each active class's classwork and merges
// client-side - fine at small scale, worth moving server-side later if
// teachers start having many classes.
export default function TodoScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const classes: ApiClass[] = await getMyClasses();
      const perClass = await Promise.all(
        classes.map(async (c) => {
          const classwork = await getClasswork(c._id);
          return classwork
            .filter((cw) => !!cw.dueDate)
            .map((cw) => ({ ...cw, classTitle: c.title }));
        })
      );
      const merged = perClass.flat().sort((a, b) => {
        return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
      });
      setItems(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your to-do list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
          <Pressable onPress={load} style={[styles.retryButton, { borderColor: colors.border }]}>
            <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
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
        To-do
      </Text>

      {items.length === 0 && (
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
          Nothing due yet. Classwork with a due date will show up here.
        </Text>
      )}

      {items.map((item) => (
        <View key={item._id} style={[styles.row, { borderColor: colors.border }]}>
          <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
            {item.title}
          </Text>
          <Text style={[typography.reading.sm, { color: colors.textMuted, marginTop: 2 }]}>
            {item.classTitle} · Due {new Date(item.dueDate!).toLocaleDateString()}
          </Text>
        </View>
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
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  row: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});