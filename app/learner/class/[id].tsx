// app/learner/class/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  openRemoteUrl,
} from "../../components/learner/ClassworkDetailsSheet";
import LearnerClassStream from "../../components/learner/LearnerClassStream";
import { Screen } from "../../components/Screen";
import {
  ApiClass,
  ApiClasswork,
  ApiEnrollment,
  ApiMaterial,
  ApiStreamPost,
  getLearnerClass,
  getLearnerClassmates,
  getLearnerClasswork,
  getLearnerMaterials,
  getLearnerStream,
} from "../../lib/api";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";

/* =========================================================
   CONSTANTS + HELPERS
   ========================================================= */

const TABS = ["Stream", "Classwork", "Materials", "People"] as const;
type Tab = (typeof TABS)[number];

type ThemeColors = ReturnType<typeof useTheme>["colors"];

type Filter = "All" | ApiClasswork["type"];

const FILTERS: { key: Filter; label: string }[] = [
  { key: "All", label: "All" },
  { key: "reading", label: "Reading" },
  { key: "activity", label: "Activity" },
  { key: "quiz", label: "Quiz" },
];

// Same palette + hash as the teacher detail screen so a class has the same
// color on both sides.
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

function iconForTab(tab: Tab): keyof typeof import("@expo/vector-icons").Ionicons.glyphMap {
  switch (tab) {
    case "Stream":
      return "megaphone-outline";
    case "Classwork":
      return "clipboard-outline";
    case "Materials":
      return "folder-open-outline";
    default:
      return "people-outline";
  }
}

