import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import {
  radius,
  spacing,
  typography,
} from "../../theme/tokens";

export type PostType = "announcement";

export interface TeacherAttachment {
  name: string;
  uri: string;
  mimeType?: string;
}

export interface TeacherPost {
  id: string;
  classId: string;
  type: PostType;
  title: string;
  message?: string;
  attachment?: TeacherAttachment;
  teacherName: string;
  createdAt: string;
  status: "published" | "draft";
  commentCount?: number;
}

interface TeacherPostCardProps {
  post: TeacherPost;
  onPress: (post: TeacherPost) => void;
  onEdit: (post: TeacherPost) => void;
  onDelete: (post: TeacherPost) => void;
}

export default function TeacherPostCard({
  post,
  onPress,
  onEdit,
  onDelete,
}: TeacherPostCardProps) {
  const { colors } = useTheme();

  const date = new Date(post.createdAt);

  const formattedDate = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  const formattedTime = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

  const handleMenu = () => {
    Alert.alert("Announcement", undefined, [
      {
        text: "Edit",
        onPress: () => onEdit(post),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(post),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  return (
    <Pressable
      onPress={() => onPress(post)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Ionicons
            name="person"
            size={19}
            color={colors.primaryText}
          />
        </View>

        <View style={styles.teacherInfo}>
          <Text
            style={[
              styles.teacherName,
              {
                color: colors.text,
              },
            ]}
            numberOfLines={1}
          >
            {post.teacherName}
          </Text>

          <Text
            style={[
              styles.date,
              {
                color: colors.secondaryText,
              },
            ]}
          >
            {formattedDate}
            {formattedDate && formattedTime ? " • " : ""}
            {formattedTime}
          </Text>
        </View>

        <Pressable
          onPress={handleMenu}
          hitSlop={10}
          style={styles.menuButton}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={20}
            color={colors.secondaryText}
          />
        </Pressable>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Ionicons
            name="megaphone-outline"
            size={20}
            color={colors.primary}
          />

          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}
            numberOfLines={2}
          >
            {post.title}
          </Text>
        </View>

        {!!post.message && (
          <Text
            style={[
              styles.message,
              {
                color: colors.secondaryText,
              },
            ]}
            numberOfLines={3}
          >
            {post.message}
          </Text>
        )}

        {post.attachment && (
          <View
            style={[
              styles.attachment,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.attachmentIcon,
                {
                  backgroundColor:
                    colors.primary + "18",
                },
              ]}
            >
              <Ionicons
                name="document-attach-outline"
                size={19}
                color={colors.primary}
              />
            </View>

            <Text
              style={[
                styles.attachmentName,
                {
                  color: colors.text,
                },
              ]}
              numberOfLines={1}
            >
              {post.attachment.name}
            </Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondaryText}
            />
          </View>
        )}
      </View>

      {/* FOOTER */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.commentInfo}>
          <Ionicons
            name="chatbubble-outline"
            size={17}
            color={colors.secondaryText}
          />

          <Text
            style={[
              styles.commentText,
              {
                color: colors.secondaryText,
              },
            ]}
          >
            {post.commentCount ?? 0}{" "}
            {post.commentCount === 1
              ? "comment"
              : "comments"}
          </Text>
        </View>

        <View style={styles.viewAnnouncement}>
          <Text
            style={[
              styles.viewText,
              {
                color: colors.primary,
              },
            ]}
          >
            View announcement
          </Text>

          <Ionicons
            name="chevron-forward"
            size={17}
            color={colors.primary}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  teacherInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  teacherName: {
  fontSize: typography.body.md.fontSize,
  fontWeight: "700",
  },

  date: {
    fontSize: 12,
    marginTop: 2,
  },

  menuButton: {
    padding: spacing.xs,
  },

  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  title: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
  },

  message: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    marginLeft: 28,
  },

  attachment: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },

  attachmentIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },

  attachmentName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },

  footer: {
    minHeight: 48,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  commentInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  commentText: {
    fontSize: 13,
    marginLeft: 6,
  },

  viewAnnouncement: {
    flexDirection: "row",
    alignItems: "center",
  },

  viewText: {
    fontSize: 13,
    fontWeight: "700",
    marginRight: 3,
  },
});

