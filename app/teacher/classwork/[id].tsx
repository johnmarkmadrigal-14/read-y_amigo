import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AudioPlayerBar, formatTime, useAuthorizedAudioSource } from "../../components/AudioPlayerBar";
import { Screen } from "../../components/Screen";
import {
  ApiClassworkSubmissions,
  ApiSubmission,
  getClassworkSubmissions,
} from "../../lib/api";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";

function learnerName(submission: ApiSubmission) {
  if (typeof submission.learner === "string") return "Learner";
  return (
    submission.learner.displayName ||
    `${submission.learner.firstName ?? ""} ${submission.learner.secondName ?? ""}`.trim() ||
    "Learner"
  );
}

function SubmissionCard({ submission }: { submission: ApiSubmission }) {
  const { colors } = useTheme();
  const source = useAuthorizedAudioSource(submission.audio.url);

  return (
    <View style={{ marginBottom: spacing.md }}>
      <AudioPlayerBar
        source={source}
        title={learnerName(submission)}
        subtitle={`${
          submission.audio.durationMs ? `${formatTime(submission.audio.durationMs)}  •  ` : ""
        }Submitted ${new Date(submission.submittedAt).toLocaleString()}`}
      />
    </View>
  );
}

export default function TeacherClassworkSubmissions() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [data, setData] = useState<ApiClassworkSubmissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setData(await getClassworkSubmissions(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load submissions.");
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  if (error || !data) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text
            style={[
              typography.reading.sm,
              { color: colors.textMuted, textAlign: "center", marginBottom: spacing.md },
            ]}
          >
            {error ?? "Couldn't load submissions."}
          </Text>
          <Pressable onPress={load}>
            <Text style={[typography.reading.sm, { color: colors.primary, fontWeight: "700" }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backRow}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
        <Text style={[typography.reading.sm, { color: colors.text }]}>Back</Text>
      </Pressable>

      <Text style={[typography.display.lg, { color: colors.text }]}>Submissions</Text>
      <Text style={[typography.reading.sm, { color: colors.textMuted, marginBottom: spacing.lg }]}>
        {data.classwork.title}
      </Text>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryTile, { borderColor: colors.border }]}>
          <Text style={[typography.display.md, { color: colors.text }]}>
            {data.submissions.length}
          </Text>
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Submitted</Text>
        </View>
        <View style={[styles.summaryTile, { borderColor: colors.border }]}>
          <Text style={[typography.display.md, { color: colors.text }]}>
            {data.notSubmitted.length}
          </Text>
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Not yet</Text>
        </View>
      </View>

      {data.submissions.length === 0 ? (
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
          No recordings have been submitted yet.
        </Text>
      ) : (
        data.submissions.map((submission) => (
          <SubmissionCard key={submission._id} submission={submission} />
        ))
      )}

      {data.notSubmitted.length > 0 && (
        <>
          <Text
            style={[
              typography.display.sm,
              { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
            ]}
          >
            Not submitted yet
          </Text>
          {data.notSubmitted.map((learner) => (
            <View
              key={learner._id}
              style={[styles.pendingRow, { borderColor: colors.border }]}
            >
              <Ionicons name="time-outline" size={18} color={colors.textMuted} />
              <Text style={[typography.reading.sm, { color: colors.text }]}>
                {learner.displayName}
              </Text>
            </View>
          ))}
        </>
      )}
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
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryTile: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});