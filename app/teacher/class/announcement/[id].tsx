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

import {
  ApiPostComment,
  ApiStreamPost,
  createPostComment,
  deletePostComment,
  getPostComments,
  getStoredUser,
  getStreamPost,
  updatePostComment,
} from "../../../lib/api";

import { useTheme } from "../../../theme/ThemeProvider";
import {
  radius,
  spacing,
} from "../../../theme/tokens";

export default function AnnouncementDetailsScreen() {
  const { colors } = useTheme();

  const params = useLocalSearchParams<{
    id?: string | string[];
    classId?: string | string[];
  }>();

  // Announcement/Post ID
  const postId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  // Class ID
  const classId = Array.isArray(params.classId)
    ? params.classId[0]
    : params.classId;

  const [post, setPost] =
    useState<ApiStreamPost | null>(null);

  const [comments, setComments] =
    useState<ApiPostComment[]>([]);

  const [currentUser, setCurrentUser] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [commentLoading, setCommentLoading] =
    useState(false);

  const [commentText, setCommentText] =
    useState("");

  const [editingCommentId, setEditingCommentId] =
    useState<string | null>(null);

  const [editingText, setEditingText] =
    useState("");

  /*
   * LOAD ANNOUNCEMENT + COMMENTS + USER
   */
  const loadData = async () => {
    if (!postId || !classId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [
        storedUser,
        announcement,
        postComments,
      ] = await Promise.all([
        getStoredUser(),
        getStreamPost(classId, postId),
        getPostComments(classId, postId),
      ]);

      setCurrentUser(storedUser);
      setPost(announcement);
      setComments(postComments);
    } catch (error) {
      console.error(
        "Failed to load announcement:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to load this announcement."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [postId, classId]);

  /*
   * DATE
   */
  const formattedDate = useMemo(() => {
    if (!post?.createdAt) {
      return "";
    }

    const date = new Date(post.createdAt);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [post?.createdAt]);

  /*
   * TIME
   */
  const formattedTime = useMemo(() => {
    if (!post?.createdAt) {
      return "";
    }

    const date = new Date(post.createdAt);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }, [post?.createdAt]);

  /*
   * GET ANNOUNCEMENT AUTHOR NAME
   *
   * Works when backend returns:
   *
   * author: {
   *   _id,
   *   displayName,
   *   firstName,
   *   secondName,
   *   role
   * }
   */
  const getAuthorName = () => {
    if (!post) {
      return "Teacher";
    }

    if (
      typeof post.author === "object" &&
      post.author !== null
    ) {
      return (
        post.author.displayName ||
        `${post.author.firstName ?? ""} ${
          post.author.secondName ?? ""
        }`.trim() ||
        "Teacher"
      );
    }

    return "Teacher";
  };

  /*
   * GET COMMENT AUTHOR NAME
   */
  const getCommentAuthorName = (
    comment: ApiPostComment
  ) => {
    if (
      typeof comment.author === "string"
    ) {
      return "User";
    }

    return (
      comment.author.displayName ||
      `${comment.author.firstName ?? ""} ${
        comment.author.secondName ?? ""
      }`.trim() ||
      "User"
    );
  };

  /*
   * CHECK IF COMMENT BELONGS TO CURRENT USER
   */
  const isMyComment = (
    comment: ApiPostComment
  ) => {
    if (!currentUser?._id) {
      return false;
    }

    const authorId =
      typeof comment.author === "string"
        ? comment.author
        : comment.author?._id;

    return authorId === currentUser._id;
  };

  /*
   * CHECK IF COMMENT AUTHOR IS TEACHER
   */
  const isTeacherComment = (
    comment: ApiPostComment
  ) => {
    if (
      typeof comment.author === "object" &&
      comment.author !== null
    ) {
      return comment.author.role === "teacher";
    }

    return false;
  };

  /*
   * SEND COMMENT
   */
  const sendComment = async () => {
    if (!classId || !postId) {
      return;
    }

    const trimmed = commentText.trim();

    if (!trimmed) {
      return;
    }

    try {
      setSending(true);

      const newComment =
        await createPostComment(
          classId,
          postId,
          trimmed
        );

      setComments((previous) => [
        ...previous,
        newComment,
      ]);

      setCommentText("");
    } catch (error) {
      console.error(
        "Failed to create comment:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to post your comment."
      );
    } finally {
      setSending(false);
    }
  };

  /*
   * START EDIT
   */
  const startEdit = (
    comment: ApiPostComment
  ) => {
    setEditingCommentId(comment._id);
    setEditingText(comment.body);
  };

  /*
   * CANCEL EDIT
   */
  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditingText("");
  };

  /*
   * SAVE EDIT
   */
  const saveEdit = async () => {
    if (
      !classId ||
      !postId ||
      !editingCommentId
    ) {
      return;
    }

    const trimmed = editingText.trim();

    if (!trimmed) {
      Alert.alert(
        "Invalid comment",
        "Comment cannot be empty."
      );
      return;
    }

    try {
      setCommentLoading(true);

      const updated =
        await updatePostComment(
          classId,
          postId,
          editingCommentId,
          trimmed
        );

      setComments((previous) =>
        previous.map((comment) =>
          comment._id === editingCommentId
            ? updated
            : comment
        )
      );

      cancelEdit();
    } catch (error) {
      console.error(
        "Failed to update comment:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to update your comment."
      );
    } finally {
      setCommentLoading(false);
    }
  };

  /*
   * DELETE COMMENT
   */
  const handleDelete = (
    comment: ApiPostComment
  ) => {
    if (!classId || !postId) {
      return;
    }

    Alert.alert(
      "Delete comment?",
      "This comment will be permanently removed.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setCommentLoading(true);

              await deletePostComment(
                classId,
                postId,
                comment._id
              );

              setComments((previous) =>
                previous.filter(
                  (item) =>
                    item._id !== comment._id
                )
              );
            } catch (error) {
              console.error(
                "Failed to delete comment:",
                error
              );

              Alert.alert(
                "Error",
                "Unable to delete the comment."
              );
            } finally {
              setCommentLoading(false);
            }
          },
        },
      ]
    );
  };

  /*
   * LOADING
   */
  if (loading) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color: colors.secondaryText,
            },
          ]}
        >
          Loading announcement...
        </Text>
      </View>
    );
  }

  /*
   * NOT FOUND
   */
  if (!classId || !post) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <Ionicons
          name="document-text-outline"
          size={48}
          color={colors.secondaryText}
        />

        <Text
          style={[
            styles.notFoundTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Announcement not found
        </Text>

        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backButton,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.backButtonText,
              {
                color:
                  colors.primaryText,
              },
            ]}
          >
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  /*
   * MAIN SCREEN
   */
  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
      keyboardVerticalOffset={0}
    >
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            backgroundColor:
              colors.surface,
            borderBottomColor:
              colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.headerBack}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.text,
            },
          ]}
          numberOfLines={1}
        >
          Announcement
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* CONTENT */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ANNOUNCEMENT CARD */}
        <View
          style={[
            styles.announcementCard,
            {
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        >
          {/* AUTHOR */}
          <View style={styles.authorRow}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor:
                    colors.primary,
                },
              ]}
            >
              <Ionicons
                name="person"
                size={21}
                color={colors.primaryText}
              />
            </View>

            <View
              style={styles.authorInfo}
            >
              <View style={styles.nameRow}>
                <Text
                  style={[
                    styles.authorName,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  {getAuthorName()}
                </Text>

                <View
                  style={[
                    styles.teacherBadge,
                    {
                      backgroundColor:
                        colors.primary +
                        "18",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.teacherBadgeText,
                      {
                        color:
                          colors.primary,
                      },
                    ]}
                  >
                    Teacher
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.date,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                {formattedDate}
                {formattedDate &&
                formattedTime
                  ? " • "
                  : ""}
                {formattedTime}
              </Text>
            </View>
          </View>

          {/* TITLE */}
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}
          >
            {post.title}
          </Text>

          {/* BODY */}
          {!!post.body && (
            <Text
              style={[
                styles.body,
                {
                  color: colors.text,
                },
              ]}
            >
              {post.body}
            </Text>
          )}
        </View>

        {/* COMMENTS HEADER */}
        <View style={styles.commentsHeader}>
          <View
            style={styles.commentsTitleRow}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={21}
              color={colors.primary}
            />

            <Text
              style={[
                styles.commentsTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              Comments
            </Text>
          </View>

          <Text
            style={[
              styles.commentCount,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            {comments.length}
          </Text>
        </View>

        {/* COMMENTS */}
        {comments.length === 0 ? (
          <View
            style={[
              styles.emptyComments,
              {
                backgroundColor:
                  colors.surface,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={34}
              color={
                colors.secondaryText
              }
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              No comments yet
            </Text>

            <Text
              style={[
                styles.emptySubtitle,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              Be the first to comment.
            </Text>
          </View>
        ) : (
          comments.map((comment) => {
            const mine =
              isMyComment(comment);

            const teacher =
              isTeacherComment(comment);

            const isEditing =
              editingCommentId ===
              comment._id;

            return (
              <View
                key={comment._id}
                style={[
                  styles.commentCard,
                  {
                    backgroundColor:
                      colors.surface,
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                {/* COMMENT HEADER */}
                <View
                  style={styles.commentTop}
                >
                  <View
                    style={[
                      styles.commentAvatar,
                      {
                        backgroundColor:
                          teacher
                            ? colors.primary
                            : colors.background,
                      },
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={16}
                      color={
                        teacher
                          ? colors.primaryText
                          : colors.secondaryText
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.commentAuthorInfo
                    }
                  >
                    <View
                      style={
                        styles.nameRow
                      }
                    >
                      <Text
                        style={[
                          styles.commentAuthor,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        {getCommentAuthorName(
                          comment
                        )}
                      </Text>

                      {teacher && (
                        <View
                          style={[
                            styles.smallTeacherBadge,
                            {
                              backgroundColor:
                                colors.primary +
                                "18",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.smallTeacherBadgeText,
                              {
                                color:
                                  colors.primary,
                              },
                            ]}
                          >
                            Teacher
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={[
                        styles.commentDate,
                        {
                          color:
                            colors.secondaryText,
                        },
                      ]}
                    >
                      {new Date(
                        comment.createdAt
                      ).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </Text>
                  </View>

                  {/* OWN COMMENT ACTIONS */}
                  {mine && (
                    <View
                      style={
                        styles.commentActions
                      }
                    >
                      <Pressable
                        onPress={() =>
                          startEdit(
                            comment
                          )
                        }
                        hitSlop={8}
                      >
                        <Ionicons
                          name="create-outline"
                          size={19}
                          color={
                            colors.secondaryText
                          }
                        />
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          handleDelete(
                            comment
                          )
                        }
                        hitSlop={8}
                        style={{
                          marginLeft:
                            spacing.sm,
                        }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={19}
                          color="#D94A4A"
                        />
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* EDIT MODE */}
                {isEditing ? (
                  <View
                    style={
                      styles.editContainer
                    }
                  >
                    <TextInput
                      value={editingText}
                      onChangeText={
                        setEditingText
                      }
                      multiline
                      placeholder="Edit your comment..."
                      placeholderTextColor={
                        colors.secondaryText
                      }
                      style={[
                        styles.editInput,
                        {
                          color:
                            colors.text,
                          backgroundColor:
                            colors.background,
                          borderColor:
                            colors.border,
                        },
                      ]}
                    />

                    <View
                      style={
                        styles.editButtons
                      }
                    >
                      <Pressable
                        onPress={
                          cancelEdit
                        }
                        style={[
                          styles.cancelButton,
                          {
                            borderColor:
                              colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cancelButtonText,
                            {
                              color:
                                colors.text,
                            },
                          ]}
                        >
                          Cancel
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={
                          saveEdit
                        }
                        disabled={
                          commentLoading
                        }
                        style={[
                          styles.saveButton,
                          {
                            backgroundColor:
                              colors.primary,
                          },
                        ]}
                      >
                        {commentLoading ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              colors.primaryText
                            }
                          />
                        ) : (
                          <Text
                            style={[
                              styles.saveButtonText,
                              {
                                color:
                                  colors.primaryText,
                              },
                            ]}
                          >
                            Save
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.commentBody,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    {comment.body}
                  </Text>
                )}
              </View>
            );
          })
        )}

        {/* SPACE ABOVE INPUT */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* COMMENT INPUT */}
      <View
        style={[
          styles.commentInputArea,
          {
            backgroundColor:
              colors.surface,
            borderTopColor:
              colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor:
                colors.background,
              borderColor:
                colors.border,
            },
          ]}
        >
          <TextInput
            value={commentText}
            onChangeText={
              setCommentText
            }
            placeholder="Write a comment..."
            placeholderTextColor={
              colors.secondaryText
            }
            multiline
            maxLength={1000}
            style={[
              styles.commentInput,
              {
                color: colors.text,
              },
            ]}
          />

          <Pressable
            onPress={sendComment}
            disabled={
              sending ||
              !commentText.trim()
            }
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  commentText.trim()
                    ? colors.primary
                    : colors.border,
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator
                size="small"
                color={
                  colors.primaryText
                }
              />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={
                  commentText.trim()
                    ? colors.primaryText
                    : colors.secondaryText
                }
              />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },

  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
  },

  notFoundTitle: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: "700",
  },

  backButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },

  header: {
    height: 58,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },

  headerBack: {
    padding: spacing.xs,
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    marginHorizontal: spacing.sm,
  },

  headerSpacer: {
    width: 32,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: spacing.md,
  },

  announcementCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  authorInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  authorName: {
    fontSize: 15,
    fontWeight: "700",
  },

  teacherBadge: {
    marginLeft: spacing.xs,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },

  teacherBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },

  date: {
    fontSize: 12,
    marginTop: 3,
  },

  title: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "800",
    marginTop: spacing.lg,
  },

  body: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: spacing.md,
  },

  commentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },

  commentsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  commentsTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginLeft: spacing.sm,
  },

  commentCount: {
    fontSize: 14,
    fontWeight: "600",
  },

  emptyComments: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: spacing.sm,
  },

  emptySubtitle: {
    fontSize: 13,
    marginTop: 4,
  },

  commentCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  commentTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  commentAuthorInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  commentAuthor: {
    fontSize: 13,
    fontWeight: "700",
  },

  smallTeacherBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },

  smallTeacherBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },

  commentDate: {
    fontSize: 11,
    marginTop: 2,
  },

  commentActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  commentBody: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    marginLeft: 42,
  },

  editContainer: {
    marginTop: spacing.sm,
    marginLeft: 42,
  },

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

  cancelButtonText: {
    fontSize: 13,
    fontWeight: "600",
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

  saveButtonText: {
    fontSize: 13,
    fontWeight: "700",
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

