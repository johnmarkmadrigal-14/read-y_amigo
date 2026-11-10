import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../app/theme/ThemeProvider";
import { radius, typography } from "../app/theme/tokens";

// Existing classroom colors, now assigned consistently to sections and work types.
export const classroomAccents = {
  reading: { fill: "#E1F5EE", ink: "#0F6E56" },
  activity: { fill: "#FAECE7", ink: "#993C1D" },
  quiz: { fill: "#EEEDFE", ink: "#534AB7" },
};
type Section = "Stream" | "Classwork" | "Materials" | "Library" | "Learners" | "Progress" | "People";
const icons: Record<Section, keyof typeof Ionicons.glyphMap> = {
  Stream: "megaphone-outline", Classwork: "clipboard-outline", Materials: "folder-open-outline", Library: "library-outline",
  Learners: "people-outline", Progress: "analytics-outline", People: "people-outline",
};

export function ClassroomHeader({ title, description, count, role, code, copied, onBack, onMenu, onCopy }: {
  title: string; description?: string; count: number; role: "Teacher" | "Learner";
  code?: string; copied?: boolean; onBack: () => void; onMenu?: () => void; onCopy?: () => void;
}) {
  const { colors } = useTheme();
  return <View>
    <View style={styles.topRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack}
        style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <Ionicons name="arrow-back" size={22} color={colors.primary} />
      </Pressable>
      <Text style={[typography.display.md, styles.brand, { color: colors.primary }]}>READ-Y AMIGO</Text>
      <View style={[styles.role, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[typography.display.sm, { color: colors.text }]}>{role}</Text>
      </View>
      {onMenu && <Pressable accessibilityRole="button" accessibilityLabel="Class options" onPress={onMenu}
        style={styles.iconButton}>
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.primary} />
      </Pressable>}
    </View>
    <View style={styles.coverWrapper}>
      <View style={[styles.coverShadow, { backgroundColor: colors.primaryShadow }]} />
      <View style={[styles.cover, { backgroundColor: colors.primary }]}>
        <Ionicons accessible={false} name="bookmark" size={28} color={colors.secondary} style={styles.bookmark} />
        <View style={styles.coverRow}>
          <View style={styles.coverText}>
            <Text accessibilityRole="header" style={[typography.display.lg, { color: colors.primaryText }]}>{title}</Text>
            {!!description && <Text numberOfLines={2} style={[typography.reading.sm, { color: colors.primaryText, marginTop: 4 }]}>{description}</Text>}
          </View>
          <Ionicons accessible={false} name="book-outline" size={58} color={colors.primaryText} style={styles.bookArt} />
        </View>
        <View style={styles.metadata}>
          {code && onCopy && <Pressable onPress={onCopy} accessibilityRole="button"
            accessibilityLabel={copied ? "Class code copied" : `Copy class code ${code}`}
            style={[styles.code, { backgroundColor: colors.surface }]}>
            <Ionicons name={copied ? "checkmark" : "copy-outline"} size={17} color={colors.text} />
            <Text style={[typography.display.sm, { color: colors.text }]}>{code}</Text>
          </Pressable>}
          <View style={styles.people}>
            <Ionicons accessible={false} name="people-outline" size={18} color={colors.primaryText} />
            <Text style={[typography.display.sm, { color: colors.primaryText }]}>{count} {count === 1 ? "learner" : "learners"}</Text>
          </View>
        </View>
      </View>
    </View>
  </View>;
}

export function ClassroomTabs<T extends Section>({ tabs, active, onSelect }: {
  tabs: readonly T[]; active: T; onSelect: (tab: T) => void;
}) {
  const { colors } = useTheme();
  const dark = colors.background !== "#FFFFFF";
  return <View accessibilityRole="tablist" style={styles.tabs}>
    {tabs.map(tab => {
      const selected = active === tab;
      const accent = (tab === "Materials" || tab === "Library") ? classroomAccents.quiz
        : tab === "Learners" || tab === "People" ? classroomAccents.reading
        : tab === "Progress" ? classroomAccents.activity : null;
      const ink = selected ? colors.primaryText : dark ? colors.text : accent?.ink ?? colors.text;
      return <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected }}
        onPress={() => onSelect(tab)} style={({ pressed }) => [styles.tab,
          { flexBasis: tabs.length === 5 && tabs.indexOf(tab) < 3 ? "30%" : "45%",
            backgroundColor: selected ? colors.primary : dark ? colors.surface : accent?.fill ?? colors.surface,
            borderColor: selected ? colors.primary : dark ? colors.border : accent?.ink ?? colors.border,
            opacity: pressed ? 0.7 : 1 }]}>
        <Ionicons accessible={false} name={icons[tab]} size={18} color={ink} />
        <Text style={[typography.display.sm, { color: ink, flexShrink: 1, textAlign: "center" }]}>{tab}</Text>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 10 },
  iconButton: { minWidth: 40, minHeight: 40, borderRadius: radius.sm, justifyContent: "center", alignItems: "center" },
  brand: { flex: 1, minWidth: 0 },
  role: { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6 },
  coverWrapper: { marginBottom: 15 },
  coverShadow: { position: "absolute", top: 5, bottom: -5, left: 0, right: 0, borderRadius: radius.lg },
  cover: { borderRadius: radius.lg, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 10 },
  bookmark: { position: "absolute", left: 12, top: -3 },
  coverRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  coverText: { flex: 1, minWidth: 0 },
  bookArt: { transform: [{ rotate: "-10deg" }] },
  metadata: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 8 },
  code: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.sm, minHeight: 40 },
  people: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  tab: { flexGrow: 1, minHeight: 44, borderWidth: 1.5, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 6, paddingVertical: 8 },
});
