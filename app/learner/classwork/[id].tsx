import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { FileViewer } from "../../components/FileViewer";
import { ReadAloudRecorder } from "../../components/ReadAloudRecorder";
import { Screen } from "../../components/Screen";
import {
  ApiClasswork,
  ApiSubmission,
  getFileUrl,
  getLearnerClasswork,
  getMySubmissions,
  submitReading,
} from "../../lib/api";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForFile(name: string): keyof typeof Ionicons.glyphMap {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png"].includes(ext)) return "image-outline";
  if (ext === "pdf") return "document-text-outline";
  return "document-attach-outline";
}

export default function LearnerClassworkScreen() {
  const { colors } = useTheme();
  const { id, classId } = useLocalSearchParams<{ id: string; classId: string }>();

  const [item, setItem] = useState<ApiClasswork | null>(null);
  const [submission, setSubmission] = useState<ApiSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id || !classId) return;
    setLoading(true);
    setError(null);
    try {
      const [all, mySubmissions] = await Promise.all([
        getLearnerClasswork(classId),
        getMySubmissions(classId),
      ]);

      const found = all.find((c) => c._id === id) ?? null;
      if (!found) throw new Error("This classwork is no longer available.");

      setItem(found);
      setSubmission(mySubmissions.find((s) => s.classwork === id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this classwork.");
    } finally {
      setLoading(false);
    }
  }, [id, classId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !item) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text
            style={[
              typography.reading.sm,
              { color: colors.textMuted, textAlign: "center", marginBottom: spacing.md },
            ]}
          >
            {error ?? "Classwork not found."}
          </Text>
          <Pressable onPress={load}>
            <Text style={[typography.reading.sm, { color: colors.primary, fontWeight: "600" }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const attachment = item.attachment?.name && item.attachment?.url ? item.attachment : null;

  const canReadAloud =
    item.type === "reading" &&
    (!item.readingActivities?.length || item.readingActivities.includes("read-aloud"));

  return (
    <Screen scroll>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backRow}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
        <Text style={[typography.reading.sm, { color: colors.text }]}>Back</Text>
      </Pressable>

      <Text style={[typography.display.lg, { color: colors.text }]}>{item.title}</Text>

      <View style={styles.metaRow}>
        {item.points > 0 && (
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
            {item.points} {item.points === 1 ? "point" : "points"}
          </Text>
        )}
        {item.dueDate && (
          <Text style={[typography.reading.sm, { color: colors.retryText }]}>
            Due {new Date(item.dueDate).toLocaleDateString()}
          </Text>
        )}
        {submission && (
          <Text style={[typography.reading.sm, { color: colors.successText, fontWeight: "700" }]}>
            ✓ Submitted
          </Text>
        )}
      </View>

      {!!item.description && (
        <Text style={[typography.reading.sm, { color: colors.text, marginBottom: spacing.md }]}>
          {item.description}
        </Text>
      )}

      {/* ATTACHED FILE CARD */}
      {attachment && (
        <>
          <Pressable
            onPress={() => setViewerOpen((open) => !open)}
            style={[
              styles.fileCard,
              {
                backgroundColor: colors.surface,
                borderColor: viewerOpen ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={[styles.fileIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name={iconForFile(attachment.name)} size={22} color={colors.primaryText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[typography.reading.sm, { color: colors.text, fontWeight: "700" }]}
                numberOfLines={1}
              >
                {attachment.name}
              </Text>
              <Text style={[typography.reading.sm, { color: colors.textMuted, fontSize: 12 }]}>
                {viewerOpen ? "Tap to hide file" : "Tap to view file"}
                {attachment.size ? `  •  ${formatSize(attachment.size)}` : ""}
              </Text>
            </View>
            <Ionicons
              name={viewerOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>

          {viewerOpen && (
            <View style={{ marginTop: spacing.sm }}>
              <FileViewer
                url={getFileUrl(attachment.url)}
                name={attachment.name}
                mimeType={attachment.mimeType}
              />
            </View>
          )}
        </>
      )}

      {/* READ NOW + SUBMIT */}
      {canReadAloud && (
        <View style={{ marginTop: spacing.lg }}>
          <ReadAloudRecorder
            submitted={
              submission
                ? {
                    audioPath: submission.audio.url,
                    durationMs: submission.audio.durationMs,
                    submittedAt: submission.submittedAt,
                  }
                : null
            }
            onSubmit={async (recording) => {
              const created = await submitReading(item._id, recording);
              setSubmission(created);
            }}
          />
        </View>
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
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 3,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});