function materialIcon(type: ApiMaterial["type"]) {
  switch (type) {
    case "document":
      return "document-text-outline";
    case "video":
      return "play-circle-outline";
    case "link":
      return "link-outline";
    case "image":
      return "image-outline";
    default:
      return "folder-outline";
  }
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* =========================================================
   MAIN SCREEN
   ========================================================= */

export default function LearnerClassDetail() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";

  const [activeTab, setActiveTab] = useState<Tab>("Stream");
  const [classInfo, setClassInfo] = useState<{
    class: ApiClass;
    learnerCount: number;
  } | null>(null);
  const [posts, setPosts] = useState<ApiStreamPost[]>([]);
  const [classwork, setClasswork] = useState<ApiClasswork[]>([]);
  const [materials, setMaterials] = useState<ApiMaterial[]>([]);
  const [classmates, setClassmates] = useState<ApiEnrollment[]>([]);

  const [detailsItem, setDetailsItem] = useState<ApiClasswork | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!classId) return;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const [info, streamPosts, work, materialList, mates] =
          await Promise.all([
            getLearnerClass(classId),
            getLearnerStream(classId),
            getLearnerClasswork(classId),
            getLearnerMaterials(classId),
            getLearnerClassmates(classId),
          ]);

        setClassInfo(info);
        setPosts(streamPosts);
        setClasswork(work);
        setMaterials(materialList);
        setClassmates(mates);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Couldn't load this classroom.";

        if (silent) {
          Alert.alert("Couldn't refresh", message);
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [classId]
  );

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
          <Text
            style={[
              typography.reading.sm,
              { color: colors.textMuted, marginBottom: spacing.md, textAlign: "center" },
            ]}
          >
            {error}
          </Text>
          <Pressable onPress={() => load()}>
            <Text
              style={[
                typography.reading.sm,
                { color: colors.primary, fontWeight: "700" },
              ]}
            >
              Try again
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const renderTabContent = () => {
    if (activeTab === "Stream") {
      return (
        <View style={styles.streamArea}>
          <LearnerClassStream
            classId={classId}
            posts={posts}
            classwork={classwork}
            refreshing={refreshing}
            onRefresh={() => load(true)}
            onOpenClasswork={setDetailsItem}
          />
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
      >
        <View style={styles.pageHeading}>
          <View>
            <Text style={[styles.pageKicker, { color: colors.primary }]}>
              CLASS{" "}
              {activeTab === "Classwork"
                ? "TASKS"
                : activeTab === "Materials"
                ? "RESOURCES"
                : "ROSTER"}
            </Text>
            <Text style={[styles.pageTitle, { color: colors.text }]}>
              {activeTab}
            </Text>
          </View>
          <View style={[styles.pageDot, { backgroundColor: colors.primary }]} />
        </View>

        {activeTab === "Classwork" && (
          <ClassworkTab
            items={classwork}
            colors={colors}
            onOpen={setDetailsItem}
          />
        )}
        {activeTab === "Materials" && (
          <MaterialsTab
            materials={materials}
            cardStyle={cardStyle}
            colors={colors}
          />
        )}
        {activeTab === "People" && (
          <PeopleTab
            classmates={classmates}
            cardStyle={cardStyle}
            colors={colors}
          />
        )}
      </ScrollView>
    );
  };

  return (
    <Screen>
      {/* HERO */}
      <View
        style={[
          styles.hero,
          styles.edgeToEdge,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.heroAccent, { backgroundColor: banner.bg }]} />

        <View style={styles.heroTopRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.roundIcon, { backgroundColor: colors.background }]}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>

          <View style={styles.heroTitleWrap}>
            <Text style={[styles.heroOverline, { color: colors.textMuted }]}>
              MY CLASSROOM
            </Text>
            <Text
              style={[styles.heroTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {classInfo?.class.title ?? "Classroom"}
            </Text>
          </View>
        </View>

        <View style={styles.heroInfo}>
          <View style={[styles.heroBadge, { backgroundColor: banner.bg }]}>
            <Ionicons name="school-outline" size={19} color="#fff" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[styles.heroDescription, { color: colors.textMuted }]}
              numberOfLines={2}
            >
              {classInfo?.class.description ||
                "Your lessons, tasks, and classmates in one place."}
            </Text>

            <View style={styles.heroMetaItem}>
              <Ionicons name="people-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.heroMetaText, { color: colors.textMuted }]}>
                {classInfo?.learnerCount ?? 0} learners
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* TABS */}
      <View
        style={[
          styles.tabBar,
          styles.edgeToEdge,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        {TABS.map((tab) => {
          const selected = activeTab === tab;

          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={styles.tab}
            >
              <Ionicons
                name={iconForTab(tab)}
                size={17}
                color={selected ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: selected ? colors.primary : colors.textMuted },
                ]}
              >
                {tab}
              </Text>
              {selected && (
                <View
                  style={[styles.tabLine, { backgroundColor: colors.primary }]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {renderTabContent()}

      <ClassworkDetailsSheet
        item={detailsItem}
        onClose={() => setDetailsItem(null)}
      />
    </Screen>
  );
}

/* =========================================================
   CLASSWORK TAB
   ========================================================= */

function ClassworkTab({
  items,
  colors,
  onOpen,
}: {
  items: ApiClasswork[];
  colors: ThemeColors;
  onOpen: (item: ApiClasswork) => void;
}) {
  const [selectedFilter, setSelectedFilter] = useState<Filter>("All");

  const filtered = useMemo(
    () =>
      selectedFilter === "All"
        ? items
        : items.filter((item) => item.type === selectedFilter),
    [items, selectedFilter]
  );

  return (
    <View>
      <View style={styles.filters}>
        {FILTERS.map((filter) => {
          const selected = selectedFilter === filter.key;

          return (
            <Pressable
              key={filter.key}
              onPress={() => setSelectedFilter(filter.key)}
              style={[
                styles.filter,
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
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="clipboard-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {items.length > 0 ? "No classwork in this category" : "No classwork yet"}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {items.length > 0
              ? "Try another filter to see your classwork."
              : "Assignments, activities, and quizzes from your teacher will show up here."}
          </Text>
        </View>
      ) : (
        filtered.map((item) => (
          <Pressable
            key={item._id}
            onPress={() => onOpen(item)}
            style={[
              styles.classworkCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.classworkIcon, { backgroundColor: colors.primary }]}>
              <Ionicons
                name={classworkIconName(item.type)}
                size={21}
                color={colors.primaryText}
              />
            </View>

            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={[styles.classworkType, { color: colors.primary }]}>
                {classworkTypeLabel(item.type)}
              </Text>
              <Text
                style={[styles.classworkTitle, { color: colors.text }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              {item.description ? (
                <Text
                  style={[styles.classworkDescription, { color: colors.textMuted }]}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              ) : null}

              <View style={styles.classworkMeta}>
                <Ionicons name="star-outline" size={12} color={colors.textMuted} />
                <Text style={[styles.classworkMetaText, { color: colors.textMuted }]}>
                  {item.points} points
                </Text>

                {item.dueDate ? (
                  <>
                    <Ionicons
                      name="calendar-outline"
                      size={12}
                      color={colors.textMuted}
                    />
                    <Text
                      style={[styles.classworkMetaText, { color: colors.textMuted }]}
                      numberOfLines={1}
                    >
                      Due {formatDueDateTime(item.dueDate)}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>

            <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
          </Pressable>
        ))
      )}
    </View>
  );
}

/* =========================================================
   MATERIALS TAB
   ========================================================= */

function MaterialsTab({
  materials,
  cardStyle,
  colors,
}: {
  materials: ApiMaterial[];
  cardStyle: any;
  colors: ThemeColors;
}) {
  if (materials.length === 0) {
    return (
      <EmptyText
        colors={colors}
        message="No learning materials have been added yet."
      />
    );
  }

  return (
    <View>
      {materials.map((material) => (
        <View key={material._id} style={cardStyle}>
          <View style={styles.row}>
            <View
              style={[styles.materialIcon, { backgroundColor: colors.background }]}
            >
              <Ionicons
                name={materialIcon(material.type) as any}
                size={24}
                color={colors.primary}
              />
            </View>

            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text
                style={[typography.reading.sm, { color: colors.text, fontWeight: "700" }]}
              >
                {material.title}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3 }}>
                {material.category || "General"} • {material.type}
              </Text>
            </View>
          </View>

          {material.description ? (
            <Text
              style={[
                typography.reading.sm,
                { color: colors.textMuted, marginTop: spacing.sm },
              ]}
            >
              {material.description}
            </Text>
          ) : null}

          {material.fileUrl ? (
            <Pressable
              onPress={() => openRemoteUrl(material.fileUrl as string)}
              style={{ marginTop: spacing.sm }}
            >
              <Text
                style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}
                numberOfLines={2}
              >
                {material.fileUrl}
              </Text>
            </Pressable>
          ) : null}

          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: spacing.sm }}>
            Added {formatRelativeTime(material.createdAt)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* =========================================================
   PEOPLE TAB
   ========================================================= */

function PeopleTab({
  classmates,
  cardStyle,
  colors,
}: {
  classmates: ApiEnrollment[];
  cardStyle: any;
  colors: ThemeColors;
}) {
  if (classmates.length === 0) {
    return (
      <EmptyText colors={colors} message="No other learners have joined yet." />
    );
  }

  return (
    <View>
      {classmates.map((enrollment) => (
        <View key={enrollment._id} style={[cardStyle, styles.row]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text
              style={{ color: colors.primaryText, fontWeight: "600", fontSize: 13 }}
            >
              {enrollment.learner.displayName?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>

          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text
              style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}
            >
              {enrollment.learner.displayName}
            </Text>

            {enrollment.streakDays > 0 && (
              <View style={styles.streakRow}>
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

function EmptyText({ colors, message }: { colors: ThemeColors; message: string }) {
  return (
    <Text
      style={[
        typography.reading.sm,
        {
          color: colors.textMuted,
          textAlign: "center",
          marginTop: spacing.lg,
          marginBottom: spacing.lg,
        },
      ]}
    >
      {message}
    </Text>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  edgeToEdge: {
    marginHorizontal: -spacing.md,
  },
  hero: {
    position: "relative",
    paddingHorizontal: spacing.md + 12,
    paddingTop: 8,
    paddingBottom: 15,
    borderBottomWidth: 1,
    overflow: "hidden",
  },
  heroAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  roundIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitleWrap: { flex: 1 },
  heroOverline: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 1,
  },
  heroTitle: { fontSize: 19, lineHeight: 24, fontWeight: "900" },
  heroInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
  },
  heroBadge: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  heroDescription: { fontSize: 12, lineHeight: 17 },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 9,
  },
  heroMetaText: { fontSize: 11, fontWeight: "600" },

  tabBar: {
    height: 56,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  tab: {
    flex: 1,
    height: 56,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    position: "relative",
    paddingHorizontal: 4,
  },
  tabText: { fontSize: 10.5, fontWeight: "700" },
  tabLine: {
    position: "absolute",
    bottom: 0,
    left: 12,
    right: 12,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  streamArea: { flex: 1, minHeight: 0, paddingTop: 16 },
  contentScroll: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 100,
  },
  pageHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  pageKicker: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  pageTitle: { fontSize: 24, lineHeight: 29, fontWeight: "900" },
  pageDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginBottom: 5,
    marginRight: 3,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  streakRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  materialIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: spacing.md,
  },
  filter: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  filterText: { fontSize: 10, fontWeight: "800" },

  classworkCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  classworkIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  classworkType: { fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  classworkTitle: { fontSize: 15, fontWeight: "900", marginTop: 2 },
  classworkDescription: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  classworkMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 6,
  },
  classworkMetaText: { fontSize: 10, fontWeight: "600" },

  empty: {
    alignItems: "center",
    paddingVertical: 35,
    paddingHorizontal: 25,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },
  emptyTitle: { fontSize: 17, fontWeight: "900", textAlign: "center" },
  emptyText: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 290,
  },
});