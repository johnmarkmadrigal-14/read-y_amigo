import { UserAvatar } from "../../components/UserAvatar";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

// Keep the classrooms' established colors, shared by both dashboard roles.
const CLASS_PALETTE = [
  { fill: "#E1F5EE", shadow: "#0F6E56", text: "#04342C" },
  { fill: "#FAECE7", shadow: "#993C1D", text: "#4A1B0C" },
  { fill: "#EEEDFE", shadow: "#534AB7", text: "#26215C" },
];

export function DashboardWelcome({ name, role, count, photo }: {
  name: string; photo?: string; role: "Teacher" | "Learner"; count: number;
}) {
  const { colors } = useTheme();
  const teacher = role === "Teacher";
  return (
    <>
      <View style={styles.brandRow}>
        <View style={styles.brand}>
          <Image source={require("../../assets/images/logo.png")} resizeMode="contain"
            style={styles.logo} accessible={false} />
          <Text style={[typography.display.md, { color: colors.primary, flexShrink: 1 }]}>READ-Y{"\n"}AMIGO</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.secondaryShadow }]}>
          <Text style={[typography.display.sm, { color: colors.text }]}>{role}</Text>
        </View>
        <UserAvatar name={name} photo={photo} size={42} />
      </View>
      <View style={styles.greeting}>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
          {teacher ? "Hello," : "Welcome back,"}
        </Text>
        <Text accessibilityRole="header" style={[typography.display.xl, { color: colors.text }]}>{name}!</Text>
      </View>
      <View style={[styles.welcome, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={styles.ribbon}>
          <Ionicons name="bookmark" size={38} color={colors.secondary} />
        </View>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text accessibilityRole="header" style={[typography.display.lg, { color: colors.primary }]}>
              {teacher ? "Your reading corner" : "Ready for a new chapter?"}
            </Text>
            <Text style={[typography.reading.sm, { color: colors.text, marginTop: spacing.sm }]}>
              {teacher ? "A little guidance. A world of stories." : "Your next story starts in class."}
            </Text>
          </View>
          <View style={styles.illustration} accessible={false}
            accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Ionicons name="sparkles" size={22} color={colors.secondaryShadow} style={styles.sparkle} />
            <View style={[styles.bookShadow, { backgroundColor: colors.primaryShadow }]} />
            <View style={[styles.book, { backgroundColor: colors.background, borderColor: colors.primary }]}>
              <Ionicons name="book-outline" size={66} color={colors.primary} />
            </View>
            <Ionicons name={teacher ? "pencil" : "chatbubble-ellipses-outline"} size={30}
              color={colors.secondaryShadow} style={styles.bookAccessory} />
          </View>
        </View>
        <View style={[styles.heroBadge, { borderColor: colors.secondaryShadow }]}>
          <Ionicons name={teacher ? "school-outline" : "book-outline"} size={17} color={colors.text} />
          <Text style={[typography.display.sm, { color: colors.text }]}>
            {teacher ? `${count} active ${count === 1 ? "class" : "classes"}` : "Let's keep reading"}
          </Text>
        </View>
      </View>
    </>
  );
}

