import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import {
  ApiClasswork,
  ClassworkType,
  getLearnerClasswork,
  getMyEnrollments,
  getMySubmissions,
} from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

type TodoItem = ApiClasswork & { classTitle: string; done: boolean };

type ThemeColors = ReturnType<typeof useTheme>["colors"];

type Filter = "all" | ClassworkType;

const FILTERS: Filter[] = ["all", "reading", "activity", "quiz"];

// Haptics can fail on some devices/simulators — never let that break the UI.
const tap = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

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

// ── Animated helpers ─────────────────────────────────────────────────────────

// Fades and slides a row in, staggered by its position in the list.
function FadeIn({ index, children }: { index: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 8) * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, index]);

  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

// Springy "squish" on press.
function PressableScale({
  onPress,
  children,
  style,
}: {
  onPress: () => void;
  children: React.ReactNode;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      friction: 6,
      tension: 200,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.97)} onPressOut={() => to(1)}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
  highlight,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
  highlight: boolean;
  colors: ThemeColors;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.surface,
          borderColor: highlight ? color : colors.border,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={highlight ? color : colors.textMuted} />
      <Text style={[styles.statValue, { color: highlight ? color : colors.text }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function LearnerTodoScreen() {
  const { colors } = useTheme();

  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsItem, setDetailsItem] = useState<ApiClasswork | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ done: true });

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
            const [classwork, submissions] = await Promise.all([
              getLearnerClasswork(cls._id),
              // If submissions fail to load, just treat nothing as done.
              getMySubmissions(cls._id).catch(() => []),
            ]);

            const doneIds = new Set(submissions.map((s) => String(s.classwork)));

            return classwork.map((cw) => ({
              ...cw,
              classTitle: cls.title,
              done: doneIds.has(cw._id),
            }));
          } catch {
            // One failing class shouldn't hide the rest of the to-do list.
            return [] as TodoItem[];
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

  const pending = useMemo(() => items.filter((i) => !i.done), [items]);

  const stats = useMemo(() => {
    const now = Date.now();
    let overdue = 0;
    let today = 0;
    let upcoming = 0;

    for (const item of pending) {
      if (!item.dueDate) continue;
      if (new Date(item.dueDate).getTime() < now) overdue++;
      else if (dueStatus(item.dueDate).label === "Due today") today++;
      else upcoming++;
    }
    return { overdue, today, upcoming };
  }, [pending]);

  const filterCount = useCallback(
    (f: Filter) => (f === "all" ? pending.length : pending.filter((i) => i.type === f).length),
    [pending]
  );

  const sections = useMemo(() => {
    const now = Date.now();
    const match = (i: TodoItem) => filter === "all" || i.type === filter;

    const withDue = pending
      .filter((item) => !!item.dueDate && match(item))
      .sort(
        (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      );

    const noDue = pending
      .filter((item) => !item.dueDate && match(item))
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const done = items
      .filter((i) => i.done && match(i))
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
      { key: "done", title: "Done", data: done },
    ].filter((section) => section.data.length > 0);
  }, [items, pending, filter]);

  const toggleSection = (key: string) => {
    tap();
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  const allCaughtUp = items.length > 0 && pending.length === 0;

  let rowIndex = 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
      >
        {items.length > 0 && (
          <>
            <View style={styles.statsRow}>
              <StatCard
                icon="alert-circle"
                value={stats.overdue}
                label="Overdue"
                color={colors.retryText}
                highlight={stats.overdue > 0}
                colors={colors}
              />
              <StatCard
                icon="time"
                value={stats.today}
                label="Due today"
                color={colors.retry}
                highlight={stats.today > 0}
                colors={colors}
              />
              <StatCard
                icon="calendar"
                value={stats.upcoming}
                label="Upcoming"
                color={colors.primary}
                highlight={stats.upcoming > 0}
                colors={colors}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {FILTERS.map((f) => {
                const selected = filter === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => {
                      tap();
                      setFilter(f);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {f !== "all" && (
                      <Ionicons
                        name={classworkIconName(f)}
                        size={14}
                        color={selected ? colors.primaryText : colors.textMuted}
                      />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.primaryText : colors.text },
                      ]}
                    >
                      {f === "all" ? "All" : classworkTypeLabel(f)} · {filterCount(f)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {items.length === 0 && (
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

        {allCaughtUp && (
          <View style={styles.caughtUp}>
            <Ionicons name="checkmark-done-circle" size={46} color={colors.success} />
            <Text style={[styles.caughtUpTitle, { color: colors.text }]}>All caught up!</Text>
            <Text style={[typography.reading.sm, styles.caughtUpDescription, { color: colors.textMuted }]}>
              Great job. You’ve finished everything for now.
            </Text>
            <View style={styles.caughtUpStatus}>
              <View style={[styles.caughtUpStatusDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.caughtUpPillText, { color: colors.success }]}>Nothing pending</Text>
            </View>
          </View>
        )}

        {items.length > 0 && sections.length === 0 && (
          <Text
            style={[
              typography.reading.sm,
              { color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
            ]}
          >
            Nothing here for this filter.
          </Text>
        )}

        {sections.map((section) => {
          const isCollapsed = !!collapsed[section.key];

          return (
            <View key={section.key} style={{ marginBottom: spacing.md }}>
              <Pressable
                onPress={() => toggleSection(section.key)}
                style={[
                  styles.sectionHeader,
                ]}
                hitSlop={6}
              >
                {section.key === "done" ? (
                  <View style={[styles.doneHeaderContent, { backgroundColor: colors.success + "12" }]}>
                    <View
                      style={[
                        styles.doneIconWrap,
                        { backgroundColor: colors.success + "18" },
                      ]}
                    >
                      <Ionicons name="checkmark-done" size={19} color={colors.success} />
                    </View>
                    <View style={styles.doneHeaderText}>
                      <Text style={[styles.doneTitle, { color: colors.text }]}>Completed</Text>
                      <Text style={[styles.doneSubtitle, { color: colors.textMuted }]}>
                        Work you have finished
                      </Text>
                    </View>
                    <View style={[styles.doneCountBadge, { backgroundColor: colors.success }]}>
                      <Text style={styles.doneCountText}>{section.data.length}</Text>
                    </View>
                    <Ionicons
                      name={isCollapsed ? "chevron-down" : "chevron-up"}
                      size={18}
                      color={colors.success}
                    />
                  </View>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.sectionTitle,
                        {
                          color: section.key === "overdue" ? colors.retryText : colors.textMuted,
                        },
                      ]}
                    >
                      {section.title.toUpperCase()} · {section.data.length}
                    </Text>
                    <Ionicons
                      name={isCollapsed ? "chevron-down" : "chevron-up"}
                      size={16}
                      color={colors.textMuted}
                    />
                  </>
                )}
              </Pressable>

              {!isCollapsed &&
                section.data.map((item) => {
                  const row = (
                    <TodoRow
                      item={item}
                      colors={colors}
                      onPress={() => {
                        tap();
                        setDetailsItem(item);
                      }}
                    />
                  );
                  // Keep completed rows in normal document flow when the section expands,
                  // avoiding the staggered translate animation visually overlapping nearby rows.
                  return section.key === "done" ? (
                    <View key={item._id}>{row}</View>
                  ) : (
                    <FadeIn key={item._id} index={rowIndex++}>{row}</FadeIn>
                  );
                })}
            </View>
          );
        })}
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
  const status = item.dueDate && !item.done ? dueStatus(item.dueDate) : null;

  const statusColor =
    status?.tone === "overdue"
      ? colors.retryText
      : status?.tone === "soon"
      ? colors.retry
      : colors.textMuted;

  const accent = item.done ? colors.success : status ? statusColor : colors.border;

  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: item.done ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View
        style={[
          styles.rowIcon,
          { backgroundColor: item.done ? colors.success : colors.primary },
        ]}
      >
        <Ionicons
          name={item.done ? "checkmark" : classworkIconName(item.type)}
          size={21}
          color={item.done ? "#fff" : colors.primaryText}
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

        {item.done ? (
          <View style={styles.dueRow}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Text style={[styles.dueText, { color: colors.success }]}>Submitted</Text>
          </View>
        ) : status && item.dueDate ? (
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
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    // Tighter screen-edge spacing so the content uses more of the phone width.
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
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
  caughtUp: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  caughtUpTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
    textAlign: "center",
    marginTop: spacing.xs,
  },
  caughtUpDescription: {
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 21,
  },
  caughtUpStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: spacing.sm,
  },
  caughtUpStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  caughtUpPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  statValue: { fontSize: 24, fontWeight: "900" },
  statLabel: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    paddingRight: spacing.md,
  },
  chip: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "center",
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
  },
  chipText: { fontSize: 12, fontWeight: "800" },
  sectionHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    position: "relative",
  },
  doneHeaderContent: {
    width: "100%",
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
  doneIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  doneHeaderText: {
    flex: 1,
    gap: 2,
  },
  doneTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  doneSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  doneCountBadge: {
    minWidth: 27,
    height: 27,
    paddingHorizontal: 7,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    paddingLeft: spacing.md + 4,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
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