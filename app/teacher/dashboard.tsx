import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
import { ClassCard } from "../components/ClassCard";
import { Screen } from "../components/Screen";
import {
  ApiClass,
  ApiUser,
  deleteClass,
  getMyClasses,
  getMyProfile,
  updateClass,
} from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

// Cycled through by index so each class card gets a distinct color, without
// the backend needing to know or store anything about styling.
const CARD_PALETTE = [
  { fill: "#E1F5EE", shadow: "#0F6E56", text: "#04342C" },
  { fill: "#FAECE7", shadow: "#993C1D", text: "#4A1B0C" },
  { fill: "#EEEDFE", shadow: "#534AB7", text: "#26215C" },
];

function getInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

export default function TeacherDashboard() {
  const { colors } = useTheme();

  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Overflow ("...") menu state. menuClass is the class the menu was
  // opened for, null when the sheet is closed. Kept as its own piece of
  // state (not reused from editingClass) since the menu and the edit
  // modal have independent open/close lifecycles - opening Edit from the
  // menu closes the menu but opens a different modal.
  const [menuClass, setMenuClass] = useState<ApiClass | null>(null);

  // Edit modal state. editingClass is null when the modal is closed.
  const [editingClass, setEditingClass] = useState<ApiClass | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setError(null);
    try {
      const [profileData, classesData] = await Promise.all([getMyProfile(), getMyClasses()]);
      setProfile(profileData);
      setClasses(classesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch whenever the dashboard comes back into focus (e.g. after
  // creating a new class, or coming back from Archived classes), not just
  // on first mount.
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
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

  // Opens the custom-styled overflow sheet for a card, instead of the
  // native Alert.alert action sheet.
  function handleCardMenu(classItem: ApiClass) {
    setMenuClass(classItem);
  }

  function closeCardMenu() {
    setMenuClass(null);
  }

  // Menu actions close the sheet first, then perform the action - avoids
  // the edit modal or the archive Alert.alert visually overlapping the
  // sheet as it's animating out.
  function handleMenuEdit() {
    if (!menuClass) return;
    const target = menuClass;
    closeCardMenu();
    openEditModal(target);
  }

  function handleMenuCopyCode() {
    if (!menuClass) return;
    const target = menuClass;
    closeCardMenu();
    handleCopyCode(target);
  }

  function handleMenuArchive() {
    if (!menuClass) return;
    const target = menuClass;
    closeCardMenu();
    confirmArchive(target);
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
            onPress={loadDashboard}
            style={[styles.retryButton, { borderColor: colors.border }]}
          >
            <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
              Good morning,
            </Text>
            <Text style={[typography.display.lg, { color: colors.text }]}>
              {profile?.displayName ?? "Teacher"}
            </Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[typography.display.sm, { color: colors.primaryText }]}>
              {getInitials(profile?.displayName ?? "")}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text
            style={[
              typography.reading.sm,
              { color: colors.textMuted, fontWeight: "600" },
            ]}
          >
            My classes
          </Text>
          <Pressable onPress={() => router.push("/teacher/archived-classes")}>
            <Text style={[typography.reading.sm, { color: colors.primary, fontWeight: "600" }]}>
              Archived classes
            </Text>
          </Pressable>
        </View>

        {classes.length === 0 && (
          <Text
            style={[
              typography.reading.sm,
              { color: colors.textMuted, marginBottom: spacing.md },
            ]}
          >
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

        <Pressable
          onPress={() => router.push("/teacher/create-class")}
          style={[styles.addClass, { borderColor: colors.border }]}
        >
          <Ionicons name="add" size={18} color={colors.text} />
          <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "600" }]}>
            Create a new class
          </Text>
        </Pressable>
      </ScrollView>

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

      <Modal
        visible={menuClass !== null}
        animationType="fade"
        transparent
        onRequestClose={closeCardMenu}
      >
        {/* Backdrop is its own Pressable so tapping outside the sheet
            dismisses it, without needing a gesture handler dependency. */}
        <Pressable style={styles.sheetOverlay} onPress={closeCardMenu}>
          <Pressable
            style={[styles.sheetCard, { backgroundColor: colors.background }]}
            // Swallow the press so tapping inside the sheet doesn't
            // bubble up to the backdrop's onPress and close it.
            onPress={() => {}}
          >
            <View style={styles.sheetHandle} />

            {menuClass && (
              <Text
                style={[typography.reading.sm, { color: colors.textMuted, marginBottom: spacing.sm }]}
                numberOfLines={1}
              >
                {menuClass.title}
              </Text>
            )}

            <Pressable style={styles.sheetRow} onPress={handleMenuEdit}>
              <Ionicons name="create-outline" size={20} color={colors.text} />
              <Text style={[typography.reading.sm, { color: colors.text }]}>Edit</Text>
            </Pressable>

            <Pressable style={styles.sheetRow} onPress={handleMenuCopyCode}>
              <Ionicons name="copy-outline" size={20} color={colors.text} />
              <Text style={[typography.reading.sm, { color: colors.text }]}>Copy class code</Text>
            </Pressable>

            <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />

            <Pressable style={styles.sheetRow} onPress={handleMenuArchive}>
              <Ionicons name="archive-outline" size={20} color={colors.primary} />
              <Text style={[typography.reading.sm, { color: colors.primary, fontWeight: "600" }]}>
                Archive
              </Text>
            </Pressable>

            <Pressable style={styles.sheetCancel} onPress={closeCardMenu}>
              <Text style={[typography.reading.sm, { color: colors.textMuted, fontWeight: "600" }]}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    // Horizontal padding kept intentionally tiny - just enough that cards
    // aren't literally touching the screen edge, unlike the vertical
    // spacing which still uses the normal scale.
    paddingHorizontal: 6,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
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
  addClass: {
    borderWidth: 3,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs ?? 8,
    marginTop: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  retryButton: {
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
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
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D9D9D9",
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  sheetDivider: {
    height: 1,
    marginVertical: spacing.xs ?? 4,
  },
  sheetCancel: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
});