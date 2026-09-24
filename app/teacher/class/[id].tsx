import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Screen } from "../../components/Screen";
import { SegmentedControl } from "../../components/SegmentedControl";
import {
    ApiClass,
    ApiClasswork,
    ApiEnrollment,
    ApiStreamPost,
    ApiUser,
    createClasswork,
    createStreamPost,
    deleteClass,
    getClass,
    getClasswork,
    getLearners,
    getMyProfile,
    getProgress,
    getStream,
    updateClass,
} from "../../lib/api";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";

const TABS = ["Stream", "Classwork", "Learners", "Progress"] as const;
type Tab = (typeof TABS)[number];

// Same family of colors used for class cards on the dashboard, reused here
// as full banners. Picked deterministically from the class id so a given
// class always gets the same color across visits.
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

// "2m ago" / "3h ago" / "Yesterday" / "Sep 10" - same rhythm as Classroom's
// post timestamps, which fall back to a plain date after about a week.
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

export default function ClassDetail() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = id ?? "";

  const [activeTab, setActiveTab] = useState<Tab>("Stream");

  const [classInfo, setClassInfo] = useState<{ class: ApiClass; learnerCount: number } | null>(
    null
  );
  const [teacherProfile, setTeacherProfile] = useState<ApiUser | null>(null);
  const [streamPosts, setStreamPosts] = useState<ApiStreamPost[]>([]);
  const [classwork, setClasswork] = useState<ApiClasswork[]>([]);
  const [learners, setLearners] = useState<ApiEnrollment[]>([]);
  const [progress, setProgress] = useState<ApiEnrollment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  const [editVisible, setEditVisible] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadEverything = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const [info, profile, posts, work, learnerList, progressList] = await Promise.all([
        getClass(classId),
        getMyProfile(),
        getStream(classId),
        getClasswork(classId),
        getLearners(classId),
        getProgress(classId),
      ]);
      setClassInfo(info);
      setTeacherProfile(profile);
      setStreamPosts(posts);
      setClasswork(work);
      setLearners(learnerList);
      setProgress(progressList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this class.");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadEverything();
  }, [loadEverything]);

  const handleCopyCode = async () => {
    if (!classInfo?.class.code) return;
    await Clipboard.setStringAsync(classInfo.class.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openEditModal = () => {
    setEditTitle(classInfo?.class.title ?? "");
    setEditDescription(classInfo?.class.description ?? "");
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert("Title required", "Please enter a class title.");
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await updateClass(classId, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setClassInfo((prev) => (prev ? { ...prev, class: updated } : prev));
      setEditVisible(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Couldn't update class", message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleArchive = async () => {
    try {
      await deleteClass(classId);
      router.replace("/teacher/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Couldn't archive class", message);
    }
  };

  const confirmArchive = () => {
    Alert.alert(
      "Archive this class?",
      "It'll move to Archived Classes. You can restore it later.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Archive", style: "destructive", onPress: handleArchive },
      ]
    );
  };

  const openMenu = () => {
    Alert.alert(classInfo?.class.title ?? "Class options", undefined, [
      { text: "Edit class", onPress: openEditModal },
      { text: "Archive class", style: "destructive", onPress: confirmArchive },
      { text: "Cancel", style: "cancel" },
    ]);
  };

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
          <Pressable onPress={loadEverything}>
            <Text style={[typography.reading.sm, { color: colors.primary, fontWeight: "600" }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const banner = bannerForClassId(classId);

  return (
    <Screen>
      <View style={[styles.banner, { backgroundColor: banner.bg }]}>
        <View style={styles.bannerTopRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Pressable onPress={openMenu} hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </Pressable>
        </View>

        <Ionicons
          name="book"
          size={32}
          color="rgba(255,255,255,0.85)"
          style={{ marginBottom: spacing.xs ?? 8 }}
        />

        <Text style={[typography.display.lg, { color: "#fff" }]}>{classInfo?.class.title}</Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 2, marginBottom: spacing.sm }}>
          {classInfo?.learnerCount ?? 0} learners
        </Text>

        <Pressable
          onPress={handleCopyCode}
          style={[styles.codeChip, { backgroundColor: banner.accent }]}
        >
          <Text style={{ color: banner.bg, fontWeight: "700", letterSpacing: 2 }}>
            {classInfo?.class.code}
          </Text>
          <Ionicons
            name={copied ? "checkmark" : "copy-outline"}
            size={14}
            color={banner.bg}
            style={{ marginLeft: 6 }}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <SegmentedControl
          options={[...TABS]}
          selected={activeTab}
          onSelect={(option) => setActiveTab(option as Tab)}
          colors={colors}
        />

        {activeTab === "Stream" && (
          <StreamTab
            classId={classId}
            posts={streamPosts}
            cardStyle={cardStyle}
            colors={colors}
            onPosted={loadEverything}
            teacherProfile={teacherProfile}
          />
        )}

        {activeTab === "Classwork" && (
          <ClassworkTab
            classId={classId}
            items={classwork}
            cardStyle={cardStyle}
            colors={colors}
            onCreated={loadEverything}
          />
        )}

        {activeTab === "Learners" && (
          <LearnersTab learners={learners} cardStyle={cardStyle} colors={colors} />
        )}

        {activeTab === "Progress" && (
          <ProgressTab progress={progress} cardStyle={cardStyle} colors={colors} />
        )}
      </ScrollView>

      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[typography.display.sm, { color: colors.text, marginBottom: spacing.md }]}>
              Edit Class
            </Text>
            <TextInput
              placeholder="Class title"
              placeholderTextColor={colors.textMuted}
              value={editTitle}
              onChangeText={setEditTitle}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <TextInput
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              style={[
                styles.input,
                styles.multiline,
                { color: colors.text, borderColor: colors.border },
              ]}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
              <Pressable
                onPress={() => setEditVisible(false)}
                style={[styles.smallButton, { flex: 1, backgroundColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveEdit}
                disabled={savingEdit}
                style={[
                  styles.smallButton,
                  { flex: 1, backgroundColor: colors.primary, opacity: savingEdit ? 0.6 : 1 },
                ]}
              >
                <Text style={{ color: colors.primaryText, fontWeight: "600" }}>
                  {savingEdit ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// ---------- Stream tab ----------

function StreamTab({
  classId,
  posts,
  cardStyle,
  colors,
  onPosted,
  teacherProfile,
}: {
  classId: string;
  posts: ApiStreamPost[];
  cardStyle: any;
  colors: ReturnType<typeof useTheme>["colors"];
  onPosted: () => void;
  teacherProfile: ApiUser | null;
}) {
  const [composerVisible, setComposerVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const initials = teacherProfile?.displayName?.[0]?.toUpperCase() ?? "T";

  const handlePost = async () => {
    if (!title) return;
    setSubmitting(true);
    try {
      await createStreamPost(classId, { title, body: body || undefined });
      setTitle("");
      setBody("");
      setComposerVisible(false);
      onPosted();
    } catch {
      // Keep it simple for now - a toast/alert can replace this later.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      {/* Composer bar - mirrors Google Classroom's "Announce something to
          your class" row. Tapping it opens the full composer modal. */}
      <Pressable
        onPress={() => setComposerVisible(true)}
        style={[styles.composerBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.primaryText, fontWeight: "600", fontSize: 13 }}>
            {initials}
          </Text>
        </View>
        <Text style={[typography.reading.sm, { color: colors.textMuted, marginLeft: spacing.sm }]}>
          Announce something to your class
        </Text>
      </Pressable>

      {posts.length === 0 ? (
        <EmptyState colors={colors} message="No announcements yet." />
      ) : (
        posts.map((post) => (
          <View key={post._id} style={cardStyle}>
            <View style={styles.postHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={{ color: colors.primaryText, fontWeight: "600", fontSize: 13 }}>
                  {initials}
                </Text>
              </View>
              <View style={{ marginLeft: spacing.sm }}>
                <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
                  {teacherProfile?.displayName ?? "Teacher"}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {formatRelativeTime(post.createdAt)}
                </Text>
              </View>
            </View>

            <Text
              style={[
                typography.reading.sm,
                { color: colors.text, fontWeight: "600", marginTop: spacing.sm },
              ]}
            >
              {post.title}
            </Text>
            {post.body ? (
              <Text style={[typography.reading.sm, { color: colors.textMuted, marginTop: 4 }]}>
                {post.body}
              </Text>
            ) : null}
          </View>
        ))
      )}

      <Modal
        visible={composerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setComposerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[typography.display.sm, { color: colors.text, marginBottom: spacing.md }]}>
              Announce to class
            </Text>
            <TextInput
              placeholder="Announcement title"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <TextInput
              placeholder="Details (optional)"
              placeholderTextColor={colors.textMuted}
              value={body}
              onChangeText={setBody}
              multiline
              style={[
                styles.input,
                styles.multiline,
                { color: colors.text, borderColor: colors.border },
              ]}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
              <Pressable
                onPress={() => setComposerVisible(false)}
                style={[styles.smallButton, { flex: 1, backgroundColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handlePost}
                disabled={!title || submitting}
                style={[
                  styles.smallButton,
                  { flex: 1, backgroundColor: colors.primary, opacity: !title || submitting ? 0.6 : 1 },
                ]}
              >
                <Text style={{ color: colors.primaryText, fontWeight: "600" }}>
                  {submitting ? "Posting..." : "Post"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------- Classwork tab ----------

function ClassworkTab({
  classId,
  items,
  cardStyle,
  colors,
  onCreated,
}: {
  classId: string;
  items: ApiClasswork[];
  cardStyle: any;
  colors: ReturnType<typeof useTheme>["colors"];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!title) return;
    setSubmitting(true);
    try {
      await createClasswork(classId, { title, description: description || undefined });
      setTitle("");
      setDescription("");
      onCreated();
    } catch {
      // Keep it simple for now - a toast/alert can replace this later.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      <View style={cardStyle}>
        <TextInput
          placeholder="Assignment title"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />
        <TextInput
          placeholder="Description (optional)"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, styles.multiline, { color: colors.text, borderColor: colors.border }]}
        />
        <Pressable
          onPress={handleCreate}
          disabled={!title || submitting}
          style={[styles.smallButton, { backgroundColor: colors.primary, opacity: !title || submitting ? 0.6 : 1 }]}
        >
          <Text style={{ color: colors.primaryText, fontWeight: "600" }}>
            {submitting ? "Adding..." : "Add classwork"}
          </Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <EmptyState colors={colors} message="No classwork assigned yet." />
      ) : (
        items.map((item) => (
          <View key={item._id} style={[cardStyle, styles.row]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
                {item.title}
              </Text>
              {item.description ? (
                <Text style={[typography.reading.sm, { color: colors.textMuted, marginTop: 4 }]}>
                  {item.description}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        ))
      )}
    </View>
  );
}

// ---------- Learners tab ----------

function LearnersTab({
  learners,
  cardStyle,
  colors,
}: {
  learners: ApiEnrollment[];
  cardStyle: any;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  if (learners.length === 0) {
    return (
      <EmptyState
        colors={colors}
        message="No learners have joined yet. Share your class code so they can join."
      />
    );
  }

  return (
    <View>
      {learners.map((enrollment) => (
        <View key={enrollment._id} style={[cardStyle, styles.row]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={{ color: colors.primaryText, fontWeight: "600", fontSize: 13 }}>
              {enrollment.learner.displayName?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
              {enrollment.learner.displayName}
            </Text>
            <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
              {enrollment.streakDays}-day streak
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------- Progress tab ----------

function ProgressTab({
  progress,
  cardStyle,
  colors,
}: {
  progress: ApiEnrollment[];
  cardStyle: any;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  if (progress.length === 0) {
    return <EmptyState colors={colors} message="No progress data yet." />;
  }

  return (
    <View>
      {progress.map((enrollment) => (
        <View key={enrollment._id} style={cardStyle}>
          <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
            {enrollment.learner.displayName}
          </Text>
          <Text style={[typography.reading.sm, { color: colors.textMuted, marginTop: 4 }]}>
            {enrollment.comprehensionAvg}% comprehension
          </Text>
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  colors,
  message,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  message: string;
}) {
  return (
    <Text style={[typography.reading.sm, { color: colors.textMuted, textAlign: "center", marginTop: spacing.lg }]}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingTop: spacing.xl ?? 32,
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
    borderRadius: radius.sm ?? 8,
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  composerBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.lg ?? 20,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm ?? 8,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: 14,
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  smallButton: {
    borderRadius: radius.sm ?? 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: spacing.lg,
  },
  modalCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});