// app/learner/class/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Screen } from "../../components/Screen";
import { SegmentedControl } from "../../components/SegmentedControl";
import {
  ApiClass,
  ApiClasswork,
  ApiEnrollment,
  ApiStreamPost,
  getLearnerClass,
  getLearnerClassmates,
  getLearnerClasswork,
  getLearnerStream,
} from "../../lib/api";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";

const TABS = ["Stream", "Classwork", "Classmates"] as const;
type Tab = (typeof TABS)[number];

// Same palette + hash as the teacher detail screen for visual consistency.
const BANNER_PALETTE = [
  { bg: "#0F6E56", accent: "#E1F5EE" },
  { bg: "#993C1D", accent: "#FAECE7" },
  { bg: "#534AB7", accent: "#EEEDFE" },
];

function bannerForClassId(classId: string) {
  let hash = 0;
  for (let i = 0; i < classId.length; i++) {
    hash = (hash * 31 + classId.charCodeAt(i)) % BANNER_PALETTE.length;
  }
  return BANNER_PALETTE[Math.abs(hash) % BANNER_PALETTE.length];
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function LearnerClassDetail() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";

  const [activeTab, setActiveTab] = useState<Tab>("Stream");
  const [classInfo, setClassInfo] = useState<{ class: ApiClass; learnerCount: number } | null>(null);
  const [posts, setPosts] = useState<ApiStreamPost[]>([]);
  const [classwork, setClasswork] = useState<ApiClasswork[]>([]);
  const [classmates, setClassmates] = useState<ApiEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const [info, streamPosts, work, mates] = await Promise.all([
        getLearnerClass(classId),
        getLearnerStream(classId),
        getLearnerClasswork(classId),
        getLearnerClassmates(classId),
      ]);
      setClassInfo(info);
      setPosts(streamPosts);
      setClasswork(work);
      setClassmates(mates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this classroom.");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  const banner = bannerForClassId(classId);

  const cardStyle = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border },
  ];

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
          <Text style={[typography.reading.sm, { color: colors.textMuted, marginBottom: spacing.md }]}>
            {error}
          </Text>
          <Pressable onPress={load}>
            <Text style={[typography.reading.sm, { color: colors.primary, fontWeight: "600" }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Banner header */}
      <View style={[styles.banner, { backgroundColor: banner.bg }]}>
        <View style={styles.bannerTopRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
        </View>
        <Ionicons
          name="book"
          size={32}
          color="rgba(255,255,255,0.85)"
          style={{ marginBottom: spacing.sm }}
        />
        <Text style={[typography.display.lg, { color: "#fff" }]}>
          {classInfo?.class.title}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 2, marginBottom: spacing.sm }}>
          {classInfo?.learnerCount ?? 0} learners
        </Text>
        <View style={[styles.codeChip, { backgroundColor: banner.accent }]}>
          <Text style={{ color: banner.bg, fontWeight: "700", letterSpacing: 2 }}>
            {classInfo?.class.code}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <SegmentedControl
          options={[...TABS]}
          selected={activeTab}
          onSelect={(o) => setActiveTab(o as Tab)}
          colors={colors}
        />

        {activeTab === "Stream" && (
          <StreamTab posts={posts} cardStyle={cardStyle} colors={colors} />
        )}
        {activeTab === "Classwork" && (
          <ClassworkTab items={classwork} cardStyle={cardStyle} colors={colors} />
        )}
        {activeTab === "Classmates" && (
          <ClassmatesTab classmates={classmates} cardStyle={cardStyle} colors={colors} />
        )}
      </ScrollView>
    </Screen>
  );
}

// ── Stream tab ───────────────────────────────────────────────────────────────

function StreamTab({
  posts,
  cardStyle,
  colors,
}: {
  posts: ApiStreamPost[];
  cardStyle: any;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  if (posts.length === 0) {
    return (
      <EmptyState
        colors={colors}
        icon="megaphone-outline"
        message="No announcements yet. Check back later."
      />
    );
  }

  return (
    <View>
      {posts.map((post) => (
        <View key={post._id} style={cardStyle}>
          <View style={styles.postHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Ionicons name="person" size={16} color={colors.primaryText} />
            </View>
            <View style={{ marginLeft: spacing.sm }}>
              <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
                Teacher
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {formatRelativeTime(post.createdAt)}
              </Text>
            </View>
          </View>
          <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600", marginTop: spacing.sm }]}>
            {post.title}
          </Text>
          {post.body ? (
            <Text style={[typography.reading.sm, { color: colors.textMuted, marginTop: 4 }]}>
              {post.body}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ── Classwork tab ────────────────────────────────────────────────────────────

function ClassworkTab({
  items,
  cardStyle,
  colors,
}: {
  items: ApiClasswork[];
  cardStyle: any;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        colors={colors}
        icon="document-text-outline"
        message="No classwork assigned yet."
      />
    );
  }

  return (
    <View>
      {items.map((item) => (
        <View key={item._id} style={[cardStyle, styles.classworkRow]}>
          <View style={[styles.classworkIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="document-text" size={16} color={colors.primaryText} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
              {item.title}
            </Text>
            {item.description ? (
              <Text style={[typography.reading.sm, { color: colors.textMuted, marginTop: 2 }]}>
                {item.description}
              </Text>
            ) : null}
            {item.dueDate ? (
              <Text style={[typography.reading.sm, { color: colors.retryText, marginTop: 4, fontSize: 12 }]}>
                Due {new Date(item.dueDate).toLocaleDateString()}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Classmates tab ───────────────────────────────────────────────────────────

function ClassmatesTab({
  classmates,
  cardStyle,
  colors,
}: {
  classmates: ApiEnrollment[];
  cardStyle: any;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  if (classmates.length === 0) {
    return (
      <EmptyState
        colors={colors}
        icon="people-outline"
        message="No other learners have joined yet."
      />
    );
  }

  return (
    <View>
      {classmates.map((enrollment) => (
        <View key={enrollment._id} style={[cardStyle, styles.row]}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
            <Text style={{ color: colors.secondaryText, fontWeight: "700", fontSize: 14 }}>
              {enrollment.learner.displayName?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
              {enrollment.learner.displayName}
            </Text>
            {enrollment.streakDays > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                <Ionicons name="flame" size={12} color="#FF8A00" />
                <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 3 }}>
                  {enrollment.streakDays}-day streak
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  colors,
  icon,
  message,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={40} color={colors.border} style={{ marginBottom: spacing.md }} />
      <Text style={[typography.reading.sm, { color: colors.textMuted, textAlign: "center" }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  bannerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  codeChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  classworkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  classworkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
});