import { useConfirmation } from './ConfirmationDialog';
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Screen } from "../app/components/Screen";
import { getMyProfile, logout, removeProfilePhoto, updateMyProfile, uploadProfilePhoto, type ApiUser, type ReadingPreferences } from "../app/lib/api";
import { useTheme } from "../app/theme/ThemeProvider";
import { radius, spacing, typography } from "../app/theme/tokens";
import { defaultReadingPreferences, useReadingPreferences } from "./ReadingPreferences";
import { UserAvatar } from "./UserAvatar";

type Role = "teacher" | "learner";
type Draft = { firstName: string; secondName: string; middleInitial: string; displayName: string; learnerLevel: string };
const blank: Draft = { firstName: "", secondName: "", middleInitial: "", displayName: "", learnerLevel: "" };
const toDraft = (user: ApiUser): Draft => Object.fromEntries(Object.keys(blank).map(key => [key, typeof user[key] === "string" ? user[key] : ""])) as Draft;

export function ProfileScreen({ role }: { role: Role }) {
  const confirm = useConfirmation();
  const { colors } = useTheme();
  const reading = useReadingPreferences();
  const { setPreferences: applyPreferences } = reading;
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"details" | "reading" | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [preferences, setPreferences] = useState<ReadingPreferences>(defaultReadingPreferences);
  const [formError, setFormError] = useState("");
  const teacher = role === "teacher";
  const load = useCallback(async () => {
    try { setError(""); const current = await getMyProfile(); setUser(current);
      applyPreferences(current.readingPreferences ?? defaultReadingPreferences);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't load your profile."); }
    finally { setLoading(false); }
  }, [applyPreferences]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function edit(which: "details" | "reading") {
    if (!user) return;
    setDraft(toDraft(user)); setPreferences(user.readingPreferences ?? defaultReadingPreferences);
    setFormError(""); setMode(which);
  }
  async function save() {
    if (!user) return;
    const trimmed = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])) as Draft;
    if (mode === "details" && [trimmed.firstName, trimmed.secondName, trimmed.displayName].some(v => !v || v.length > 100)) {
      setFormError("First name, last name, and display name are required (up to 100 characters)."); return;
    }
    setBusy(true); setFormError("");
    try {
      const payload = mode === "reading" ? { readingPreferences: preferences } : {
        firstName: trimmed.firstName, secondName: trimmed.secondName, middleInitial: trimmed.middleInitial,
        displayName: trimmed.displayName, ...(teacher ? { learnerLevel: trimmed.learnerLevel } : {}),
      };
      const updated = await updateMyProfile(payload);
      if (mode === "reading" && !updated.readingPreferences) throw new Error("Please install the backend profile update before saving reading preferences.");
      setUser(updated); applyPreferences(updated.readingPreferences ?? defaultReadingPreferences);
      setMode(null); setMessage("Changes saved."); setError("");
    } catch (err) { setFormError(err instanceof Error ? err.message : "Couldn't save changes."); }
    finally { setBusy(false); }
  }
  async function choosePhoto() {
    setError(""); setMessage(""); setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "image/webp"], copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > 5 * 1024 * 1024) throw new Error("Choose an image up to 5 MB.");
      setBusy(true);
      const updated = await uploadProfilePhoto(asset); setUser(updated); setMessage("Profile picture updated.");
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't update your photo."); }
    finally { setBusy(false); }
  }
  function removePhoto() {
    confirm({
      title: "Remove profile picture?",
      message: "Your initials will be shown instead.",
      icon: "image-outline",
      confirmLabel: "Remove",
      onConfirm: async () => {
        setBusy(true); setError("");
        try { setUser(await removeProfilePhoto()); setMessage("Profile picture removed."); }
        catch (err) { setError(err instanceof Error ? err.message : "Couldn't remove the photo."); }
        finally { setBusy(false); }
      },
    });
  }
  function confirmLogout() {
    confirm({
      title: "Log out?",
      message: "You can log back in to access your account and classes.",
      icon: "log-out-outline",
      confirmLabel: "Log out",
      onConfirm: async () => {
        try { await logout(); await reading.refresh(); router.replace("/auth/login"); }
        catch (err) { setError(err instanceof Error ? err.message : "Couldn't log out. Try again."); }
      },
    });
  }
  const button = (label: string, action: () => void, secondary = false) => <Pressable disabled={busy} onPress={action} accessibilityRole="button"
    style={({ pressed }) => [styles.button, { backgroundColor: secondary ? colors.surface : colors.primary, opacity: busy ? 0.5 : pressed ? 0.75 : 1 }]}>
    <Text style={[typography.display.md, { color: secondary ? colors.text : colors.primaryText }]}>{label}</Text>
  </Pressable>;
  const info = (icon: keyof typeof Ionicons.glyphMap, label: string, value: unknown, locked = false) => <View style={[styles.info, { borderColor: colors.border }]}>
    <Ionicons name={icon} size={25} color={colors.text} accessible={false} />
    <View style={styles.grow}><Text style={[typography.reading.sm, { color: colors.textMuted }]}>{label}</Text>
      <Text selectable style={[typography.reading.md, { color: colors.text }]}>{typeof value === "string" && value ? value : "Not provided"}</Text></View>
    {locked && <Ionicons name="lock-closed-outline" accessibilityLabel="Read-only" size={19} color={colors.textMuted} />}
  </View>;

  return <Screen>
    <View style={styles.top}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(teacher ? "/teacher/settings" : "/learner/settings");
      }} style={styles.iconButton}>
        <Ionicons name="arrow-back" size={25} color={colors.text} />
      </Pressable>
      <Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>Profile</Text><View style={styles.iconButton} />
    </View>
    {loading ? <ActivityIndicator color={colors.primary} /> : !user ? <View style={styles.center}>
      <Text style={[typography.reading.sm, { color: colors.text }]}>{error || "Profile unavailable."}</Text>{button("Try again", load)}
    </View> : <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.identity}>
        <View style={[styles.arc, { backgroundColor: colors.surface }]} />
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <Pressable accessibilityRole="button" accessibilityLabel={user.profilePhoto ? "Change profile picture" : "Add profile picture"} disabled={busy} onPress={choosePhoto}>
          <UserAvatar name={user.displayName} photo={user.profilePhoto} size={110} />
          <View style={[styles.camera, { backgroundColor: colors.primary }]}><Ionicons name="camera" size={18} color={colors.primaryText} /></View>
        </Pressable>
        <Text accessibilityRole="header" style={[typography.display.xl, styles.name, { color: colors.text }]}>{user.displayName}</Text>
        <Text style={[typography.display.md, { color: colors.text }]}><Text style={{ color: colors.primary }}>● </Text>{teacher ? "Teacher" : "Learner"}</Text>
        <Pressable disabled={busy} onPress={choosePhoto} accessibilityRole="button" style={styles.photoLink}>
          <Text style={[typography.display.sm, { color: colors.primary }]}>{busy ? "Please wait..." : user.profilePhoto ? "Change picture" : "Add a picture"}</Text>
        </Pressable>
        {user.profilePhoto && <Pressable disabled={busy} onPress={removePhoto} accessibilityRole="button" style={styles.photoLink}>
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Remove picture</Text>
        </Pressable>}
        {button("Edit profile", () => edit("details"))}
      </View>
      {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.primary }]}>{error}</Text>}
      {!!message && <Text accessibilityLiveRegion="polite" style={[typography.reading.sm, { color: colors.successText }]}>{message}</Text>}
      <Text style={[styles.section, { color: colors.primary, borderColor: colors.border }]}>ABOUT YOU</Text>
      {info("person-outline", "Full name", [user.firstName, user.middleInitial, user.secondName].filter(Boolean).join(" "))}
      {teacher ? info("school-outline", "Teaching level", user.learnerLevel) : info("calendar-outline", "Age", user.age ? `${user.age} years old` : "")}
      {info(teacher ? "mail-outline" : "at-outline", teacher ? "Email" : "Username", teacher ? user.email : user.username, true)}
      <Text style={[styles.section, { color: colors.primary, borderColor: colors.border }]}>{teacher ? "YOUR TOOLS" : "YOUR READING"}</Text>
      {teacher ? <View style={styles.tools}>
        <Pressable accessibilityRole="button" onPress={() => router.push("/teacher/reports")} style={styles.tool}>
          <Ionicons name="bar-chart-outline" size={28} color={colors.primary} /><Text style={[typography.display.md, { color: colors.text }]}>Reports →</Text><Text style={[typography.reading.sm, { color: colors.textMuted }]}>Class reports</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push("/teacher/archived-classes")} style={styles.tool}>
          <Ionicons name="archive-outline" size={28} color={colors.text} /><Text style={[typography.display.md, { color: colors.text }]}>Archived classes →</Text><Text style={[typography.reading.sm, { color: colors.textMuted }]}>View and restore</Text>
        </Pressable>
      </View> : <>
        <Pressable accessibilityRole="button" onPress={() => edit("reading")} style={[styles.info, { borderColor: colors.border }]}>
          <Text style={[typography.display.lg, { color: colors.primary }]}>Aa</Text><View style={styles.grow}><Text style={[typography.display.md, { color: colors.text }]}>Reading preferences</Text><Text style={[typography.reading.sm, { color: colors.textMuted }]}>Text size and read-along</Text></View><Ionicons name="chevron-forward" color={colors.text} size={20} />
        </Pressable>
        <Text style={[typography.reading.sm, styles.note, { color: colors.text, backgroundColor: colors.surface }]}>♡  Read at your own pace.</Text>
      </>}
      <Pressable accessibilityRole="button" onPress={confirmLogout} disabled={busy} style={styles.logout}>
        <Ionicons name="log-out-outline" size={23} color={colors.primary} /><Text style={[typography.display.md, { color: colors.primary }]}>Log out</Text>
      </Pressable>
    </ScrollView>}
    <Modal visible={mode !== null} transparent animationType="slide" onRequestClose={() => { if (!busy) setMode(null); }}>
      <View style={styles.overlay}><View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>{mode === "reading" ? "Reading preferences" : "Edit profile"}</Text>
          {mode === "details" ? (Object.entries({ firstName: "First name", secondName: "Last name", middleInitial: "Middle initial", displayName: "Display name", ...(teacher ? { learnerLevel: "Teaching level" } : {}) }) as [keyof Draft, string][]).map(([key, label]) => <View key={key} style={styles.field}>
            <Text style={[typography.reading.sm, { color: colors.text }]}>{label}</Text>
            <TextInput accessibilityLabel={label} editable={!busy} value={draft[key]} maxLength={key === "middleInitial" ? 5 : 100} onChangeText={value => setDraft(old => ({ ...old, [key]: value }))}
              style={[typography.reading.sm, styles.input, { color: colors.text, borderColor: colors.border }]} />
          </View>) : <>
            <Text style={[typography.reading.sm, { color: colors.text, marginTop: 16 }]}>Reading text size</Text>
            <View style={styles.sizes}>{(["small", "standard", "large"] as const).map(size => <Pressable key={size} disabled={busy} onPress={() => setPreferences(old => ({ ...old, textSize: size }))}
              accessibilityRole="radio" accessibilityState={{ checked: preferences.textSize === size }} style={[styles.size, { borderColor: colors.primary, backgroundColor: preferences.textSize === size ? colors.surface : colors.background }]}>
              <Text style={[typography.display.sm, { color: colors.text }]}>{size[0].toUpperCase() + size.slice(1)}</Text>
            </Pressable>)}</View>
            <Text style={{ fontFamily: typography.reading.md.fontFamily, color: colors.text, paddingVertical: 16, fontSize: preferences.textSize === "small" ? 18 : preferences.textSize === "large" ? 24 : 20 }}>Every story starts with a word.</Text>
            <View style={styles.info}><View style={styles.grow}><Text style={[typography.display.md, { color: colors.text }]}>Follow reading by default</Text><Text style={[typography.reading.sm, { color: colors.textMuted }]}>Scroll with recognized words. You can change this while reading.</Text></View>
              <Switch accessibilityLabel="Follow reading by default" disabled={busy} value={preferences.followReading} onValueChange={value => setPreferences(old => ({ ...old, followReading: value }))} />
            </View>
            <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Text size applies to reading passages and live read-along. PDF and image attachments keep their original layout.</Text>
          </>}
          {!!formError && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.primary }]}>{formError}</Text>}
          <View style={styles.actions}>{button("Cancel", () => setMode(null), true)}{button(busy ? "Saving..." : "Save changes", save)}</View>
        </ScrollView>
      </View></View>
    </Modal>
  </Screen>;
}
const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { width: "100%", maxWidth: 680, alignSelf: "center", paddingBottom: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  identity: { alignItems: "center", paddingTop: 22, paddingBottom: 20 },
  arc: { position: "absolute", top: 12, width: 230, height: 100, borderTopLeftRadius: 130, borderTopRightRadius: 130 },
  dot: { position: "absolute", top: 12, left: "63%", width: 34, height: 34, borderRadius: 17 },
  camera: { position: "absolute", right: 0, bottom: 0, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  name: { textAlign: "center", marginTop: 12 },
  photoLink: { minHeight: 38, justifyContent: "center", paddingHorizontal: 12 },
  button: { minHeight: 44, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  section: { ...typography.display.sm, letterSpacing: 1, borderTopWidth: 3, paddingTop: 12, marginTop: 10 },
  info: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: 1 },
  grow: { flex: 1, minWidth: 0 },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 16 },
  tool: { flex: 1, minWidth: 120, gap: 5, paddingVertical: 8 },
  note: { padding: 12, borderRadius: radius.md, marginTop: 12 },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, marginTop: 24 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { maxHeight: "90%", padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  field: { marginTop: 12, gap: 6 },
  input: { borderWidth: 2, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "flex-end", marginTop: 20, marginBottom: 12 },
  sizes: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  size: { paddingHorizontal: 12, paddingVertical: 10, borderWidth: 2, borderRadius: radius.sm, minHeight: 44 },
});
