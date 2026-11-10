import { ClassroomLibrary } from '../../../components/library/ClassroomLibrary';
import { LearnerQuizList } from '../../../components/progress/LearnerQuizList';
import { ClassroomHeader, ClassroomTabs, classroomAccents } from "../../../components/ClassroomChrome";
import { TextAction } from "../../components/InterfaceChrome";
// app/learner/class/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
} from "../../components/learner/ClassworkDetailsSheet";
import LearnerClassStream from "../../components/learner/LearnerClassStream";
import { Screen } from "../../components/Screen";
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
import { spacing, typography } from "../../theme/tokens";

/* =========================================================
   CONSTANTS + HELPERS
   ========================================================= */

const TABS = ["Stream", "Classwork", "Library", "People"] as const;
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
        const [info, streamPosts, work, mates] =
          await Promise.all([
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

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Reading + activity classwork opens the full-screen view (in-app file
  // viewer + "Read now" recorder). Quizzes still use the details sheet.
  const openClasswork = useCallback(
    (item: ApiClasswork) => {
      if (item.type === "quiz") {
        router.push({ pathname: '/learner/quiz/[id]', params: { id: item._id, classId } });
        return;
      }

      router.push({
        pathname: "/learner/classwork/[id]",
        params: { id: item._id, classId },
      });
    },
    [classId]
  );


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
          <TextAction icon="refresh" onPress={() => load()}>
            <Text
              style={[
                typography.reading.sm,
                { color: colors.primary, fontWeight: "700" },
              ]}
            >
              Try again
            </Text>
          </TextAction>
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
            onOpenClasswork={openClasswork}
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
        {activeTab === "Classwork" && (
          <ClassworkTab
            classId={classId}
            items={classwork}
            colors={colors}
            onOpen={openClasswork}
          />
        )}
        {activeTab === "Library" && (
          <ClassroomLibrary classId={classId} role="learner" />
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
      <ClassroomHeader role="Learner" title={classInfo?.class.title ?? "Classroom"}
        description={classInfo?.class.description} count={classInfo?.learnerCount ?? 0}
        onBack={() => router.back()} />
      <ClassroomTabs tabs={TABS} active={activeTab} onSelect={setActiveTab} />

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
  classId,
  items,
  colors,
  onOpen,
}: {
  classId: string;
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

      {selectedFilter === "quiz" ? <LearnerQuizList classId={classId} items={items} onOpenStandalone={onOpen} /> : filtered.length === 0 ? (
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
              { backgroundColor: colors.background === "#FFFFFF" ? classroomAccents[item.type].fill : colors.surface, borderColor: classroomAccents[item.type].ink },
            ]}
          >
            <View style={[styles.classworkIcon, { backgroundColor: classroomAccents[item.type].ink }]}>
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

                {item.attachment?.name ? (
                  <>
                    <Ionicons name="attach" size={12} color={colors.textMuted} />
                    <Text
                      style={[styles.classworkMetaText, { color: colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {item.attachment.name}
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

  streamArea: { flex: 1, minHeight: 0, paddingTop: 16 },
  contentScroll: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 100,
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
  classworkTitle: { fontFamily: "Fredoka_600SemiBold", fontSize: 15, fontWeight: "900", marginTop: 2 },
  classworkDescription: { fontFamily: "AtkinsonHyperlegible_400Regular", fontSize: 11, lineHeight: 16, marginTop: 3 },
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
