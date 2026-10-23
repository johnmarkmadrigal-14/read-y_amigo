import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ApiPostComment,
  ApiStreamPost,
  ApiUser,
  createPostComment,
  deletePostComment,
  getLearnerStreamPost,
  getPostComments,
  getStoredUser,
  updatePostComment,
} from "../../../lib/api";
import { useTheme } from "../../../theme/ThemeProvider";
import { radius, spacing } from "../../../theme/tokens";

type PersonRef =
  | string
  | {
      _id: string;
      displayName?: string;
      firstName?: string;
      secondName?: string;
      role?: "teacher" | "learner";
    };

function personName(person: PersonRef, fallback: string) {
  if (typeof person === "object" && person !== null) {
    return (
      person.displayName ||
      `${person.firstName ?? ""} ${person.secondName ?? ""}`.trim() ||
      fallback
    );
  }
  return fallback;
}

export default function LearnerAnnouncementScreen() {
  const { colors } = useTheme();

  const params = useLocalSearchParams<{
    id?: string | string[];
    classId?: string | string[];
  }>();

  const postId = Array.isArray(params.id) ? params.id[0] : params.id;
  const classId = Array.isArray(params.classId)
    ? params.classId[0]
    : params.classId;

  const [post, setPost] = useState<ApiStreamPost | null>(null);
  const [comments, setComments] = useState<ApiPostComment[]>([]);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    (async () => {
      if (!postId || !classId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const [user, announcement, postComments] = await Promise.all([
          getStoredUser(),
          getLearnerStreamPost(classId, postId),
          getPostComments(classId, postId),
        ]);

        setCurrentUser(user);
        setPost(announcement);
        setComments(postComments);
      } catch (error) {
        console.error("Failed to load announcement:", error);
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Unable to load this announcement."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [postId, classId]);

  const postedAt = useMemo(() => {
    if (!post?.createdAt) return "";
    const date = new Date(post.createdAt);
    if (Number.isNaN(date.getTime())) return "";

    return `${date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })} • ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }, [post?.createdAt]);

  const isMine = (comment: ApiPostComment) => {
    if (!currentUser?._id) return false;
    const authorId =
      typeof comment.author === "string" ? comment.author : comment.author._id;
    return authorId === currentUser._id;
  };

  const isTeacher = (comment: ApiPostComment) =>
    typeof comment.author === "object" && comment.author.role === "teacher";

  const sendComment = async () => {
    const trimmed = commentText.trim();
    if (!classId || !postId || !trimmed) return;

    try {
      setSending(true);
      const created = await createPostComment(classId, postId, trimmed);
      setComments((previous) => [...previous, created]);
      setCommentText("");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Unable to post your comment."
      );
    } finally {
      setSending(false);
    }
  };

  const saveEdit = async () => {
    const trimmed = editingText.trim();
    if (!classId || !postId || !editingId) return;

    if (!trimmed) {
      Alert.alert("Invalid comment", "Comment cannot be empty.");
      return;
    }

    try {
      setBusy(true);
      const updated = await updatePostComment(
        classId,
        postId,
        editingId,
        trimmed
      );
      setComments((previous) =>
        previous.map((c) => (c._id === editingId ? updated : c))
      );
      setEditingId(null);
      setEditingText("");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Unable to update your comment."
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (comment: ApiPostComment) => {
    if (!classId || !postId) return;

    Alert.alert("Delete comment?", "This comment will be permanently removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setBusy(true);
            await deletePostComment(classId, postId, comment._id);
            setComments((previous) =>
              previous.filter((c) => c._id !== comment._id)
            );
          } catch (error) {
            Alert.alert(
              "Error",
              error instanceof Error
                ? error.message
                : "Unable to delete the comment."
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  /* LOADING */
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.centerText, { color: colors.textMuted }]}>
          Loading announcement...
        </Text>
      </View>
    );
  }

  /* NOT FOUND */
  if (!classId || !post) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.notFoundTitle, { color: colors.text }]}>
          Announcement not found
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: colors.primaryText, fontWeight: "700" }}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* HEADER */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            Announcement
          </Text>

          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ANNOUNCEMENT CARD */}
          <View
            style={[
              styles.announcementCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.authorRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Ionicons name="person" size={21} color={colors.primaryText} />
              </View>

              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.authorName, { color: colors.text }]}>
                    {personName(post.author, "Teacher")}
                  </Text>
                  <View
                    style={[styles.teacherBadge, { backgroundColor: colors.primary + "18" }]}
                  >
                    <Text style={[styles.teacherBadgeText, { color: colors.primary }]}>
                      Teacher
                    </Text>
                  </View>
                </View>

                <Text style={[styles.date, { color: colors.textMuted }]}>
                  {postedAt}
                </Text>
              </View>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>

            {!!post.body && (
              <Text style={[styles.body, { color: colors.text }]}>{post.body}</Text>
            )}
          </View>

          {/* COMMENTS HEADER */}
          <View style={styles.commentsHeader}>
            <View style={styles.row}>
              <Ionicons name="chatbubbles-outline" size={21} color={colors.primary} />
              <Text style={[styles.commentsTitle, { color: colors.text }]}>
                Comments
              </Text>
            </View>
            <Text style={[styles.commentCount, { color: colors.textMuted }]}>
              {comments.length}
            </Text>
          </View>

          {/* COMMENTS */}
          {comments.length === 0 ? (
            <View
              style={[
                styles.emptyComments,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={34}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No comments yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Be the first to comment.
              </Text>
            </View>
          ) : (
            comments.map((comment) => {
              const mine = isMine(comment);
              const teacher = isTeacher(comment);
              const editing = editingId === comment._id;

              return (
                <View
                  key={comment._id}
                  style={[
                    styles.commentCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.row}>
                    <View
                      style={[
                        styles.commentAvatar,
                        { backgroundColor: teacher ? colors.primary : colors.background },
                      ]}
                    >
                      <Ionicons
                        name="person"
                        size={16}
                        color={teacher ? colors.primaryText : colors.textMuted}
                      />
                    </View>

                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.commentAuthor, { color: colors.text }]}>
                          {personName(comment.author, "User")}
                        </Text>
                        {teacher && (
                          <View
                            style={[
                              styles.smallBadge,
                              { backgroundColor: colors.primary + "18" },
                            ]}
                          >
                            <Text style={[styles.smallBadgeText, { color: colors.primary }]}>
                              Teacher
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.commentDate, { color: colors.textMuted }]}>
                        {new Date(comment.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                    </View>

                    {mine && !editing && (
                      <View style={styles.row}>
                        <Pressable
                          onPress={() => {
                            setEditingId(comment._id);
                            setEditingText(comment.body);
                          }}
                          hitSlop={8}
                        >
                          <Ionicons name="create-outline" size={19} color={colors.textMuted} />
                        </Pressable>

                        <Pressable
                          onPress={() => confirmDelete(comment)}
                          hitSlop={8}
                          style={{ marginLeft: spacing.sm }}
                        >
                          <Ionicons name="trash-outline" size={19} color="#D94A4A" />
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {editing ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        value={editingText}
                        onChangeText={setEditingText}
                        multiline
                        placeholder="Edit your comment..."
                        placeholderTextColor={colors.textMuted}
                        style={[
                          styles.editInput,
                          {
                            color: colors.text,
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                          },
                        ]}
                      />

                      <View style={styles.editButtons}>
                        <Pressable
                          onPress={() => {
                            setEditingId(null);
                            setEditingText("");
                          }}
                          style={[styles.cancelButton, { borderColor: colors.border }]}
                        >
                          <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>
                            Cancel
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={saveEdit}
                          disabled={busy}
                          style={[styles.saveButton, { backgroundColor: colors.primary }]}
                        >
                          {busy ? (
                            <ActivityIndicator size="small" color={colors.primaryText} />
                          ) : (
                            <Text
                              style={{ color: colors.primaryText, fontWeight: "700", fontSize: 13 }}
                            >
                              Save
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Text style={[styles.commentBody, { color: colors.text }]}>
                      {comment.body}
                    </Text>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* COMMENT INPUT */}
        <View
          style={[
            styles.commentInputArea,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={1000}
              style={[styles.commentInput, { color: colors.text }]}
            />

            <Pressable
              onPress={sendComment}
              disabled={sending || !commentText.trim()}
              style={[
                styles.sendButton,
                {
                  backgroundColor: commentText.trim() ? colors.primary : colors.border,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.primaryText} />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={commentText.trim() ? colors.primaryText : colors.textMuted}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  centerText: { marginTop: spacing.md, fontSize: 14 },
  notFoundTitle: { marginTop: spacing.md, fontSize: 18, fontWeight: "700" },
  backButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },

  row: { flexDirection: "row", alignItems: "center" },

  header: {
    height: 58,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  headerBack: { padding: 4 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    marginHorizontal: spacing.sm,
  },

  scrollContent: { padding: spacing.md },

  announcementCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  authorRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  authorName: { fontSize: 15, fontWeight: "700" },
  teacherBadge: {
    marginLeft: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  teacherBadgeText: { fontSize: 10, fontWeight: "700" },
  date: { fontSize: 12, marginTop: 3 },
  title: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "800",
    marginTop: spacing.lg,
  },
  body: { fontSize: 15, lineHeight: 24, marginTop: spacing.md },

  commentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  commentsTitle: { fontSize: 18, fontWeight: "800", marginLeft: spacing.sm },
  commentCount: { fontSize: 14, fontWeight: "600" },

  emptyComments: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", marginTop: spacing.sm },
  emptySubtitle: { fontSize: 13, marginTop: 4 },

  commentCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAuthor: { fontSize: 13, fontWeight: "700" },
  smallBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  smallBadgeText: { fontSize: 9, fontWeight: "700" },
  commentDate: { fontSize: 11, marginTop: 2 },
  commentBody: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    marginLeft: 42,
  },

  editContainer: { marginTop: spacing.sm, marginLeft: 42 },
  editInput: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 14,
    textAlignVertical: "top",
  },
  editButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveButton: {
    minWidth: 65,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm,
  },

  commentInputArea: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputWrapper: {
    minHeight: 46,
    maxHeight: 110,
    borderWidth: 1,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: spacing.sm,
    paddingRight: 5,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    textAlignVertical: "top",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});