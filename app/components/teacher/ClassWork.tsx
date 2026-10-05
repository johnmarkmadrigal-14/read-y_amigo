import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    ApiClasswork,
    createClasswork,
} from "../../lib/api";

import { useTheme } from "../../theme/ThemeProvider";

interface ClassWorkProps {
  classId: string;
  items: ApiClasswork[];
  onCreated: () => void;
}

export default function ClassWork({
  classId,
  items,
  onCreated,
}: ClassWorkProps) {
  const { colors } = useTheme();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert(
        "Reading task title required",
        "Please enter a title for the reading task."
      );
      return;
    }

    setSubmitting(true);

    try {
       await createClasswork(classId, {
  title: title.trim(),
  description: description.trim() || undefined,
  type: "reading",
});

      setTitle("");
      setDescription("");

      onCreated();
    } catch (err) {
      Alert.alert(
        "Couldn't add reading task",
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* =====================================================
          READING TASK INTRO
          ===================================================== */}

      <View
        style={[
          styles.introCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.introIcon,
            {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Ionicons
           await name="book-outline"
            size={23}
            color={colors.primaryText}
          />
        </View>

        <View style={styles.introContent}>
          <Text
            style={[
              styles.introTitle,
              { color: colors.text },
            ]}
          >
            Reading Tasks
          </Text>

          <Text
            style={[
              styles.introDescription,
              { color: colors.textMuted },
            ]}
          >
            Create activities that help learners practice
            reading, comprehension, and understanding.
          </Text>
        </View>
      </View>

      {/* =====================================================
          CREATE READING TASK
          ===================================================== */}

      <View
        style={[
          styles.createCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text
              style={[
                styles.sectionKicker,
                { color: colors.primary },
              ]}
            >
              NEW ACTIVITY
            </Text>

            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text },
              ]}
            >
              Add Reading Task
            </Text>
          </View>

          <View
            style={[
              styles.smallIcon,
              {
                backgroundColor: colors.background,
              },
            ]}
          >
            <Ionicons
              name="create-outline"
              size={19}
              color={colors.primary}
            />
          </View>
        </View>

        {/* TITLE */}

        <Text
          style={[
            styles.fieldLabel,
            { color: colors.text },
          ]}
        >
          Task title
        </Text>

        <TextInput
          placeholder="e.g. Read Chapter 1"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        />

        {/* DESCRIPTION */}

        <Text
          style={[
            styles.fieldLabel,
            { color: colors.text },
          ]}
        >
          Reading instructions
        </Text>

        <TextInput
          placeholder="e.g. Read the passage and answer the comprehension questions."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            styles.descriptionInput,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        />

        {/* BUTTON */}

        <Pressable
          onPress={handleCreate}
          disabled={!title.trim() || submitting}
          style={[
            styles.createButton,
            {
              backgroundColor: colors.primary,
              borderColor: colors.primaryShadow,
              opacity:
                !title.trim() || submitting ? 0.55 : 1,
            },
          ]}
        >
          <Ionicons
            name="add"
            size={19}
            color={colors.primaryText}
          />

          <Text
            style={[
              styles.createButtonText,
              { color: colors.primaryText },
            ]}
          >
            {submitting
              ? "Creating..."
              : "Create Reading Task"}
          </Text>
        </Pressable>
      </View>

      {/* =====================================================
          TASK LIST HEADER
          ===================================================== */}

      <View style={styles.listHeader}>
        <View>
          <Text
            style={[
              styles.listKicker,
              { color: colors.primary },
            ]}
          >
            YOUR ACTIVITIES
          </Text>

          <Text
            style={[
              styles.listTitle,
              { color: colors.text },
            ]}
          >
            Reading Activities
          </Text>
        </View>

        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.countText,
              { color: colors.text },
            ]}
          >
            {items.length}
          </Text>
        </View>
      </View>

      {/* =====================================================
          EMPTY STATE
          ===================================================== */}

      {items.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.emptyIcon,
              {
                backgroundColor: colors.background,
              },
            ]}
          >
            <Ionicons
              name="book-outline"
              size={30}
              color={colors.primary}
            />
          </View>

          <Text
            style={[
              styles.emptyTitle,
              { color: colors.text },
            ]}
          >
            No reading activities yet
          </Text>

          <Text
            style={[
              styles.emptyDescription,
              { color: colors.textMuted },
            ]}
          >
            Create your first reading activity above.
            Learners will be able to use it as part of
            their reading practice.
          </Text>
        </View>
      ) : (
        /* ===================================================
           TASK LIST
           =================================================== */

        <View style={styles.taskList}>
          {items.map((item, index) => (
            <Pressable
              key={item._id}
              style={[
                styles.taskCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* NUMBER */}

              <View
                style={[
                  styles.taskNumber,
                  {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.taskNumberText,
                    { color: colors.primaryText },
                  ]}
                >
                  {index + 1}
                </Text>
              </View>

              {/* CONTENT */}

              <View style={styles.taskContent}>
                <View style={styles.taskTopRow}>
                  <View style={styles.taskLabelRow}>
                    <Ionicons
                      name="book-outline"
                      size={14}
                      color={colors.primary}
                    />

                    <Text
                      style={[
                        styles.taskLabel,
                        { color: colors.primary },
                      ]}
                    >
                      READING TASK
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={19}
                    color={colors.textMuted}
                  />
                </View>

                <Text
                  style={[
                    styles.taskTitle,
                    { color: colors.text },
                  ]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                {item.description ? (
                  <Text
                    style={[
                      styles.taskDescription,
                      { color: colors.textMuted },
                    ]}
                    numberOfLines={3}
                  >
                    {item.description}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.taskDescription,
                      { color: colors.textMuted },
                    ]}
                  >
                    Reading activity for this class.
                  </Text>
                )}

                <View style={styles.taskFooter}>
                  <View style={styles.taskMeta}>
                    <Ionicons
                      name="headset-outline"
                      size={14}
                      color={colors.textMuted}
                    />

                    <Text
                      style={[
                        styles.taskMetaText,
                        { color: colors.textMuted },
                      ]}
                    >
                      Reading Assistant
                    </Text>
                  </View>

                  <View style={styles.taskMeta}>
                    <Ionicons
                      name="arrow-forward-circle-outline"
                      size={14}
                      color={colors.primary}
                    />

                    <Text
                      style={[
                        styles.openText,
                        { color: colors.primary },
                      ]}
                    >
                      Open
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
  },

  /* =======================================================
     INTRO
     ======================================================= */

  introCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },

  introIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 3,
  },

  introDescription: {
    fontSize: 11.5,
    lineHeight: 17,
  },

  /* =======================================================
     CREATE CARD
     ======================================================= */

  createCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  sectionKicker: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 3,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
  },

  smallIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 13,
  },

  descriptionInput: {
    minHeight: 82,
    paddingTop: 11,
  },

  createButton: {
    minHeight: 45,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 2,
  },

  createButtonText: {
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 7,
  },

  /* =======================================================
     LIST HEADER
     ======================================================= */

  listHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 11,
  },

  listKicker: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 3,
  },

  listTitle: {
    fontSize: 21,
    fontWeight: "900",
  },

  countBadge: {
    minWidth: 31,
    height: 31,
    paddingHorizontal: 9,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    fontSize: 12,
    fontWeight: "900",
  },

  /* =======================================================
     EMPTY
     ======================================================= */

  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    marginBottom: 15,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 5,
    textAlign: "center",
  },

  emptyDescription: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 290,
  },

  /* =======================================================
     TASK LIST
     ======================================================= */

  taskList: {
    gap: 10,
  },

  taskCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    flexDirection: "row",
  },

  taskNumber: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  taskNumberText: {
    fontSize: 13,
    fontWeight: "900",
  },

  taskContent: {
    flex: 1,
    minWidth: 0,
  },

  taskTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  taskLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  taskLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 1,
    marginLeft: 5,
  },

  taskTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
    marginBottom: 4,
  },

  taskDescription: {
    fontSize: 11.5,
    lineHeight: 17,
  },

  taskFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 11,
  },

  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
  },

  taskMetaText: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },

  openText: {
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 4,
  },
});