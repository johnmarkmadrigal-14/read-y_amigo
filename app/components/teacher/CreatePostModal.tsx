import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";
import { Button } from "../Button";

import {
  TeacherAttachment,
  TeacherPost,
} from "./TeacherPostCard";

interface CreatePostModalProps {
  visible: boolean;
  classId: string;
  editingPost?: TeacherPost | null;
  onClose: () => void;
  onSave: (
    post: Omit<TeacherPost, "id" | "createdAt">
  ) => void;
}

export default function CreatePostModal({
  visible,
  classId,
  editingPost,
  onClose,
  onSave,
}: CreatePostModalProps) {
  const { colors } = useTheme();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] =
    useState<TeacherAttachment | undefined>();

  useEffect(() => {
    if (!visible) return;

    if (editingPost) {
      setTitle(editingPost.title);
      setMessage(editingPost.message ?? "");
      setAttachment(editingPost.attachment);
    } else {
      setTitle("");
      setMessage("");
      setAttachment(undefined);
    }
  }, [visible, editingPost]);

  const pickFile = async () => {
    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: [
            "application/pdf",
            "text/plain",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
          copyToCacheDirectory: true,
        });

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0
      ) {
        const file = result.assets[0];

        setAttachment({
          name: file.name,
          uri: file.uri,
          mimeType: file.mimeType,
        });
      }
    } catch {
      Alert.alert(
        "File Error",
        "Unable to select the file."
      );
    }
  };

  const submit = () => {
    if (!title.trim()) {
      Alert.alert(
        "Missing Title",
        "Please enter an announcement title."
      );
      return;
    }

    if (!message.trim()) {
      Alert.alert(
        "Missing Message",
        "Please enter your announcement message."
      );
      return;
    }

    const post: Omit<
      TeacherPost,
      "id" | "createdAt"
    > = {
      classId,
      type: "announcement",
      title: title.trim(),
      message: message.trim(),
      attachment,
      teacherName: "Teacher",
      status: "published",
    };

    onSave(post);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View
          style={[
            styles.modal,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.secondaryShadow,
            },
          ]}
        >
          <View style={styles.header}>
            <View>
              <Text
                style={[
                  typography.display.sm,
                  {
                    color: colors.secondaryText,
                  },
                ]}
              >
                {editingPost
                  ? "Edit Announcement"
                  : "New Announcement"}
              </Text>

              <Text
                style={[
                  typography.body.sm,
                  {
                    color: colors.secondaryText,
                    opacity: 0.7,
                    marginTop: 3,
                  },
                ]}
              >
                Share an update with your class
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={25}
                color={colors.secondaryText}
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.scrollContent
            }
          >
            <Field
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="Announcement title"
            />

            <Field
              label="Message"
              value={message}
              onChangeText={setMessage}
              placeholder="Write your announcement..."
              multiline
            />

            <View style={styles.field}>
              <Text
                style={[
                  typography.body.md,
                  styles.label,
                  {
                    color: colors.secondaryText,
                  },
                ]}
              >
                Attachment
              </Text>

              {!attachment ? (
                <Pressable
                  onPress={pickFile}
                  style={[
                    styles.uploadButton,
                    {
                      borderColor:
                        colors.secondaryShadow,
                    },
                  ]}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={22}
                    color={colors.secondaryText}
                  />

                  <Text
                    style={[
                      typography.body.md,
                      {
                        color:
                          colors.secondaryText,
                      },
                    ]}
                  >
                    Upload PDF, DOCX or TXT
                  </Text>
                </Pressable>
              ) : (
                <View
                  style={[
                    styles.filePreview,
                    {
                      borderColor:
                        colors.secondaryShadow,
                    },
                  ]}
                >
                  <Ionicons
                    name="document-outline"
                    size={22}
                    color={colors.secondaryText}
                  />

                  <Text
                    numberOfLines={1}
                    style={[
                      typography.body.md,
                      {
                        color:
                          colors.secondaryText,
                        flex: 1,
                      },
                    ]}
                  >
                    {attachment.name}
                  </Text>

                  <Pressable
                    onPress={() =>
                      setAttachment(undefined)
                    }
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={
                        colors.secondaryText
                      }
                    />
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={onClose}
                style={styles.button}
              />

              <Button
                label={
                  editingPost
                    ? "Save Changes"
                    : "Publish"
                }
                onPress={submit}
                style={styles.button}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <Text
        style={[
          typography.body.md,
          styles.label,
          {
            color: colors.secondaryText,
          },
        ]}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={`${colors.secondaryText}88`}
        multiline={multiline}
        textAlignVertical={
          multiline ? "top" : "center"
        }
        style={[
          styles.input,
          {
            color: colors.secondaryText,
            borderColor:
              colors.secondaryShadow,
          },
          multiline && styles.multilineInput,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modal: {
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 3,
    padding: spacing.lg,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },

  closeButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    paddingBottom: spacing.xl,
  },

  field: {
    marginBottom: spacing.md,
  },

  label: {
    fontWeight: "700",
    marginBottom: 6,
  },

  input: {
    borderWidth: 2,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  multilineInput: {
    minHeight: 125,
    paddingTop: spacing.md,
  },

  uploadButton: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: radius.md,
    minHeight: 55,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  filePreview: {
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  button: {
    flex: 1,
  },
});