export function ReadingClassCard({ title, description, code, index, learnerCount, streakDays = 0,
  onOpen, onMenu, onCopy }: {
  title: string; description: string; code: string; index: number;
  learnerCount?: number; streakDays?: number;
  onOpen: () => void; onMenu?: () => void; onCopy?: () => void;
}) {
  const { colors } = useTheme();
  const palette = CLASS_PALETTE[index % CLASS_PALETTE.length];
  return (
    <View style={styles.cardWrapper}>
      <View style={[styles.cardShadow, { backgroundColor: palette.shadow }]} />
      <View style={[styles.card, { backgroundColor: palette.fill, borderColor: palette.shadow }]}>
        <View style={[styles.cardHeader, { backgroundColor: palette.shadow }]}>
          <Ionicons name="bookmark" size={28} color={colors.secondary} accessible={false} />
          <Text accessibilityRole="header" style={[typography.display.md, styles.cardTitle, { color: "#FFFFFF" }]}>{title}</Text>
          {onMenu && <Pressable accessibilityRole="button" accessibilityLabel={`More options for ${title}`}
            onPress={onMenu} style={({ pressed }) => [styles.menu, { opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
          </Pressable>}
        </View>
        <View style={styles.cardBody}>
          <Text style={[typography.reading.sm, { color: palette.text }]}>{description}</Text>
          <View style={styles.metadata}>
            {onCopy ? <Pressable onPress={onCopy} accessibilityRole="button"
              accessibilityLabel={`Copy class code ${code}`} style={({ pressed }) => [styles.code,
                { borderColor: palette.shadow, opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="copy-outline" size={17} color={palette.text} />
              <Text style={[typography.reading.sm, { color: palette.text }]}>{code}</Text>
            </Pressable> : <View style={[styles.code, { borderColor: palette.shadow }]}>
              <Ionicons name="key-outline" size={17} color={palette.text} accessible={false} />
              <Text style={[typography.reading.sm, { color: palette.text }]}>{code}</Text>
            </View>}
            {learnerCount !== undefined && <Text style={[typography.reading.sm, { color: palette.text }]}>
              {learnerCount} {learnerCount === 1 ? "learner" : "learners"}
            </Text>}
            {streakDays > 0 && <View style={[styles.streak, { backgroundColor: colors.surface, borderColor: colors.secondaryShadow }]}>
              <Ionicons name="flame" size={18} color={colors.retry} accessible={false} />
              <Text style={[typography.display.sm, { color: colors.text }]}>{streakDays}-day streak</Text>
            </View>}
          </View>
          <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open classroom ${title}`}
            style={({ pressed }) => [styles.open, { backgroundColor: palette.shadow, opacity: pressed ? 0.75 : 1 }]}>
            <Text style={[typography.display.md, { color: "#FFFFFF", flexShrink: 1 }]}>Open classroom</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" accessible={false} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function DashboardAction({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <View style={styles.actionWrapper}>
    <View style={[styles.actionShadow, { backgroundColor: colors.primaryShadow }]} />
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [styles.action, { backgroundColor: colors.primary,
        transform: [{ translateY: pressed ? 4 : 0 }] }]}>
      <Ionicons name="add" size={26} color={colors.primaryText} accessible={false} />
      <Text style={[typography.display.md, { color: colors.primaryText, flexShrink: 1, textAlign: "center" }]}>{label}</Text>
    </Pressable>
  </View>;
}

export function DashboardEmpty({ teacher = false }: { teacher?: boolean }) {
  const { colors } = useTheme();
  return <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Ionicons name="library-outline" size={38} color={colors.primary} accessible={false} />
    <Text style={[typography.display.md, { color: colors.text, textAlign: "center" }]}>
      {teacher ? "Your reading corner starts here" : "Your first chapter awaits"}
    </Text>
    <Text style={[typography.reading.sm, { color: colors.textMuted, textAlign: "center" }]}>
      {teacher ? "Create your first class and welcome your readers." : "Ask your teacher for a class code, then choose Join a classroom below."}
    </Text>
  </View>;
}

export const dashboardLayout = StyleSheet.create({
  content: { flexGrow: 1, width: "100%", maxWidth: 720, alignSelf: "center", paddingTop: spacing.sm, paddingBottom: spacing.lg },
  section: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { ...typography.display.md },
  helper: { ...typography.reading.sm, textAlign: "center", marginTop: spacing.md },
});

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  brand: { flexDirection: "row", alignItems: "center", gap: 6, marginRight: "auto", flexShrink: 1 },
  logo: { width: 48, height: 48 },
  badge: { borderWidth: 2, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  greeting: { marginBottom: spacing.lg },
  welcome: { borderWidth: 1.5, borderRadius: radius.lg, padding: spacing.md, paddingTop: spacing.lg, marginBottom: spacing.lg },
  ribbon: { position: "absolute", top: -5, left: 12 },
  heroRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  heroCopy: { flexGrow: 1, flexShrink: 1, flexBasis: 150, paddingTop: spacing.sm },
  illustration: { width: 106, height: 114, alignItems: "center", justifyContent: "center" },
  sparkle: { position: "absolute", top: 0, left: 4 },
  bookShadow: { position: "absolute", width: 88, height: 72, borderRadius: 12, transform: [{ rotate: "-10deg" }], top: 35 },
  book: { width: 88, height: 72, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-10deg" }] },
  bookAccessory: { position: "absolute", top: 12, right: 0 },
  heroBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 2, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, marginTop: spacing.md },
  cardWrapper: { marginBottom: spacing.lg },
  cardShadow: { position: "absolute", top: 5, bottom: -5, left: 0, right: 0, borderRadius: radius.lg },
  card: { borderWidth: 2, borderRadius: radius.lg, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", paddingLeft: 12, paddingRight: 6, paddingVertical: spacing.sm, gap: spacing.sm, minHeight: 58 },
  cardTitle: { flex: 1, minWidth: 0 },
  menu: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  cardBody: { padding: spacing.md, gap: spacing.sm },
  metadata: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginVertical: 4 },
  code: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, minHeight: 44 },
  streak: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: spacing.sm },
  open: { minHeight: 44, borderRadius: radius.full, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: 12 },
  actionWrapper: { marginTop: spacing.sm, marginBottom: 5 },
  actionShadow: { position: "absolute", top: 5, bottom: -5, left: 0, right: 0, borderRadius: radius.md },
  action: { borderRadius: radius.md, padding: spacing.md, minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  empty: { borderWidth: 2, borderStyle: "dashed", borderRadius: radius.lg, padding: spacing.lg, alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
});
