import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ApiClasswork, ApiStreamPost } from "../../lib/api";
import { useTheme } from "../../theme/ThemeProvider";
import { ClassworkStreamCard } from "../teacher/ClassStream";
import TeacherPostCard, { TeacherPost } from "../teacher/TeacherPostCard";

interface Props {
  classId: string;
  posts: ApiStreamPost[];
  classwork: ApiClasswork[];
  refreshing: boolean;
  onRefresh: () => void;
  onOpenClasswork: (item: ApiClasswork) => void;
}

type StreamItem =
  | { kind: "announcement"; data: TeacherPost }
  | { kind: "classwork"; data: ApiClasswork };

function authorName(post: ApiStreamPost) {
  if (typeof post.author === "object" && post.author !== null) {
    return (
      post.author.displayName ||
      `${post.author.firstName ?? ""} ${post.author.secondName ?? ""}`.trim() ||
      "Teacher"
    );
  }
  return "Teacher";
}

export default function LearnerClassStream({
  classId,
  posts,
  classwork,
  refreshing,
  onRefresh,
  onOpenClasswork,
}: Props) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<"all" | "announcements">("all");

  const items = useMemo<StreamItem[]>(() => {
    const announcements: StreamItem[] = posts.map((post) => ({
      kind: "announcement",
      data: {
        id: post._id,
        classId: post.class,
        type: "announcement",
        title: post.title,
        message: post.body ?? "",
        teacherName: authorName(post),
        createdAt: post.createdAt,
        status: "published",
      },
    }));

    const work: StreamItem[] =
      filter === "all"
        ? classwork.map((item) => ({ kind: "classwork", data: item }))
        : [];

    return [...announcements, ...work].sort(
      (a, b) =>
        new Date(b.data.createdAt).getTime() -
        new Date(a.data.createdAt).getTime()
    );
  }, [posts, classwork, filter]);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primary }]}>
          CLASS STREAM
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>Updates</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Announcements and new classwork
        </Text>
      </View>

      {/* FILTERS */}
      <View style={styles.filters}>
        {(
          [
            { key: "all", label: "All" },
            { key: "announcements", label: "Announcements" },
          ] as const
        ).map((option) => {
          const selected = filter === option.key;

          return (
            <Pressable
              key={option.key}
              onPress={() => setFilter(option.key)}
              style={[
                styles.filterButton,
                {
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: selected ? colors.primaryText : colors.textMuted },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* FEED */}
      <FlatList
        data={items}
        keyExtractor={(item) =>
          item.kind === "announcement"
            ? `announcement-${item.data.id}`
            : `classwork-${item.data._id}`
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          items.length === 0 ? styles.emptyContainer : styles.listContent
        }
        renderItem={({ item }) =>
          item.kind === "announcement" ? (
            <TeacherPostCard
              post={item.data}
              readOnly
              onEdit={() => {}}
              onDelete={() => {}}
              onPress={(selected) =>
                router.push(
                  `/learner/class/announcement/${selected.id}?classId=${classId}`
                )
              }
            />
          ) : (
            <ClassworkStreamCard
              item={item.data}
              colors={colors}
              onView={() => onOpenClasswork(item.data)}
            />
          )
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="megaphone-outline" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No updates yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Announcements and classwork from your teacher will show up here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  kicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  title: { fontSize: 25, lineHeight: 30, fontWeight: "900", marginTop: 1 },
  subtitle: { fontSize: 12, marginTop: 2 },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  filterButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  filterText: { fontSize: 11, fontWeight: "800" },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyContainer: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 80 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 19, fontWeight: "900" },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 300,
  },
});