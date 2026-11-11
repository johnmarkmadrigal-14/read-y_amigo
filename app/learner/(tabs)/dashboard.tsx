import { HeadingLabel } from "../../components/InterfaceChrome";
// app/learner/dashboard.tsx
import { DashboardAction, DashboardEmpty, DashboardWelcome, ReadingClassCard, dashboardLayout } from "../../components/ReadingDashboard";
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
import { Screen } from "../../components/Screen";
import {
  ApiLearnerEnrollment,
  ApiUser,
  getMyEnrollments,
  getMyProfile,
} from "../../lib/api";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";

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
      <ScrollView contentContainerStyle={dashboardLayout.content} showsVerticalScrollIndicator={false}>
        <DashboardWelcome name={profile?.displayName ?? "Learner"} role="Learner" photo={profile?.profilePhoto} count={enrollments.length} />
        <View style={dashboardLayout.section}>
          <HeadingLabel icon="school-outline" style={dashboardLayout.sectionTitle}>My Classrooms</HeadingLabel>
          <Text style={[typography.display.sm, { color: colors.textMuted }]}>
            {enrollments.length} {enrollments.length === 1 ? "class" : "classes"}
          </Text>
        </View>
        {enrollments.length === 0 && <DashboardEmpty />}
        {enrollments.map((enrollment, index) => (
          <ReadingClassCard key={enrollment._id} index={index} title={enrollment.class.title}
            description={enrollment.class.description || "Tap to open classroom"}
            code={enrollment.class.code} streakDays={enrollment.streakDays}
            onOpen={() => router.push({ pathname: "/learner/class/[id]", params: { id: enrollment.class._id } })} />
        ))}
        <DashboardAction label="Join a classroom" onPress={() => router.push("/learner/join-classroom")} />
        <Text style={[dashboardLayout.helper, { color: colors.textMuted }]}>Have a class code? Start here.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
