import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { API_ORIGIN, ApiClasswork, ApiMaterial } from "../../lib/api";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/tokens";

/* =========================================================
   SHARED HELPERS (also used by the learner class screen)
   ========================================================= */

export function classworkTypeLabel(type: ApiClasswork["type"]) {
  switch (type) {
    case "reading":
      return "Reading Assignment";
    case "activity":
      return "Activity";
    case "quiz":
      return "Quiz";
    default:
      return "Classwork";
  }
}

export function classworkIconName(
  type: ApiClasswork["type"]
): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "reading":
      return "book-outline";
    case "activity":
      return "create-outline";
    case "quiz":
      return "help-circle-outline";
    default:
      return "clipboard-outline";
  }
}

export function formatDueDateTime(dateString?: string) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function openRemoteUrl(rawUrl: string) {
  const url = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : `${API_ORIGIN}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

  try {
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert("Cannot open file", "This file cannot be opened on this device.");
      return;
    }

    await Linking.openURL(url);
  } catch {
    Alert.alert("Cannot open file", "Unable to open this file.");
  }
}

/* =========================================================
   DETAILS SHEET
   ========================================================= */

export default function ClassworkDetailsSheet({
  item,
  onClose,
}: {
  item: ApiClasswork | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();

  const material =
    item && item.material && typeof item.material === "object"
      ? (item.material as ApiMaterial)
      : null;

  const metaCard = [
    styles.metaCard,
    { backgroundColor: colors.background, borderColor: colors.border },
  ];

  return (
    <Modal
      visible={!!item}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {item ? (
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            {/* HEADER */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.kicker, { color: colors.primary }]}>
                  {classworkTypeLabel(item.type).toUpperCase()}
                </Text>
                <Text style={[styles.title, { color: colors.text }]}>
                  {item.title}
                </Text>
              </View>

              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={25} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {/* INSTRUCTIONS */}
              <Text style={[styles.label, { color: colors.textMuted }]}>
                INSTRUCTIONS
              </Text>
              <Text style={[styles.description, { color: colors.text }]}>
                {item.description?.trim() || "No instructions provided."}
              </Text>

              {/* POINTS */}
              <View style={metaCard}>
                <Ionicons name="star-outline" size={20} color={colors.primary} />
                <View>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                    POINTS
                  </Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {item.points} {item.points === 1 ? "point" : "points"}
                  </Text>
                </View>
              </View>

              {/* DUE */}
              {item.dueDate ? (
                <View style={metaCard}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <View>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                      DUE DATE
                    </Text>
                    <Text style={[styles.metaValue, { color: colors.text }]}>
                      {formatDueDateTime(item.dueDate)}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* READING ACTIVITIES */}
              {item.type === "reading" && item.readingActivities?.length ? (
                <View style={[styles.sectionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                    READING ACTIVITIES
                  </Text>

                  <View style={styles.chipRow}>
                    {item.readingActivities.map((activity) => (
                      <View
                        key={activity}
                        style={[styles.chip, { backgroundColor: colors.primary }]}
                      >
                        <Ionicons
                          name={
                            activity === "read-aloud"
                              ? "mic-outline"
                              : "help-circle-outline"
                          }
                          size={13}
                          color={colors.primaryText}
                        />
                        <Text style={[styles.chipText, { color: colors.primaryText }]}>
                          {activity === "read-aloud" ? "Read Aloud" : "Comprehension"}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* MATERIAL */}
              {material ? (
                <Pressable
                  disabled={!material.fileUrl}
                  onPress={() => material.fileUrl && openRemoteUrl(material.fileUrl)}
                  style={metaCard}
                >
                  <Ionicons name="folder-open-outline" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                      LEARNING MATERIAL
                    </Text>
                    <Text
                      style={[styles.metaValue, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {material.title}
                    </Text>
                  </View>
                  {material.fileUrl ? (
                    <Ionicons name="open-outline" size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              ) : null}

              {/* ATTACHMENT */}
              {item.attachment?.name ? (
                <Pressable
                  onPress={() =>
                    item.attachment?.url && openRemoteUrl(item.attachment.url)
                  }
                  style={metaCard}
                >
                  <Ionicons name="attach-outline" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                      ATTACHMENT · TAP TO OPEN
                    </Text>
                    <Text
                      style={[styles.metaValue, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {item.attachment.name}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color={colors.primary} />
                </Pressable>
              ) : null}

              {/* QUIZ QUESTIONS (no answers — the server strips them) */}
              {item.type === "quiz" && item.questions?.length ? (
                <View style={{ marginTop: 6 }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    QUESTIONS · {item.questions.length}
                  </Text>

                  {item.questions.map((question, index) => (
                    <View
                      key={question._id ?? `q-${index}`}
                      style={[
                        styles.questionCard,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                    >
                      <View style={styles.questionTop}>
                        <Text style={[styles.questionNumber, { color: colors.primary }]}>
                          QUESTION {index + 1}
                        </Text>
                        <Text style={[styles.questionPoints, { color: colors.textMuted }]}>
                          {question.points ?? 1} pt
                          {(question.points ?? 1) === 1 ? "" : "s"}
                        </Text>
                      </View>

                      <Text style={[styles.questionText, { color: colors.text }]}>
                        {question.question}
                      </Text>

                      {question.type === "multiple-choice" ||
                      question.type === "checkboxes" ||
                      question.type === "true-false" ? (
                        (question.choices ?? []).map((choice, choiceIndex) => (
                          <View
                            key={`c-${choiceIndex}`}
                            style={[
                              styles.choiceRow,
                              { borderColor: colors.border, backgroundColor: colors.surface },
                            ]}
                          >
                            <View style={[styles.choiceBadge, { backgroundColor: colors.primary }]}>
                              <Text style={[styles.choiceBadgeText, { color: colors.primaryText }]}>
                                {String.fromCharCode(65 + choiceIndex)}
                              </Text>
                            </View>
                            <Text style={[styles.choiceText, { color: colors.text }]}>
                              {choice}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.freeText, { color: colors.textMuted }]}>
                          {question.type === "essay"
                            ? "Essay answer"
                            : "Short answer"}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              ) : null}

              <Pressable
                onPress={onClose}
                style={[styles.doneButton, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>
                  Done
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: spacing.md,
  },
  sheet: {
    maxHeight: "90%",
    borderRadius: 22,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  kicker: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  title: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
  },
  label: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  metaCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 12,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "800",
  },
  questionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 9,
  },
  questionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  questionNumber: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  questionPoints: {
    fontSize: 10,
    fontWeight: "700",
  },
  questionText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 5,
    marginBottom: 8,
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
  },
  choiceBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  choiceText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 9,
  },
  freeText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  doneButton: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
});