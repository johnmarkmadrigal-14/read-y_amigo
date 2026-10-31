import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
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
  unsubmitReading,
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
  const [unsubmitting, setUnsubmitting] = useState(false);

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
          <Pressable onPress={load} hitSlop={8}>
            <Text style={[typography.reading.sm, { color: colors.primary, fontWeight: "600" }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const hasTextPassage = item.type === "reading" && (item.readingSource === "text" || (!item.readingSource && !!item.readingText?.trim()));
  const attachment = !hasTextPassage && item.attachment?.name && item.attachment?.url ? item.attachment : null;
  const deadlinePassed = !!item.dueDate && Date.now() >= new Date(item.dueDate).getTime();
  const canUnsubmit = !!submission && !deadlinePassed;
  const canReadAloud =
    item.type === "reading" &&
    (!item.readingActivities?.length || item.readingActivities.includes("read-aloud"));

  return (
    <Screen scroll>
      <View
        style={[
          styles.titleBlock,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backRow}>
          <Ionicons name="arrow-back" size={19} color={colors.textMuted} />
          <Text style={[typography.reading.sm, { color: colors.textMuted, fontWeight: "600" }]}>
            Back
          </Text>
        </Pressable>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          {item.type === "reading" ? "READING ACTIVITY" : item.type.toUpperCase()}
        </Text>
        <View style={styles.titleHeader}>
          <View style={styles.titleTextBlock}>
            <Text style={[typography.display.lg, styles.pageTitle, { color: colors.text }]}>
              {item.title}
            </Text>
          </View>
          <View style={[styles.activityIcon, { backgroundColor: colors.surface }]}>
            <Ionicons
              name={item.type === "reading" ? "book-outline" : "document-text-outline"}
              size={24}
              color={colors.primary}
            />
          </View>
        </View>
      </View>

      <View style={styles.summaryRow}>
        {item.points > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="star-outline" size={19} color={colors.primary} />
            <View style={styles.summaryTextBlock}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>POINTS</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {item.points} {item.points === 1 ? "point" : "points"}
              </Text>
            </View>
          </View>
        )}
        {item.dueDate && (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="calendar-outline" size={19} color={colors.retryText} />
            <View style={styles.summaryTextBlock}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>DUE DATE</Text>
              <Text style={[styles.summaryValue, { color: colors.retryText }]}>
                {new Date(item.dueDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
      </View>

      {!!item.description && (
        <Text style={[typography.reading.sm, styles.description, { color: colors.textMuted }]}>
          {item.description}
        </Text>
      )}

      {hasTextPassage && (
        <View style={styles.section}>
          <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 12 }}>Reading passage</Text>
          <Text selectable style={{ color: colors.text, fontSize: 20, lineHeight: 32 }}>{item.readingText || "The reading passage is unavailable. Please contact your teacher."}</Text>
        </View>
      )}
      {attachment && (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Ionicons name="attach-outline" size={19} color={colors.text} />
            <Text style={[typography.reading.sm, styles.sectionTitle, { color: colors.text }]}>
              Attached file
            </Text>
          </View>
          <Pressable
            onPress={() => setViewerOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: viewerOpen }}
            style={[
              styles.fileCard,
              {
                backgroundColor: colors.surface,
                borderColor: viewerOpen ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={[styles.fileIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name={iconForFile(attachment.name)} size={23} color={colors.primaryText} />
            </View>
            <View style={styles.fileInfo}>
              <Text
                style={[typography.reading.sm, styles.fileName, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {attachment.name}
              </Text>
              <Text style={[typography.reading.sm, styles.fileHint, { color: colors.textMuted }]}>
                {viewerOpen ? "Tap to hide file" : "Tap to view file"}
                {attachment.size ? `  ·  ${formatSize(attachment.size)}` : ""}
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
        </View>
      )}

      {canReadAloud && (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Ionicons name="mic-outline" size={19} color={colors.text} />
            <Text style={[typography.reading.sm, styles.sectionTitle, { color: colors.text }]}>
              Your submission
            </Text>
          </View>
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
          {submission && (
            <View style={styles.unsubmitWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: unsubmitting || !canUnsubmit }}
                disabled={unsubmitting || !canUnsubmit}
                onPress={() => {
                  Alert.alert(
                    "Unsubmit this activity?",
                    "Your recording will be removed from submitted work. You can submit again before the deadline.",
                    [
                      { text: "Keep submission", style: "cancel" },
                      {
                        text: "Unsubmit",
                        style: "destructive",
                        onPress: async () => {
                          if (!canUnsubmit) return;
                          setUnsubmitting(true);
                          try {
                            await unsubmitReading(item._id);
                            setSubmission(null);
                            Alert.alert("Submission undone", "You can now record and submit again before the deadline.");
                          } catch (err) {
                            Alert.alert(
                              "Couldn't unsubmit",
                              err instanceof Error ? err.message : "Please try again."
                            );
                          } finally {
                            setUnsubmitting(false);
                          }
                        },
                      },
                    ]
                  );
                }}
                style={({ pressed }) => [
                  styles.unsubmitButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    opacity: unsubmitting || !canUnsubmit ? 0.45 : pressed ? 0.75 : 1,
                  },
                ]}
              >
                {unsubmitting ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={18} color={colors.text} />
                    <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "700" }]}>Unsubmit</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
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
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
    marginBottom: spacing.md,
  },
  titleBlock: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  titleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  titleTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: spacing.xs,
  },
  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
    marginBottom: spacing.xs,
  },
  description: {
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: "45%",
    minWidth: 130,
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  summaryTextBlock: {
    flex: 1,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  summaryValue: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontWeight: "800",
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  fileIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  fileName: {
    fontWeight: "700",
  },
  fileHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  unsubmitWrap: {
    marginTop: spacing.md,
  },
  unsubmitButton: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
});
