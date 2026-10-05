import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  ApiClasswork,
  createStreamPost,
  getStream,
} from "../../lib/api";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";

import CreatePostModal from "./CreatePostModal";
import TeacherPostCard, {
  TeacherPost,
} from "./TeacherPostCard";

interface ClassStreamProps {
  classId: string;
  teacherName?: string;
  classwork: ApiClasswork[];
}

type StreamItem =
  | {
      kind: "announcement";
      data: TeacherPost;
    }
  | {
      kind: "classwork";
      data: ApiClasswork;
    };

type ThemeColors = ReturnType<typeof useTheme>["colors"];

export default function ClassStream({
  classId,
  teacherName = "Teacher",
  classwork,
}: ClassStreamProps) {
  const { colors } = useTheme();

  const [posts, setPosts] = useState<TeacherPost[]>([]);
  const [filter, setFilter] =
    useState<"all" | "announcements">("all");

  const [modalVisible, setModalVisible] =
    useState(false);

  const [editingPost, setEditingPost] =
    useState<TeacherPost | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  /* =========================================================
     LOAD ANNOUNCEMENTS FROM BACKEND
     ========================================================= */

  const loadPosts = async () => {
    try {
      setLoading(true);

      const backendPosts = await getStream(classId);

      const mappedPosts: TeacherPost[] =
        backendPosts.map((post) => ({
          id: post._id,
          classId: post.class,
          type: "announcement",
          title: post.title,
          message: post.body ?? "",
          teacherName,
          createdAt: post.createdAt,
          status: "published",
        }));

      setPosts(mappedPosts);
    } catch (err) {
      console.error(
        "Failed to load stream posts:",
        err
      );

      Alert.alert(
        "Couldn't load announcements",
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the class stream."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [classId]);

  /* =========================================================
     SAVE ANNOUNCEMENT
     ========================================================= */

  const savePost = async (
    post: Omit<TeacherPost, "id" | "createdAt">
  ) => {
    /*
     * IMPORTANT:
     *
     * Comments require the REAL MongoDB StreamPost _id.
     *
     * So new announcements are created through
     * createStreamPost() instead of generating a local ID.
     */

    if (editingPost) {
      /*
       * Editing is still local for now because the current
       * backend StreamPost API only has GET and POST.
       *
       * We reload the stream after closing the modal so the
       * existing backend data remains the source of truth.
       */

      setPosts((previous) =>
        previous.map((item) =>
          item.id === editingPost.id
            ? {
                ...item,
                ...post,
              }
            : item
        )
      );

      closeModal();
      return;
    }

    try {
      setSaving(true);

      const created = await createStreamPost(
        classId,
        {
          title: post.title,
          body: post.message ?? "",
        }
      );

      const newPost: TeacherPost = {
        id: created._id,
        classId: created.class,
        type: "announcement",
        title: created.title,
        message: created.body ?? "",
        teacherName,
        createdAt: created.createdAt,
        status: "published",
      };

      setPosts((previous) => [
        newPost,
        ...previous,
      ]);

      closeModal();
    } catch (err) {
      console.error(
        "Failed to create stream post:",
        err
      );

      Alert.alert(
        "Couldn't post announcement",
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the announcement."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     EDIT
     ========================================================= */

  const handleEdit = (post: TeacherPost) => {
    setEditingPost(post);
    setModalVisible(true);
  };

  /* =========================================================
     DELETE
     ========================================================= */

  const handleDelete = (post: TeacherPost) => {
    Alert.alert(
      "Delete announcement?",
      `Are you sure you want to delete "${post.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            /*
             * NOTE:
             * Current backend does not yet have a DELETE
             * StreamPost endpoint.
             *
             * For now this removes it from the current UI only.
             */

            setPosts((previous) =>
              previous.filter(
                (item) => item.id !== post.id
              )
            );
          },
        },
      ]
    );
  };

  /* =========================================================
     OPEN CREATE
     ========================================================= */

  const openCreate = () => {
    setEditingPost(null);
    setModalVisible(true);
  };

  /* =========================================================
     CLOSE MODAL
     ========================================================= */

  const closeModal = () => {
    setModalVisible(false);
    setEditingPost(null);
  };

  /* =========================================================
     STREAM ITEMS
     ========================================================= */

  const streamItems = useMemo<StreamItem[]>(() => {
    const announcements: StreamItem[] =
      posts.map((post) => ({
        kind: "announcement",
        data: post,
      }));

    const workItems: StreamItem[] =
      filter === "all"
        ? classwork.map((item) => ({
            kind: "classwork",
            data: item,
          }))
        : [];

    return [
      ...announcements,
      ...workItems,
    ].sort((a, b) => {
      const aTime = new Date(
        a.data.createdAt
      ).getTime();

      const bTime = new Date(
        b.data.createdAt
      ).getTime();

      return bTime - aTime;
    });
  }, [posts, classwork, filter]);

  /* =========================================================
     RENDER ITEM
     ========================================================= */

  const renderItem = ({
    item,
  }: {
    item: StreamItem;
  }) => {
    if (item.kind === "announcement") {
      return (
        <TeacherPostCard
  post={item.data}
  onPress={(selectedPost) => {
  router.push(
    `/teacher/class/announcement/${selectedPost.id}?classId=${selectedPost.classId}`
  );
}}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
      );
    }

    return (
      <ClassworkStreamCard
        item={item.data}
        colors={colors}
      />
    );
  };

  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="small"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color: colors.textMuted,
            },
          ]}
        >
          Loading class stream...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text
            style={[
              styles.kicker,
              {
                color: colors.primary,
              },
            ]}
          >
            CLASS STREAM
          </Text>

          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}
          >
            Updates
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textMuted,
              },
            ]}
          >
            Announcements and new classwork
          </Text>
        </View>

        <Pressable
          onPress={openCreate}
          disabled={saving}
          style={[
            styles.createButton,
            {
              backgroundColor: colors.primary,
              borderColor: colors.primaryShadow,
              opacity: saving ? 0.6 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color={colors.primaryText}
            />
          ) : (
            <Ionicons
              name="add"
              size={20}
              color={colors.primaryText}
            />
          )}

          <Text
            style={[
              styles.createButtonText,
              {
                color: colors.primaryText,
              },
            ]}
          >
            {saving ? "Posting..." : "Post"}
          </Text>
        </Pressable>
      </View>

      {/* FILTERS */}

      <View style={styles.filters}>
        <FilterButton
          label="All"
          selected={filter === "all"}
          onPress={() => setFilter("all")}
          colors={colors}
        />

        <FilterButton
          label="Announcements"
          selected={filter === "announcements"}
          onPress={() =>
            setFilter("announcements")
          }
          colors={colors}
        />
      </View>

      {/* FEED */}

      <FlatList
        data={streamItems}
        keyExtractor={(item) =>
          item.kind === "announcement"
            ? `announcement-${item.data.id}`
            : `classwork-${item.data._id}`
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          streamItems.length === 0
            ? styles.emptyContainer
            : styles.listContent
        }
        ListEmptyComponent={
          <EmptyStream
            colors={colors}
            onCreate={openCreate}
          />
        }
      />

      {/* CREATE ANNOUNCEMENT */}

      <CreatePostModal
        visible={modalVisible}
        classId={classId}
        editingPost={editingPost}
        onClose={closeModal}
        onSave={savePost}
      />
    </View>
  );
}

/* =========================================================
   FILTER BUTTON
   ========================================================= */

function FilterButton({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterButton,
        {
          backgroundColor: selected
            ? colors.primary
            : colors.surface,
          borderColor: selected
            ? colors.primary
            : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.filterText,
          {
            color: selected
              ? colors.primaryText
              : colors.textMuted,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* =========================================================
   CLASSWORK STREAM CARD
   ========================================================= */

function ClassworkStreamCard({
  item,
  colors,
}: {
  item: ApiClasswork;
  colors: ThemeColors;
}) {
  const [expanded, setExpanded] =
    useState(false);

  const type = getClassworkType(item.type);

  const description =
    item.description?.trim() || "";

  const attachment = item.attachment;

  const openAttachment = async () => {
    if (!attachment?.url) {
      return;
    }

    const url = getAttachmentUrl(
      attachment.url
    );

    try {
      const supported =
        await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert(
          "Cannot open file",
          "This file cannot be opened on this device."
        );
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Cannot open file",
        "Unable to open the attachment."
      );
    }
  };

  return (
    <View style={styles.classworkWrapper}>
      {/* SHADOW */}

      <View
        style={[
          styles.classworkShadow,
          {
            backgroundColor:
              colors.primaryShadow,
          },
        ]}
      />

      {/* CARD */}

      <View
        style={[
          styles.classworkCard,
          {
            backgroundColor: colors.primary,
            borderColor: colors.primaryShadow,
          },
        ]}
      >
        {/* HEADER */}

        <View style={styles.classworkHeader}>
          <View
            style={[
              styles.classworkIcon,
              {
                backgroundColor:
                  colors.primaryText,
              },
            ]}
          >
            <Ionicons
              name={getClassworkIcon(item.type)}
              size={20}
              color={colors.primary}
            />
          </View>

          <View style={styles.classworkHeaderText}>
            <Text
              style={[
                styles.classworkLabel,
                {
                  color:
                    colors.primaryText,
                },
              ]}
            >
              NEW CLASSWORK
            </Text>

            <Text
              style={[
                styles.classworkType,
                {
                  color:
                    colors.primaryText,
                },
              ]}
            >
              {type}
            </Text>
          </View>

          <Text
            style={[
              styles.dateText,
              {
                color:
                  colors.primaryText,
              },
            ]}
          >
            {formatRelativeTime(
              item.createdAt
            )}
          </Text>
        </View>

        {/* TITLE */}

        <Text
          style={[
            styles.classworkTitle,
            {
              color:
                colors.primaryText,
            },
          ]}
        >
          {item.title}
        </Text>

        {/* DESCRIPTION */}

        {description ? (
          <Text
            numberOfLines={
              expanded ? undefined : 3
            }
            style={[
              styles.classworkDescription,
              {
                color:
                  colors.primaryText,
              },
            ]}
          >
            {description}
          </Text>
        ) : null}

        {/* META */}

        <View style={styles.metaRow}>
          {item.dueDate ? (
            <View style={styles.classworkMeta}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={colors.primaryText}
              />

              <Text
                style={[
                  styles.metaText,
                  {
                    color:
                      colors.primaryText,
                  },
                ]}
              >
                Due{" "}
                {formatDueDate(
                  item.dueDate
                )}
              </Text>
            </View>
          ) : null}

          {item.points > 0 ? (
            <View style={styles.classworkMeta}>
              <Ionicons
                name="trophy-outline"
                size={15}
                color={colors.primaryText}
              />

              <Text
                style={[
                  styles.metaText,
                  {
                    color:
                      colors.primaryText,
                  },
                ]}
              >
                {item.points}{" "}
                {item.points === 1
                  ? "point"
                  : "points"}
              </Text>
            </View>
          ) : null}
        </View>

        {/* READING ACTIVITIES */}

        {item.type === "reading" &&
        item.readingActivities?.length ? (
          <View style={styles.activityContainer}>
            {item.readingActivities.includes(
              "read-aloud"
            ) ? (
              <View
                style={[
                  styles.activityBadge,
                  {
                    backgroundColor:
                      colors.primaryText,
                  },
                ]}
              >
                <Ionicons
                  name="mic-outline"
                  size={14}
                  color={colors.primary}
                />

                <Text
                  style={[
                    styles.activityBadgeText,
                    {
                      color:
                        colors.primary,
                    },
                  ]}
                >
                  Read Aloud
                </Text>
              </View>
            ) : null}

            {item.readingActivities.includes(
              "comprehension"
            ) ? (
              <View
                style={[
                  styles.activityBadge,
                  {
                    backgroundColor:
                      colors.primaryText,
                  },
                ]}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={14}
                  color={colors.primary}
                />

                <Text
                  style={[
                    styles.activityBadgeText,
                    {
                      color:
                        colors.primary,
                    },
                  ]}
                >
                  Comprehension
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ATTACHMENT */}

        {attachment?.name ? (
          <Pressable
            onPress={openAttachment}
            style={[
              styles.attachmentButton,
              {
                backgroundColor:
                  colors.primaryText,
              },
            ]}
          >
            <Ionicons
              name="document-attach-outline"
              size={19}
              color={colors.primary}
            />

            <View style={styles.attachmentInfo}>
              <Text
                numberOfLines={1}
                style={[
                  styles.attachmentName,
                  {
                    color:
                      colors.primary,
                  },
                ]}
              >
                {attachment.name}
              </Text>

              <Text
                style={[
                  styles.attachmentAction,
                  {
                    color:
                      colors.primary,
                  },
                ]}
              >
                Tap to open
              </Text>
            </View>

            <Ionicons
              name="open-outline"
              size={18}
              color={colors.primary}
            />
          </Pressable>
        ) : null}

        {/* EXPANDED DETAILS */}

        {expanded ? (
          <View
            style={[
              styles.expandedDetails,
              {
                backgroundColor:
                  colors.primaryText,
              },
            ]}
          >
            <Text
              style={[
                styles.detailsHeading,
                {
                  color:
                    colors.primary,
                },
              ]}
            >
              CLASSWORK DETAILS
            </Text>

            <DetailRow
              label="TYPE"
              value={type}
              colors={colors}
            />

            <DetailRow
              label="INSTRUCTIONS"
              value={
                description ||
                "No instructions provided."
              }
              colors={colors}
              muted={!description}
            />

            {item.dueDate ? (
              <DetailRow
                label="DUE DATE"
                value={formatDueDateTime(
                  item.dueDate
                )}
                colors={colors}
              />
            ) : null}

            {item.points > 0 ? (
              <DetailRow
                label="POINTS"
                value={`${item.points} ${
                  item.points === 1
                    ? "point"
                    : "points"
                }`}
                colors={colors}
              />
            ) : null}

            {item.type === "reading" &&
            item.readingActivities?.length ? (
              <DetailRow
                label="READING ACTIVITIES"
                value={formatReadingActivities(
                  item.readingActivities
                )}
                colors={colors}
              />
            ) : null}

            {item.type === "quiz" ? (
              <DetailRow
                label="QUIZ"
                value={`${item.questions?.length ?? 0} ${
                  (item.questions?.length ?? 0) ===
                  1
                    ? "question"
                    : "questions"
                }`}
                colors={colors}
              />
            ) : null}

            <DetailRow
              label="ASSIGNED TO"
              value={
                item.assignToAll
                  ? "All learners"
                  : `${item.assignedTo?.length ?? 0} selected learner${
                      (item.assignedTo?.length ??
                        0) === 1
                        ? ""
                        : "s"
                    }`
              }
              colors={colors}
            />

            {attachment?.name ? (
              <DetailRow
                label="ATTACHMENT"
                value={attachment.name}
                colors={colors}
              />
            ) : null}
          </View>
        ) : null}

        {/* VIEW BUTTON */}

        <Pressable
          onPress={() =>
            setExpanded(
              (previous) => !previous
            )
          }
          style={[
            styles.viewClassworkButton,
            {
              backgroundColor:
                colors.primaryText,
            },
          ]}
        >
          <Text
            style={[
              styles.viewClassworkText,
              {
                color:
                  colors.primary,
              },
            ]}
          >
            {expanded
              ? "Show Less"
              : "View Classwork"}
          </Text>

          <Ionicons
            name={
              expanded
                ? "chevron-up"
                : "chevron-forward"
            }
            size={17}
            color={colors.primary}
          />
        </Pressable>
      </View>
    </View>
  );
}

/* =========================================================
   DETAIL ROW
   ========================================================= */

function DetailRow({
  label,
  value,
  colors,
  muted = false,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
  muted?: boolean;
}) {
  return (
    <View style={styles.detailSection}>
      <Text
        style={[
          styles.detailLabel,
          {
            color: colors.primary,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.detailText,
          {
            color: colors.primary,
            opacity: muted ? 0.6 : 1,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   EMPTY STREAM
   ========================================================= */

function EmptyStream({
  colors,
  onCreate,
}: {
  colors: ThemeColors;
  onCreate: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View
        style={[
          styles.emptyIcon,
          {
            backgroundColor:
              colors.surface,
            borderColor:
              colors.border,
          },
        ]}
      >
        <Ionicons
          name="megaphone-outline"
          size={28}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.emptyTitle,
          {
            color: colors.text,
          },
        ]}
      >
        No updates yet
      </Text>

      <Text
        style={[
          styles.emptyText,
          {
            color:
              colors.textMuted,
          },
        ]}
      >
        Post an announcement or publish
        classwork to start your class
        stream.
      </Text>

      <Pressable
        onPress={onCreate}
        style={[
          styles.emptyButton,
          {
            backgroundColor:
              colors.primary,
          },
        ]}
      >
        <Ionicons
          name="add"
          size={18}
          color={colors.primaryText}
        />

        <Text
          style={[
            styles.emptyButtonText,
            {
              color:
                colors.primaryText,
            },
          ]}
        >
          Create Announcement
        </Text>
      </Pressable>
    </View>
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function getClassworkType(
  type: ApiClasswork["type"]
) {
  switch (type) {
    case "reading":
      return "Reading Assignment";

    case "activity":
      return "Activity";

    case "quiz":
      return "Quiz";

    default:
      return "Classwork";
  }
}

function getClassworkIcon(
  type: ApiClasswork["type"]
): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "reading":
      return "book-outline";

    case "activity":
      return "create-outline";

    case "quiz":
      return "help-circle-outline";

    default:
      return "clipboard-outline";
  }
}

function getAttachmentUrl(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `http://192.168.18.86:4000${
    url.startsWith("/") ? "" : "/"
  }${url}`;
}

function formatRelativeTime(
  dateString: string
) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs =
    Date.now() - date.getTime();

  const diffMins = Math.floor(
    diffMs / 60000
  );

  const diffHours = Math.floor(
    diffMins / 60
  );

  const diffDays = Math.floor(
    diffHours / 24
  );

  if (diffMins < 1) {
    return "Just now";
  }

  if (diffMins < 60) {
    return `${diffMins}m`;
  }

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays}d`;
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    }
  );
}

function formatDueDate(
  dateString: string
) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function formatDueDateTime(
  dateString: string
) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function formatReadingActivities(
  activities: NonNullable<
    ApiClasswork["readingActivities"]
  >
) {
  return activities
    .map((activity) =>
      activity === "read-aloud"
        ? "Read Aloud"
        : "Comprehension"
    )
    .join(" + ");
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  loadingText: {
    fontSize: 12,
    fontWeight: "700",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  headerText: {
    flex: 1,
  },

  kicker: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  title: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 1,
  },

  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },

  createButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },

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

  filterText: {
    fontSize: 11,
    fontWeight: "800",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  emptyContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 80,
  },

  /* CLASSWORK */

  classworkWrapper: {
    position: "relative",
    marginBottom: spacing.lg,
  },

  classworkShadow: {
    position: "absolute",
    top: 5,
    left: 0,
    right: 0,
    bottom: -5,
    borderRadius: radius.lg,
  },

  classworkCard: {
    borderWidth: 3,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },

  classworkHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  classworkIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  classworkHeaderText: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  classworkLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  classworkType: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },

  dateText: {
    fontSize: 10,
    fontWeight: "700",
    opacity: 0.75,
  },

  classworkTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "900",
    marginTop: spacing.md,
  },

  classworkDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: spacing.md,
  },

  classworkMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  metaText: {
    fontSize: 11,
    fontWeight: "800",
  },

  /* ACTIVITIES */

  activityContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: spacing.md,
  },

  activityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  activityBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },

  /* ATTACHMENT */

  attachmentButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginTop: spacing.md,
  },

  attachmentInfo: {
    flex: 1,
    marginLeft: 8,
  },

  attachmentName: {
    fontSize: 11,
    fontWeight: "900",
  },

  attachmentAction: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
    opacity: 0.65,
  },

  /* DETAILS */

  expandedDetails: {
    borderRadius: 12,
    padding: 13,
    marginTop: spacing.md,
  },

  detailsHeading: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
  },

  detailSection: {
    marginBottom: 10,
  },

  detailLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
    opacity: 0.65,
    marginBottom: 2,
  },

  detailText: {
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
  },

  /* VIEW BUTTON */

  viewClassworkButton: {
    marginTop: spacing.md,
    minHeight: 43,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  viewClassworkText: {
    fontSize: 12,
    fontWeight: "900",
  },

  /* EMPTY */

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

  emptyTitle: {
    fontSize: 19,
    fontWeight: "900",
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 300,
  },

  emptyButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  emptyButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
});