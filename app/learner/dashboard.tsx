// app/learner/dashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Screen } from "../components/Screen";
import {
  ApiLearnerEnrollment,
  ApiUser,
  getMyEnrollments,
  getMyProfile,
} from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

// Same visual palette as the teacher side so classrooms feel consistent.
const CARD_PALETTE = [
  { fill: "#E1F5EE", shadow: "#0F6E56", text: "#04342C" },
  { fill: "#FAECE7", shadow: "#993C1D", text: "#4A1B0C" },
  { fill: "#EEEDFE", shadow: "#534AB7", text: "#26215C" },
];

const SHADOW_OFFSET = 5;

function ClassroomCard({
  enrollment,
  index,
  onPress,
}: {
  enrollment: ApiLearnerEnrollment;
  index: number;
  onPress: () => void;
}) {
  const palette = CARD_PALETTE[index % CARD_PALETTE.length];
  const cls = enrollment.class;

  return (
    <Pressable onPress={onPress} style={styles.cardWrapper}>
      <View style={[styles.cardShadow, { backgroundColor: palette.shadow }]} />
      <View
        style={[
          styles.card,
          { backgroundColor: palette.shadow, borderColor: palette.shadow },
        ]}
      >
        {/* Banner header */}
        <View style={styles.cardBanner}>
          <Text style={styles.cardBannerTitle} numberOfLines={2}>
            {cls.title}
          </Text>
          <Ionicons name="book" size={20} color="rgba(255,255,255,0.8)" />
        </View>
        {/* Body */}
        <View style={[styles.cardBody, { backgroundColor: palette.fill }]}>
          <Text
            style={[typography.reading.sm, { color: palette.text }]}
            numberOfLines={2}
          >
            {cls.description || "Tap to open classroom"}
          </Text>
          <View style={styles.cardFooter}>
            <View style={[styles.codeBadge, { borderColor: palette.shadow }]}>
              <Text
                style={[
                  typography.reading.sm,
                  { color: palette.text, fontWeight: "700", letterSpacing: 1 },
                ]}
              >
                {cls.code}
              </Text>
            </View>
            {enrollment.streakDays > 0 && (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={13} color="#FF8A00" />
                <Text
                  style={[
                    typography.reading.sm,
                    { color: "#B85E00", fontWeight: "700", marginLeft: 3 },
                  ]}
                >
                  {enrollment.streakDays}d streak
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default function LearnerDashboard() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [enrollments, setEnrollments] = useState<ApiLearnerEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [profileData, enrollmentData] = await Promise.all([
        getMyProfile(),
        getMyEnrollments(),
      ]);
      setProfile(profileData);
      // Hide classes the teacher archived, and enrollments whose class no
      // longer exists (populate returns null in that case).
      setEnrollments(
        enrollmentData.filter((e) => e.class && e.class.status === "active")
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't load your classrooms."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
          <Text
            style={[
              typography.reading.sm,
              { color: colors.text, textAlign: "center", marginBottom: spacing.md },
            ]}
          >
            {error}
          </Text>
          <Pressable
            onPress={load}
            style={[styles.retryBtn, { borderColor: colors.border }]}
          >
            <Text
              style={[
                typography.reading.sm,
                { color: colors.text, fontWeight: "600" },
              ]}
            >
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
              Welcome back,
            </Text>
            <Text style={[typography.display.lg, { color: colors.text }]}>
              {profile?.displayName ?? "Learner"}
            </Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text
              style={[typography.display.sm, { color: colors.primaryText }]}
            >
              {getInitials(profile?.displayName ?? "")}
            </Text>
          </View>
        </View>

        <Text
          style={[
            typography.reading.sm,
            { color: colors.textMuted, fontWeight: "600", marginBottom: spacing.sm },
          ]}
        >
          My Classrooms
        </Text>

        {enrollments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="book-outline"
              size={48}
              color={colors.border}
              style={{ marginBottom: spacing.md }}
            />
            <Text
              style={[
                typography.display.md,
                { color: colors.text, textAlign: "center" },
              ]}
            >
              No classrooms yet
            </Text>
            <Text
              style={[
                typography.reading.sm,
                {
                  color: colors.textMuted,
                  textAlign: "center",
                  marginTop: spacing.sm,
                },
              ]}
            >
              Ask your teacher for a classroom code, then tap + to join.
            </Text>
          </View>
        ) : (
          enrollments.map((enrollment, index) => (
            <ClassroomCard
              key={enrollment._id}
              enrollment={enrollment}
              index={index}
              onPress={() =>
                router.push({
                  pathname: "/learner/class/[id]",
                  params: { id: enrollment.class._id },
                })
              }
            />
          ))
        )}
      </ScrollView>

      {/* Floating join button */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push("/learner/join-classroom")}
      >
        <Ionicons name="add" size={28} color={colors.primaryText} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 6,
    paddingTop: spacing.lg,
    paddingBottom: 100,
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
  cardWrapper: {
    marginBottom: spacing.md,
  },
  cardShadow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: SHADOW_OFFSET,
    bottom: -SHADOW_OFFSET,
    borderRadius: radius.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 3,
    overflow: "hidden",
  },
  cardBanner: {
    height: 80,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  cardBannerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 24,
    flex: 1,
    paddingRight: spacing.sm,
  },
  cardBody: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 72,
    justifyContent: "space-between",
  },
  cardFooter: {
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
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  retryBtn: {
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  fab: {
    position: "absolute",
    bottom: spacing.xl,
    alignSelf: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});