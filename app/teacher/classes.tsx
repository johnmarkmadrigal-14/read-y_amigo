import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { ClassCard } from "../components/ClassCard";
import { Screen } from "../components/Screen";
import { ApiClass, deleteClass, getMyClasses, updateClass } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

// Same palette as the dashboard, kept in sync so a class shows with the
// same color wherever it appears. If you add more classes than colors,
// consider moving this into a shared constants file instead of
// duplicating it across screens.
const CARD_PALETTE = [
  { fill: "#E1F5EE", shadow: "#0F6E56", text: "#04342C" },
  { fill: "#FAECE7", shadow: "#993C1D", text: "#4A1B0C" },
  { fill: "#EEEDFE", shadow: "#534AB7", text: "#26215C" },
];

export default function ClassesScreen() {
  const { colors } = useTheme();

  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state. editingClass is null when the modal is closed.
  const [editingClass, setEditingClass] = useState<ApiClass | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    setError(null);
    try {
      const classesData = await getMyClasses();
      setClasses(classesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [loadClasses])
  );

  function openEditModal(classItem: ApiClass) {
    setEditingClass(classItem);
    setEditTitle(classItem.title);
    setEditDescription(classItem.description || "");
    setEditError(null);
  }

  function closeEditModal() {
    if (savingEdit) return; // don't let a dismiss race a save in flight
    setEditingClass(null);
  }

  async function handleSaveEdit() {
    if (!editingClass) return;

    if (!editTitle.trim()) {
      setEditError("A class title is required.");
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    try {
      const updated = await updateClass(editingClass._id, {
        title: editTitle.trim(),
        description: editDescription,
      });
      setClasses((prev) =>
        prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c))
      );
      setEditingClass(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Couldn't save changes.");
    } finally {
      setSavingEdit(false);
    }
  }

  function confirmArchive(classItem: ApiClass) {
    const learnerNote =
      classItem.learnerCount && classItem.learnerCount > 0
        ? ` It has ${classItem.learnerCount} learner${classItem.learnerCount === 1 ? "" : "s"} enrolled.`
        : "";

    Alert.alert(
      `Archive "${classItem.title}"?`,
      `This moves the class to Archived Classes and hides it from your list.${learnerNote} You can restore it anytime — nothing is deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => handleArchive(classItem._id),
        },
      ]
    );
  }

  async function handleArchive(classId: string) {
    try {
      await deleteClass(classId);
      setClasses((prev) => prev.filter((c) => c._id !== classId));
    } catch (err) {
      Alert.alert(
        "Couldn't archive class",
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  }

  async function handleCopyCode(classItem: ApiClass) {
    await Clipboard.setStringAsync(classItem.code);
    Alert.alert("Copied", `"${classItem.code}" copied to clipboard.`);
  }

  // Single overflow menu shared by every card: Edit / Copy class code /
  // Archive / Cancel. Uses the native action sheet / dialog rather than a
  // custom dropdown, matching how confirmArchive already uses Alert.alert.
  function handleCardMenu(classItem: ApiClass) {
    Alert.alert(classItem.title, undefined, [
      { text: "Edit", onPress: () => openEditModal(classItem) },
      { text: "Copy class code", onPress: () => handleCopyCode(classItem) },
      { text: "Archive", style: "destructive", onPress: () => confirmArchive(classItem) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

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
          <Text style={[typography.reading.sm, { color: colors.text, textAlign: "center" }]}>
            {error}
          </Text>
          <Pressable
            onPress={loadClasses}
            style={[styles.retryButton, { borderColor: colors.retry }]}
          >
            <Text style={[typography.reading.sm, { color: colors.retryText, fontWeight: "600" }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <Text style={[typography.display.lg, { color: colors.text }]}>Classes</Text>
        <Pressable onPress={() => router.push("/teacher/archived-classes")}>
          <Text style={[typography.reading.sm, { color: colors.primary, fontWeight: "600" }]}>
            Archived classes
          </Text>
        </Pressable>
      </View>

      {classes.length === 0 && (
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
          You haven't created any classes yet.
        </Text>
      )}

      {classes.map((classItem, index) => {
        const palette = CARD_PALETTE[index % CARD_PALETTE.length];

        return (
          <ClassCard
            key={classItem._id}
            variant="banner"
            title={classItem.title}
            subtitle={classItem.description || "Tap to view class details"}
            fill={palette.fill}
            shadowColor={palette.shadow}
            textColor={palette.text}
            onPress={() =>
              router.push({
                pathname: "/teacher/class/[id]",
                params: { id: classItem._id },
              })
            }
            onMenuPress={() => handleCardMenu(classItem)}
            footer={
              <View style={styles.metaRow}>
                <View style={[styles.codeBadge, { borderColor: palette.shadow }]}>
                  <Text
                    style={[
                      typography.reading.sm,
                      { color: palette.text, fontWeight: "700", letterSpacing: 1 },
                    ]}
                  >
                    {classItem.code}
                  </Text>
                </View>
                <Text style={[typography.reading.sm, { color: palette.text, opacity: 0.7 }]}>
                  {classItem.learnerCount ?? 0} learner
                  {classItem.learnerCount === 1 ? "" : "s"}
                </Text>
              </View>
            }
          />
        );
      })}

      <Modal
        visible={editingClass !== null}
        animationType="slide"
        transparent
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <Text style={[typography.display.sm, { color: colors.text, marginBottom: spacing.md }]}>
              Edit class
            </Text>

            <Text style={[typography.reading.sm, { color: colors.textMuted, marginBottom: 4 }]}>
              Title
            </Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Class title"
              placeholderTextColor={colors.textMuted}
            />

            <Text
              style={[
                typography.reading.sm,
                { color: colors.textMuted, marginTop: spacing.md, marginBottom: 4 },
              ]}
            >
              Description
            </Text>
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              style={[
                styles.input,
                styles.multilineInput,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Optional description"
              placeholderTextColor={colors.textMuted}
              multiline
            />

            {editingClass && (
              <Text style={[typography.reading.sm, { color: colors.textMuted, marginTop: spacing.md }]}>
                Join code: {editingClass.code} (can't be changed)
              </Text>
            )}

            {editError && (
              <Text style={[typography.reading.sm, { color: colors.primary, marginTop: spacing.sm }]}>
                {editError}
              </Text>
            )}

            <View style={styles.modalActions}>
              <Pressable
                onPress={closeEditModal}
                style={[styles.modalButton, { borderColor: colors.border }]}
                disabled={savingEdit}
              >
                <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveEdit}
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[typography.reading.sm, { color: "#fff", fontWeight: "700" }]}>
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  retryButton: {
    borderWidth: 2,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  codeBadge: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButton: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    borderWidth: 0,
  },
});