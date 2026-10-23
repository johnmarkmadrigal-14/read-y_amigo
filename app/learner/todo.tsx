import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ClassworkDetailsSheet, {
  classworkIconName,
  classworkTypeLabel,
  formatDueDateTime,
} from "../components/learner/ClassworkDetailsSheet";
import { Screen } from "../components/Screen";
import { ApiClasswork, getLearnerClasswork, getMyEnrollments } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

type TodoItem = ApiClasswork & { classTitle: string };

type ThemeColors = ReturnType<typeof useTheme>["colors"];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Label + urgency for a due date, e.g. "Due tomorrow" / "Overdue by 2 days".
function dueStatus(dueDate: string): {
  label: string;
  tone: "overdue" | "soon" | "normal";
} {
  const due = new Date(dueDate);

  if (due.getTime() < Date.now()) {
    const days = Math.round(
      (startOfDay(new Date()) - startOfDay(due)) / 86400000
    );
    return {
      label: days <= 0 ? "Overdue" : `Overdue by ${days} day${days === 1 ? "" : "s"}`,
      tone: "overdue",
    };
  }

  const dayDiff = Math.round(
    (startOfDay(due) - startOfDay(new Date())) / 86400000
  );

  if (dayDiff === 0) return { label: "Due today", tone: "soon" };
  if (dayDiff === 1) return { label: "Due tomorrow", tone: "soon" };
  return { label: `Due in ${dayDiff} days`, tone: "normal" };
}

export default function LearnerTodoScreen() {
  const { colors } = useTheme();

  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsItem, setDetailsItem] = useState<ApiClasswork | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    setError(null);

    try {
      const enrollments = await getMyEnrollments();

      const activeClasses = enrollments
        .map((e) => e.class)
        .filter((c) => c && c.status === "active");

      const perClass = await Promise.all(
        activeClasses.map(async (cls) => {
          try {
            const classwork = await getLearnerClasswork(cls._id);
            return classwork.map((cw) => ({ ...cw, classTitle: cls.title }));
          } catch {
            // One failing class shouldn't hide the rest of the to-do list.
            return [];
          }
        })
      );

      setItems(perClass.flat());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your to-do list.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sections = useMemo(() => {
    const now = Date.now();

    const withDue = items
      .filter((item) => !!item.dueDate)
      .sort(
        (a, b) =>
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      );

    const noDue = items
      .filter((item) => !item.dueDate)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return [
      {
        key: "overdue",
        title: "Overdue",
        data: withDue.filter((i) => new Date(i.dueDate!).getTime() < now).reverse(),
      },
      {
        key: "upcoming",
        title: "Upcoming",
        data: withDue.filter((i) => new Date(i.dueDate!).getTime() >= now),
      },
      { key: "nodue", title: "No due date", data: noDue },
    ].filter((section) => section.data.length > 0);
  }, [items]);

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
          <Pressable
            onPress={() => load()}
            style={[styles.retryButton, { borderColor: colors.border }]}
          >
            <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
      >
        <Text style={[typography.display.lg, { color: colors.text }]}>To-do</Text>
        <Text
          style={[
            typography.reading.sm,
            { color: colors.textMuted, marginBottom: spacing.lg },
          ]}
        >
          Classwork from your teachers and when it's due.
        </Text>

        {sections.length === 0 && (
          <View style={styles.empty}>
            <Ionicons
              name="checkbox-outline"
              size={44}
              color={colors.border}
              style={{ marginBottom: spacing.md }}
            />
            <Text
              style={[typography.reading.sm, { color: colors.textMuted, textAlign: "center" }]}
            >
              Nothing to do yet. Classwork your teachers assign will show up here.
            </Text>
          </View>
        )}

        {sections.map((section) => (
          <View key={section.key} style={{ marginBottom: spacing.md }}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    section.key === "overdue" ? colors.retryText : colors.textMuted,
                },
              ]}
            >
              {section.title.toUpperCase()} · {section.data.length}
            </Text>

            {section.data.map((item) => (
              <TodoRow
                key={item._id}
                item={item}
                colors={colors}
                onPress={() => setDetailsItem(item)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <ClassworkDetailsSheet
        item={detailsItem}
        onClose={() => setDetailsItem(null)}
      />
    </Screen>
  );
}

function TodoRow({
  item,
  colors,
  onPress,
}: {
  item: TodoItem;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const status = item.dueDate ? dueStatus(item.dueDate) : null;

  const statusColor =
    status?.tone === "overdue"
      ? colors.retryText
      : status?.tone === "soon"
      ? colors.retry
      : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.primary }]}>
        <Ionicons
          name={classworkIconName(item.type)}
          size={21}
          color={colors.primaryText}
        />
      </View>

      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text style={[styles.rowType, { color: colors.primary }]}>
          {classworkTypeLabel(item.type).toUpperCase()}
        </Text>

        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={[styles.rowClass, { color: colors.textMuted }]} numberOfLines={1}>
          {item.classTitle}
        </Text>

        {status && item.dueDate ? (
          <View style={styles.dueRow}>
            <Ionicons name="calendar-outline" size={13} color={statusColor} />
            <Text style={[styles.dueText, { color: statusColor }]}>
              {status.label} · {formatDueDateTime(item.dueDate)}
            </Text>
          </View>
        ) : (
          <View style={styles.dueRow}>
            <Ionicons name="infinite-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.dueText, { color: colors.textMuted }]}>
              No deadline
            </Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 6,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
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
  empty: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowType: { fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  rowTitle: { fontSize: 15, fontWeight: "900", marginTop: 2 },
  rowClass: { fontSize: 11, marginTop: 2 },
  dueRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  dueText: { fontSize: 11, fontWeight: "700", flexShrink: 1 },
});