import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import ClassStream from "../../components/teacher/ClassStream";

import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
  Switch,
    Text,
    TextInput,
    View,
} from "react-native";

import { Screen } from "../../components/Screen";

import {
    ApiClass,
    ApiClasswork,
    ApiEnrollment,
  ApiMaterial,
    ApiUser,
  ApiQuizQuestion,
  QuizQuestionType,
  QuizType,
  ReadingActivity,
    createClasswork,
  createClassworkWithFile,
  createMaterial,
    deleteClass,
  deleteMaterial,
    getClass,
    getClasswork,
    getLearners,
  getMaterials,
    getMyProfile,
    getProgress,
    updateClass,
} from "../../lib/api";

import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";

/* =========================================================
   CONSTANTS
   ========================================================= */

const TABS = [
  "Stream",
  "Classwork",
  "Materials",
  "Learners",
  "Progress",
] as const;

type Tab = (typeof TABS)[number];

type ClassworkDisplayType =
  | "Reading Assignment"
  | "Activity"
  | "Quiz";

const BANNER_PALETTE = [
  { bg: "#0F6E56", accent: "#E1F5EE" },
  { bg: "#993C1D", accent: "#FAECE7" },
  { bg: "#534AB7", accent: "#EEEDFE" },
];

const CLASSWORK_TYPES: {
  type: ClassworkDisplayType;
  apiType: "reading" | "activity" | "quiz";
  icon: string;
  sub: string;
}[] = [
  {
    type: "Reading Assignment",
    apiType: "reading",
    icon: "book-outline",
    sub: "Reading + comprehension",
  },
  {
    type: "Activity",
    apiType: "activity",
    icon: "create-outline",
    sub: "Learning task or file",
  },
  {
    type: "Quiz",
    apiType: "quiz",
    icon: "help-circle-outline",
    sub: "Questions and answers",
  },
];

const QUIZ_TYPES: {
  value: QuizType;
  label: string;
  icon: string;
}[] = [
  {
    value: "multiple-choice",
    label: "Multiple Choice",
    icon: "radio-button-on-outline",
  },
  {
    value: "checkboxes",
    label: "Checkboxes",
    icon: "checkbox-outline",
  },
  {
    value: "true-false",
    label: "True / False",
    icon: "swap-horizontal-outline",
  },
  {
    value: "short-answer",
    label: "Short Answer",
    icon: "text-outline",
  },
  {
    value: "essay",
    label: "Essay",
    icon: "document-text-outline",
  },
  {
    value: "mixed",
    label: "Mixed",
    icon: "layers-outline",
  },
];

const QUESTION_TYPES: {
  value: QuizQuestionType;
  label: string;
}[] = [
  {
    value: "multiple-choice",
    label: "Multiple Choice",
  },
  {
    value: "checkboxes",
    label: "Checkboxes",
  },
  {
    value: "true-false",
    label: "True / False",
  },
  {
    value: "short-answer",
    label: "Short Answer",
  },
  {
    value: "essay",
    label: "Essay",
  },
];

/* =========================================================
   HELPERS
   ========================================================= */

function bannerForClassId(classId: string) {
  let hash = 0;

  for (let i = 0; i < classId.length; i++) {
    hash =
      (hash * 31 + classId.charCodeAt(i)) %
      BANNER_PALETTE.length;
  }

  return BANNER_PALETTE[
    Math.abs(hash) % BANNER_PALETTE.length
  ];
}

// "2m ago" / "3h ago" / "Yesterday" / "Sep 10" - same rhythm as Classroom's
// post timestamps, which fall back to a plain date after about a week.
function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function materialIcon(type: ApiMaterial["type"]) {
  switch (type) {
    case "document":
      return "document-text-outline";

    case "video":
      return "play-circle-outline";

    case "link":
      return "link-outline";

    case "image":
      return "image-outline";

    default:
      return "folder-outline";
  }
}

function displayTypeFromApi(
  type: ApiClasswork["type"]
): ClassworkDisplayType {
  switch (type) {
    case "reading":
      return "Reading Assignment";

    case "activity":
      return "Activity";

    case "quiz":
      return "Quiz";

    default:
      return "Activity";
  }
}

function apiTypeFromDisplay(
  type: ClassworkDisplayType
): "reading" | "activity" | "quiz" {
  switch (type) {
    case "Reading Assignment":
      return "reading";

    case "Quiz":
      return "quiz";

    default:
      return "activity";
  }
}

function classworkIcon(
  type: ClassworkDisplayType
) {
  switch (type) {
    case "Reading Assignment":
      return "book-outline";

    case "Activity":
      return "create-outline";

    case "Quiz":
      return "help-circle-outline";

    default:
      return "clipboard-outline";
  }
}

function formatDueDate(dateString?: string) {
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

function createEmptyQuestion(): ApiQuizQuestion {
  return {
    type: "multiple-choice",
    question: "",
    choices: ["", "", "", ""],
    correctAnswer: 0,
    points: 1,
  };
}

/* =========================================================
   MAIN CLASS DETAIL
   ========================================================= */

export default function ClassDetail() {
  const { colors } = useTheme();

  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const classId = id ?? "";

  const [activeTab, setActiveTab] =
    useState<Tab>("Stream");

  const [
    sectionMenuVisible,
    setSectionMenuVisible,
  ] = useState(false);

  const [
    classInfo,
    setClassInfo,
  ] = useState<{
    class: ApiClass;
    learnerCount: number;
  } | null>(null);

  const [
    teacherProfile,
    setTeacherProfile,
  ] = useState<ApiUser | null>(null);

  const [classwork, setClasswork] =
    useState<ApiClasswork[]>([]);

  const [materials, setMaterials] =
    useState<ApiMaterial[]>([]);

  const [learners, setLearners] =
    useState<ApiEnrollment[]>([]);

  const [progress, setProgress] =
    useState<ApiEnrollment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [copied, setCopied] =
    useState(false);

  /* =======================================================
     EDIT CLASS
     ======================================================= */

  const [editVisible, setEditVisible] =
    useState(false);

  const [editTitle, setEditTitle] =
    useState("");

  const [
    editDescription,
    setEditDescription,
  ] = useState("");

  const [savingEdit, setSavingEdit] =
    useState(false);

  const loadEverything =
    useCallback(async () => {
    if (!classId) return;

    setLoading(true);
    setError(null);

    try {
        const [
          info,
          profile,
          work,
          materialList,
          learnerList,
          progressList,
        ] = await Promise.all([
        getClass(classId),
        getMyProfile(),
        getClasswork(classId),
          getMaterials(classId),
        getLearners(classId),
        getProgress(classId),
      ]);

      setClassInfo(info);
      setTeacherProfile(profile);
      setClasswork(work);
        setMaterials(materialList);
      setLearners(learnerList);
      setProgress(progressList);
    } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't load this class."
        );
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadEverything();
  }, [loadEverything]);

  const handleCopyCode = async () => {
    if (!classInfo?.class.code) return;

    await Clipboard.setStringAsync(
      classInfo.class.code
    );

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  const openEditModal = () => {
    setEditTitle(
      classInfo?.class.title ?? ""
    );

    setEditDescription(
      classInfo?.class.description ?? ""
    );

    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert(
        "Title required",
        "Please enter a class title."
      );
      return;
    }

    setSavingEdit(true);

    try {
      const updated =
        await updateClass(classId, {
        title: editTitle.trim(),
          description:
            editDescription.trim() ||
            undefined,
      });

      setClassInfo((previous) =>
        previous
          ? {
              ...previous,
              class: updated,
            }
          : previous
      );

      setEditVisible(false);
    } catch (err) {
      Alert.alert(
        "Couldn't update class",
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleArchive = async () => {
    try {
      await deleteClass(classId);

      router.replace(
        "/teacher/dashboard"
      );
    } catch (err) {
      Alert.alert(
        "Couldn't archive class",
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    }
  };

  const confirmArchive = () => {
    Alert.alert(
      "Archive this class?",
      "It'll move to Archived Classes. You can restore it later.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Archive",
          style: "destructive",
          onPress: handleArchive,
        },
      ]
    );
  };

  const openMenu = () => {
    Alert.alert(
      classInfo?.class.title ??
        "Class options",
      undefined,
      [
        {
          text: "Edit class",
          onPress: openEditModal,
        },
        {
          text: "Archive class",
          style: "destructive",
          onPress: confirmArchive,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
  ];

  if (loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator
            color={colors.primary}
          />
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
              {
                color: colors.textMuted,
                marginBottom: spacing.md,
                textAlign: "center",
              },
            ]}
          >
            {error}
          </Text>

          <Pressable
            onPress={loadEverything}
          >
            <Text
              style={[
                typography.reading.sm,
                {
                  color: colors.primary,
                  fontWeight: "700",
                },
              ]}
            >
              Try again
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const banner =
    bannerForClassId(classId);

  const iconForTab = (tab: Tab) => {
    switch (tab) {
      case "Stream":
        return "megaphone-outline";

      case "Classwork":
        return "clipboard-outline";

      case "Materials":
        return "folder-open-outline";

      case "Learners":
        return "people-outline";

      case "Progress":
        return "analytics-outline";

      default:
        return "grid-outline";
    }
  };

  const renderTabContent = () => {
    if (activeTab === "Stream") {
      return (
        <View style={styles.streamArea}>
          <ClassStream
            classId={classId}
            teacherName={
              teacherProfile?.displayName ??
              "Teacher"
            }
            classwork={classwork}
          />
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={
          styles.contentContainer
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.pageHeading}>
          <View>
            <Text
              style={[
                styles.pageKicker,
                {
                  color: colors.primary,
                },
              ]}
            >
              CLASS{" "}
              {activeTab === "Classwork"
                ? "TASKS"
                : activeTab === "Materials"
                ? "RESOURCES"
                : activeTab ===
                  "Learners"
                ? "ROSTER"
                : "OVERVIEW"}
            </Text>

            <Text
              style={[
                styles.pageTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              {activeTab}
            </Text>
          </View>

          <View
            style={[
              styles.pageDot,
              {
                backgroundColor:
                  colors.primary,
              },
            ]}
          />
        </View>

        {activeTab === "Classwork" && (
          <ClassworkTab
            classId={classId}
            items={classwork}
            learners={learners}
            materials={materials}
            colors={colors}
            onCreated={loadEverything}
          />
        )}

        {activeTab === "Materials" && (
          <MaterialsTab
            classId={classId}
            materials={materials}
            cardStyle={cardStyle}
            colors={colors}
            onChanged={loadEverything}
          />
        )}

        {activeTab === "Learners" && (
          <LearnersTab
            learners={learners}
            cardStyle={cardStyle}
            colors={colors}
          />
        )}

        {activeTab === "Progress" && (
          <ProgressTab
            progress={progress}
            cardStyle={cardStyle}
            colors={colors}
          />
        )}
      </ScrollView>
    );
  };

  return (
    <Screen>
      {/* =====================================================
          HERO
          ===================================================== */}

      <View
        style={[
          styles.hero,
          styles.edgeToEdge,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.heroAccent,
            {
              backgroundColor: banner.bg,
            },
          ]}
        />

        <View style={styles.heroTopRow}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.roundIcon,
              {
                backgroundColor:
                  colors.background,
              },
            ]}
            hitSlop={8}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={colors.text}
            />
          </Pressable>

          <View
            style={styles.heroTitleWrap}
          >
            <Text
              style={[
                styles.heroOverline,
                {
                  color: colors.textMuted,
                },
              ]}
            >
              MY CLASS
            </Text>

            <Text
              style={[
                styles.heroTitle,
                {
                  color: colors.text,
                },
              ]}
              numberOfLines={1}
            >
              {classInfo?.class.title ??
                "Class"}
            </Text>
          </View>

          <Pressable
            onPress={openMenu}
            style={[
              styles.roundIcon,
              {
                backgroundColor:
                  colors.background,
              },
            ]}
            hitSlop={8}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={21}
              color={colors.text}
            />
          </Pressable>
        </View>

        <View style={styles.heroInfo}>
          <View
            style={[
              styles.heroBadge,
              {
                backgroundColor:
                  banner.bg,
              },
            ]}
          >
        <Ionicons
              name="school-outline"
              size={19}
              color="#fff"
            />
          </View>

          <View style={styles.heroDetails}>
            <Text
              style={[
                styles.heroDescription,
                {
                  color: colors.textMuted,
                },
              ]}
              numberOfLines={2}
            >
              {classInfo?.class
                .description ||
                "Keep your lessons, tasks, and learners organized in one place."}
            </Text>

            <View
              style={styles.heroMetaLine}
            >
              <View
                style={styles.heroMetaItem}
              >
                <Ionicons
                  name="people-outline"
                  size={14}
                  color={
                    colors.textMuted
                  }
                />

                <Text
                  style={[
                    styles.heroMetaText,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  {classInfo?.learnerCount ??
                    0}{" "}
                  learners
                </Text>
              </View>

              <View
                style={[
                  styles.metaPill,
                  {
                    backgroundColor:
                      colors.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.metaPillText,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  CODE
                </Text>

                <Text
                  style={[
                    styles.metaCode,
                    {
                      color:
                        colors.primary,
                    },
                  ]}
                >
                  {classInfo?.class.code}
        </Text>

        <Pressable
          onPress={handleCopyCode}
                  hitSlop={6}
        >
          <Ionicons
                    name={
                      copied
                        ? "checkmark"
                        : "copy-outline"
                    }
            size={14}
                    color={
                      colors.primary
                    }
          />
        </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* =====================================================
          TABS
          ===================================================== */}

      <View
        style={[
          styles.newTabBar,
          styles.edgeToEdge,
          {
            backgroundColor: colors.surface,
            borderBottomColor:
              colors.border,
          },
        ]}
      >
        <View style={styles.tabRow}>
          {(
            [
              "Stream",
              "Classwork",
              "Materials",
            ] as Tab[]
          ).map((tab) => {
            const selected =
              activeTab === tab;

            return (
              <Pressable
                key={tab}
                onPress={() =>
                  setActiveTab(tab)
                }
                style={[
                  styles.newTab,
                  selected &&
                    styles.newTabSelected,
                ]}
              >
                <Ionicons
                  name={
                    iconForTab(tab) as any
                  }
                  size={17}
                  color={
                    selected
                      ? colors.primary
                      : colors.textMuted
                  }
                />

                <Text
                  style={[
                    styles.newTabText,
                    {
                      color: selected
                        ? colors.primary
                        : colors.textMuted,
                    },
                  ]}
                >
                  {tab}
                </Text>

                {selected && (
                  <View
                    style={[
                      styles.newTabLine,
                      {
                        backgroundColor:
                          colors.primary,
                      },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}

          <Pressable
            onPress={() =>
              setSectionMenuVisible(
                true
              )
            }
            style={[
              styles.newTab,
              (activeTab === "Learners" ||
                activeTab === "Progress") &&
                styles.newTabSelected,
            ]}
          >
            <Ionicons
              name="grid-outline"
              size={17}
              color={
                activeTab === "Learners" ||
                activeTab === "Progress"
                  ? colors.primary
                  : colors.textMuted
              }
            />

            <Text
              style={[
                styles.newTabText,
                {
                  color:
                    activeTab ===
                      "Learners" ||
                    activeTab === "Progress"
                      ? colors.primary
                      : colors.textMuted,
                },
              ]}
            >
              More
            </Text>

            {(activeTab === "Learners" ||
              activeTab === "Progress") && (
              <View
                style={[
                  styles.newTabLine,
                  {
                    backgroundColor:
                      colors.primary,
                  },
                ]}
              />
            )}
          </Pressable>
        </View>
      </View>

      {renderTabContent()}

      {/* =====================================================
          MORE MENU
          ===================================================== */}

      <Modal
        visible={sectionMenuVisible}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setSectionMenuVisible(false)
        }
      >
        <Pressable
          style={styles.moreOverlay}
          onPress={() =>
            setSectionMenuVisible(false)
          }
        >
          <Pressable
            style={[
              styles.moreSheet,
              {
                backgroundColor:
                  colors.surface,
              },
            ]}
            onPress={() => {}}
          >
            <View
              style={[
                styles.sheetHandle,
                {
                  backgroundColor:
                    colors.border,
                },
              ]}
            />

            <View style={styles.sheetHeader}>
              <View>
                <Text
                  style={[
                    styles.sheetKicker,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  CLASS TOOLS
                </Text>

                <Text
                  style={[
                    styles.sheetTitle,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  More sections
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setSectionMenuVisible(
                    false
                  )
                }
                style={[
                  styles.sheetClose,
                  {
                    backgroundColor:
                      colors.background,
                  },
                ]}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={colors.text}
                />
              </Pressable>
            </View>

            {(
              [
                "Learners",
                "Progress",
              ] as Tab[]
            ).map((tab) => {
              const selected =
                activeTab === tab;

              return (
                <Pressable
                  key={tab}
                  onPress={() => {
                    setActiveTab(tab);
                    setSectionMenuVisible(
                      false
                    );
                  }}
                  style={[
                    styles.moreOption,
                    {
                      backgroundColor:
                        selected
                          ? colors.primary
                          : colors.background,
                      borderColor:
                        selected
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.moreOptionIcon,
                      {
                        backgroundColor:
                          selected
                            ? colors.primaryText
                            : colors.surface,
                        opacity:
                          selected ? 0.18 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        iconForTab(
                          tab
                        ) as any
                      }
                      size={20}
                      color={
                        selected
                          ? colors.primaryText
                          : colors.primary
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.moreOptionText
                    }
                  >
                    <Text
                      style={[
                        styles.moreOptionTitle,
                        {
                          color:
                            selected
                              ? colors.primaryText
                              : colors.text,
                        },
                      ]}
                    >
                      {tab}
                    </Text>

                    <Text
                      style={[
                        styles.moreOptionSub,
                        {
                          color:
                            selected
                              ? colors.primaryText
                              : colors.textMuted,
                          opacity:
                            selected
                              ? 0.78
                              : 1,
                        },
                      ]}
                    >
                      {tab === "Learners"
                        ? "View and manage your class roster"
                        : "See learner performance and class progress"}
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      selected
                        ? "checkmark-circle"
                        : "chevron-forward"
                    }
                    size={21}
                    color={
                      selected
                        ? colors.primaryText
                        : colors.textMuted
                    }
                  />
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* =====================================================
          EDIT CLASS
          ===================================================== */}

      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setEditVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  colors.surface,
              },
            ]}
          >
            <Text
              style={[
                typography.display.sm,
                {
                  color: colors.text,
                  marginBottom:
                    spacing.md,
                },
              ]}
            >
              Edit Class
            </Text>

            <TextInput
              placeholder="Class title"
              placeholderTextColor={
                colors.textMuted
              }
              value={editTitle}
              onChangeText={setEditTitle}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor:
                    colors.border,
                  backgroundColor:
                    colors.background,
                },
              ]}
            />

            <TextInput
              placeholder="Description (optional)"
              placeholderTextColor={
                colors.textMuted
              }
              value={editDescription}
              onChangeText={
                setEditDescription
              }
              multiline
              style={[
                styles.input,
                styles.multiline,
                {
                  color: colors.text,
                  borderColor:
                    colors.border,
                  backgroundColor:
                    colors.background,
                },
              ]}
            />

            <View
              style={[
                styles.modalButtonRow,
                {
                  marginTop: spacing.sm,
                },
              ]}
            >
              <Pressable
                onPress={() =>
                  setEditVisible(false)
                }
                style={[
                  styles.smallButton,
                  {
                    flex: 1,
                    backgroundColor:
                      colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "700",
                  }}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSaveEdit}
                disabled={savingEdit}
                style={[
                  styles.smallButton,
                  {
                    flex: 1,
                    backgroundColor:
                      colors.primary,
                    opacity: savingEdit
                      ? 0.6
                      : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      colors.primaryText,
                    fontWeight: "700",
                  }}
                >
                  {savingEdit
                    ? "Saving..."
                    : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

/* =========================================================
   CLASSWORK TAB
   ========================================================= */

function ClassworkTab({
  classId,
  items,
  learners,
  materials,
  colors,
  onCreated,
}: {
  classId: string;
  items: ApiClasswork[];
  learners: ApiEnrollment[];
  materials: ApiMaterial[];
  colors: ReturnType<
    typeof useTheme
  >["colors"];
  onCreated: () => void;
}) {
  const [selectedFilter, setSelectedFilter] =
    useState<
      "All" | ClassworkDisplayType
    >("All");

  const [
    createVisible,
    setCreateVisible,
  ] = useState(false);

  const [
    detailsItem,
    setDetailsItem,
  ] = useState<ApiClasswork | null>(
    null
  );

  const [
    selectedType,
    setSelectedType,
  ] =
    useState<ClassworkDisplayType>(
      "Reading Assignment"
    );

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [points, setPoints] =
    useState("10");

  const [
    dueDate,
    setDueDate,
  ] = useState<Date | null>(null);

  const [
    showDatePicker,
    setShowDatePicker,
  ] = useState(false);

  const [
    showTimePicker,
    setShowTimePicker,
  ] = useState(false);

  const [
    assignToAll,
    setAssignToAll,
  ] = useState(true);

  const [
    selectedLearners,
    setSelectedLearners,
  ] = useState<string[]>([]);

  const [
    selectedMaterialId,
    setSelectedMaterialId,
  ] = useState<string | null>(null);

  const [
    readingActivities,
    setReadingActivities,
  ] = useState<ReadingActivity[]>([
    "read-aloud",
  ]);

  const [
    selectedQuizType,
    setSelectedQuizType,
  ] = useState<QuizType>(
    "multiple-choice"
  );

  const [questions, setQuestions] =
    useState<ApiQuizQuestion[]>([]);

  const [selectedFile, setSelectedFile] =
    useState<{
      uri: string;
      name: string;
      type: string;
    } | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const resetForm = () => {
    setSelectedType("Reading Assignment");
    setTitle("");
    setDescription("");
    setPoints("10");
    setDueDate(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setAssignToAll(true);
    setSelectedLearners([]);
    setSelectedMaterialId(null);
    setReadingActivities(["read-aloud"]);
    setSelectedQuizType("multiple-choice");
    setQuestions([]);
    setSelectedFile(null);
  };

  const openCreate = () => {
    resetForm();
    setCreateVisible(true);
  };

  const closeCreate = () => {
    if (!submitting) {
      setCreateVisible(false);
      resetForm();
    }
  };

  const toggleLearner = (
    learnerId: string
  ) => {
    setSelectedLearners((current) =>
      current.includes(learnerId)
        ? current.filter(
            (id) => id !== learnerId
          )
        : [...current, learnerId]
    );
  };

  const toggleReadingActivity = (
    activity: ReadingActivity
  ) => {
    setReadingActivities((current) => {
      if (current.includes(activity)) {
        return current.filter(
          (item) => item !== activity
        );
      }

      return [...current, activity];
    });
  };

  const pickFile = async () => {
    try {
      const result =
        await DocumentPicker.getDocumentAsync(
          {
            copyToCacheDirectory: true,
            multiple: false,
            type: "*/*",
          }
        );

      if (result.canceled) return;

      const file = result.assets?.[0];

      if (!file) return;

      setSelectedFile({
        uri: file.uri,
        name:
          file.name || "uploaded-file",
        type:
          file.mimeType ||
          "application/octet-stream",
      });
    } catch (err) {
      Alert.alert(
        "Couldn't select file",
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    }
  };

  const updateQuestion = (
    index: number,
    updates: Partial<ApiQuizQuestion>
  ) => {
    setQuestions((current) =>
      current.map((question, i) =>
        i === index
          ? {
              ...question,
              ...updates,
            }
          : question
      )
    );
  };

  const addQuestion = () => {
    setQuestions((current) => [
      ...current,
      createEmptyQuestion(),
    ]);
  };

  const removeQuestion = (
    index: number
  ) => {
    setQuestions((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  };

  const updateChoice = (
    questionIndex: number,
    choiceIndex: number,
    value: string
  ) => {
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        const choices = [
          ...(question.choices ?? []),
        ];

        choices[choiceIndex] = value;

        return {
          ...question,
          choices,
        };
      })
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert(
        "Title required",
        "Please enter a classwork title."
      );
      return;
    }

    if (
      selectedType ===
        "Reading Assignment" &&
      readingActivities.length === 0
    ) {
      Alert.alert(
        "Choose a reading activity",
        "Select Read Aloud, Comprehension, or both."
      );
      return;
    }

    if (
      selectedType === "Quiz" &&
      questions.length === 0
    ) {
      Alert.alert(
        "Add questions",
        "Please add at least one quiz question."
      );
      return;
    }

    if (
      selectedType === "Quiz" &&
      questions.some(
        (question) =>
          !question.question?.trim()
      )
    ) {
      Alert.alert(
        "Incomplete question",
        "Please complete every quiz question."
      );
      return;
    }

    if (
      !assignToAll &&
      selectedLearners.length === 0
    ) {
      Alert.alert(
        "Choose learners",
        "Select at least one learner or turn on Assign to all."
      );
      return;
    }

    const numericPoints =
      Number(points);

    if (
      !Number.isFinite(numericPoints) ||
      numericPoints < 0
    ) {
      Alert.alert(
        "Invalid points",
        "Points must be a valid number."
      );
      return;
    }

    setSubmitting(true);

    try {
      const apiType =
        apiTypeFromDisplay(selectedType);

      const payload = {
        title: title.trim(),
        description:
          description.trim() || undefined,
        type: apiType,
        dueDate: dueDate
          ? dueDate.toISOString()
          : undefined,
        points: numericPoints,
        material:
          selectedMaterialId || undefined,
        readingActivities:
          apiType === "reading"
            ? readingActivities
            : undefined,
        quizType:
          apiType === "quiz"
            ? selectedQuizType
            : undefined,
        questions:
          apiType === "quiz"
            ? questions
            : undefined,
        assignToAll,
        assignedTo: assignToAll
          ? []
          : selectedLearners,
      };

      if (selectedFile) {
        await createClassworkWithFile(
          classId,
          {
            ...payload,
            file: selectedFile,
          }
        );
      } else {
        await createClasswork(
          classId,
          payload
        );
      }

      setCreateVisible(false);
      resetForm();

      await onCreated();

      Alert.alert(
        "Classwork published",
        "The classwork was successfully created."
      );
    } catch (err) {
      Alert.alert(
        "Couldn't create classwork",
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (selectedFilter === "All") {
      return items;
    }

    return items.filter(
      (item) =>
        displayTypeFromApi(item.type) ===
        selectedFilter
    );
  }, [items, selectedFilter]);

  return (
    <View>
      {/* CREATE BUTTON */}

      <Pressable
        onPress={openCreate}
        style={[
          styles.createClassworkButton,
          {
            backgroundColor:
              colors.primary,
            borderColor:
              colors.primaryShadow,
          },
        ]}
      >
        <View
          style={[
            styles.createClassworkIcon,
            {
              backgroundColor:
                colors.primaryText,
            },
          ]}
        >
          <Ionicons
            name="add"
            size={23}
            color={colors.primary}
          />
        </View>

        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={[
              styles.createClassworkTitle,
              {
                color:
                  colors.primaryText,
              },
            ]}
          >
            Create Classwork
          </Text>

          <Text
            style={[
              styles.createClassworkSub,
              {
                color:
                  colors.primaryText,
              },
            ]}
          >
            Assignment, activity, or quiz
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.primaryText}
        />
      </Pressable>

      {/* FILTERS */}

      <View
        style={styles.classworkFilters}
      >
        {(
          [
            "All",
            "Reading Assignment",
            "Activity",
            "Quiz",
          ] as (
            | "All"
            | ClassworkDisplayType
          )[]
        ).map((filter) => {
          const selected =
            selectedFilter === filter;

          return (
            <Pressable
              key={filter}
              onPress={() =>
                setSelectedFilter(filter)
              }
              style={[
                styles.classworkFilter,
                {
                  backgroundColor:
                    selected
                      ? colors.primary
                      : colors.surface,
                  borderColor:
                    selected
                      ? colors.primary
                      : colors.border,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.classworkFilterText,
                  {
                    color: selected
                      ? colors.primaryText
                      : colors.textMuted,
                  },
                ]}
              >
                {filter ===
                "Reading Assignment"
                  ? "Reading"
                  : filter}
        </Text>
      </Pressable>
          );
        })}
      </View>

      {/* LIST */}

      {filteredItems.length === 0 ? (
        <EmptyClasswork
          colors={colors}
          hasItems={items.length > 0}
          onCreate={openCreate}
        />
      ) : (
        filteredItems.map((item) => (
          <ClassworkCard
            key={item._id}
            item={item}
            colors={colors}
            onPress={() =>
              setDetailsItem(item)
            }
          />
        ))
      )}

      {/* =====================================================
          CREATE MODAL
          ===================================================== */}

      <Modal
        visible={createVisible}
        animationType="slide"
        transparent
        onRequestClose={closeCreate}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.classworkModal,
              {
                backgroundColor:
                  colors.surface,
              },
            ]}
          >
            <View
              style={styles.modalHeaderRow}
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Create Classwork
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  Create a task for your learners.
                </Text>
              </View>

              <Pressable
                onPress={closeCreate}
              >
                <Ionicons
                  name="close"
                  size={25}
                  color={colors.text}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={{
                paddingBottom: 30,
              }}
            >
              {/* TYPE */}

              <Text
                style={[
                  styles.formLabel,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Classwork Type
                </Text>

              <View style={styles.typeGrid}>
                {CLASSWORK_TYPES.map(
                  (option) => {
                    const selected =
                      selectedType ===
                      option.type;

                    return (
                      <Pressable
                        key={
                          option.type
                        }
                        onPress={() =>
                          setSelectedType(
                            option.type
                          )
                        }
                        style={[
                          styles.typeCard,
                          {
                            backgroundColor:
                              selected
                                ? colors.primary
                                : colors.background,
                            borderColor:
                              selected
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            option.icon as any
                          }
                          size={24}
                          color={
                            selected
                              ? colors.primaryText
                              : colors.primary
                          }
                        />

                        <Text
                          style={[
                            styles.typeCardTitle,
                            {
                              color:
                                selected
                                  ? colors.primaryText
                                  : colors.text,
                            },
                          ]}
                        >
                          {option.type}
                </Text>

                        <Text
                          style={[
                            styles.typeCardSub,
                            {
                              color:
                                selected
                                  ? colors.primaryText
                                  : colors.textMuted,
                            },
                          ]}
                        >
                          {option.sub}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>

              {/* TITLE */}

              <Text
                style={[
                  styles.formLabel,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Title
              </Text>

              <TextInput
                placeholder="Example: Read and Understand"
                placeholderTextColor={
                  colors.textMuted
                }
                value={title}
                onChangeText={setTitle}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor:
                      colors.border,
                    backgroundColor:
                      colors.background,
                  },
                ]}
              />

              {/* DESCRIPTION */}

              <Text
                style={[
                  styles.formLabel,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Instructions
              </Text>

              <TextInput
                placeholder="Tell learners what they need to do..."
                placeholderTextColor={
                  colors.textMuted
                }
                value={description}
                onChangeText={
                  setDescription
                }
                multiline
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.largeInput,
                  {
                    color: colors.text,
                    borderColor:
                      colors.border,
                    backgroundColor:
                      colors.background,
                  },
                ]}
              />

              {/* POINTS */}

              <Text
                style={[
                  styles.formLabel,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Points
              </Text>

              <TextInput
                placeholder="10"
                placeholderTextColor={
                  colors.textMuted
                }
                value={points}
                onChangeText={setPoints}
                keyboardType="numeric"
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor:
                      colors.border,
                    backgroundColor:
                      colors.background,
                  },
                ]}
              />

              {/* DUE DATE */}

              <Text
                style={[
                  styles.formLabel,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Due Date
              </Text>

              <View
                style={
                  styles.dateButtonRow
                }
              >
                <Pressable
                  onPress={() =>
                    setShowDatePicker(true)
                  }
                  style={[
                    styles.dateButton,
                    {
                      borderColor:
                        colors.border,
                      backgroundColor:
                        colors.background,
                    },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={19}
                    color={
                      colors.primary
                    }
                  />

                  <Text
                    style={[
                      styles.dateButtonText,
                      {
                        color:
                          dueDate
                            ? colors.text
                            : colors.textMuted,
                      },
                    ]}
                  >
                    {dueDate
                      ? dueDate.toLocaleDateString()
                      : "Select date"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    setShowTimePicker(true)
                  }
                  style={[
                    styles.dateButton,
                    {
                      borderColor:
                        colors.border,
                      backgroundColor:
                        colors.background,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={19}
                    color={
                      colors.primary
                    }
                  />

                  <Text
                    style={[
                      styles.dateButtonText,
                      {
                        color:
                          dueDate
                            ? colors.text
                            : colors.textMuted,
                      },
                    ]}
                  >
                    {dueDate
                      ? dueDate.toLocaleTimeString(
                          undefined,
                          {
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )
                      : "Select time"}
                  </Text>
                </Pressable>
            </View>

              {dueDate && (
                <Pressable
                  onPress={() =>
                    setDueDate(null)
                  }
                  style={
                    styles.clearDateButton
                  }
                >
                  <Text
                    style={{
                      color:
                        colors.primary,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    Clear due date
                  </Text>
                </Pressable>
              )}

              {showDatePicker && (
                <DateTimePicker
                  value={
                    dueDate ?? new Date()
                  }
                  mode="date"
                  display="default"
                  onChange={(
                    _event,
                    selected
                  ) => {
                    setShowDatePicker(
                      false
                    );

                    if (!selected) {
                      return;
                    }

                    const next =
                      dueDate
                        ? new Date(
                            dueDate
                          )
                        : new Date();

                    next.setFullYear(
                      selected.getFullYear()
                    );
                    next.setMonth(
                      selected.getMonth()
                    );
                    next.setDate(
                      selected.getDate()
                    );

                    setDueDate(next);
                  }}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={
                    dueDate ?? new Date()
                  }
                  mode="time"
                  display="default"
                  onChange={(
                    _event,
                    selected
                  ) => {
                    setShowTimePicker(
                      false
                    );

                    if (!selected) {
                      return;
                    }

                    const next =
                      dueDate
                        ? new Date(
                            dueDate
                          )
                        : new Date();

                    next.setHours(
                      selected.getHours()
                    );
                    next.setMinutes(
                      selected.getMinutes()
                    );
                    next.setSeconds(0);
                    next.setMilliseconds(0);

                    setDueDate(next);
                  }}
                />
              )}

              {/* FILE */}

            <Text
              style={[
                  styles.formLabel,
                  {
                    color: colors.text,
                  },
              ]}
            >
                Attachment
            </Text>

              <Pressable
                onPress={pickFile}
                style={[
                  styles.uploadButton,
                  {
                    backgroundColor:
                      colors.background,
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.uploadIcon,
                    {
                      backgroundColor:
                        colors.primary,
                    },
                  ]}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={19}
                    color={
                      colors.primaryText
                    }
                  />
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={[
                      styles.uploadTitle,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    {selectedFile
                      ? selectedFile.name
                      : "Upload a file"}
              </Text>

                  <Text
                    style={[
                      styles.uploadSub,
                      {
                        color:
                          colors.textMuted,
                      },
                    ]}
                  >
                    {selectedFile
                      ? "Tap to choose another file"
                      : "PDF, Word, PowerPoint, images, video, and more"}
                  </Text>
          </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={
                    colors.textMuted
                  }
                />
              </Pressable>

              {selectedFile && (
                <Pressable
                  onPress={() =>
                    setSelectedFile(null)
                  }
                  style={
                    styles.clearFileButton
                  }
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={15}
                    color={
                      colors.textMuted
                    }
                  />

                  <Text
                    style={{
                      color:
                        colors.textMuted,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    Remove attachment
                  </Text>
                </Pressable>
              )}

              {/* READING */}

              {selectedType ===
                "Reading Assignment" && (
                <>
                  <Text
                    style={[
                      styles.formLabel,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    Reading Activities
                  </Text>

                  <View
                    style={
                      styles.activityOptionRow
                    }
                  >
                    <Pressable
                      onPress={() =>
                        toggleReadingActivity(
                          "read-aloud"
                        )
                      }
                      style={[
                        styles.activityOption,
                        {
                          backgroundColor:
                            readingActivities.includes(
                              "read-aloud"
                            )
                              ? colors.primary
                              : colors.background,
                          borderColor:
                            readingActivities.includes(
                              "read-aloud"
                            )
                              ? colors.primary
                              : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="mic-outline"
                        size={20}
                        color={
                          readingActivities.includes(
                            "read-aloud"
                          )
                            ? colors.primaryText
                            : colors.primary
                        }
                      />

                      <Text
                        style={{
                          color:
                            readingActivities.includes(
                              "read-aloud"
                            )
                              ? colors.primaryText
                              : colors.text,
                          fontWeight:
                            "800",
                          fontSize: 12,
                          marginLeft: 7,
                        }}
                      >
                        Read Aloud
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        toggleReadingActivity(
                          "comprehension"
                        )
                      }
                      style={[
                        styles.activityOption,
                        {
                          backgroundColor:
                            readingActivities.includes(
                              "comprehension"
                            )
                              ? colors.primary
                              : colors.background,
                          borderColor:
                            readingActivities.includes(
                              "comprehension"
                            )
                              ? colors.primary
                              : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="help-circle-outline"
                        size={20}
                        color={
                          readingActivities.includes(
                            "comprehension"
                          )
                            ? colors.primaryText
                            : colors.primary
                        }
                      />

                      <Text
                        style={{
                          color:
                            readingActivities.includes(
                              "comprehension"
                            )
                              ? colors.primaryText
                              : colors.text,
                          fontWeight:
                            "800",
                          fontSize: 12,
                          marginLeft: 7,
                        }}
                      >
                        Comprehension
                      </Text>
                    </Pressable>
                  </View>

                  {materials.length >
                    0 && (
                    <>
                      <Text
                        style={[
                          styles.formLabel,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        Existing Material
                      </Text>

                      <Pressable
                        onPress={() =>
                          setSelectedMaterialId(
                            null
                          )
                        }
                        style={[
                          styles.materialSelectCard,
                          {
                            backgroundColor:
                              !selectedMaterialId
                                ? colors.primary
                                : colors.background,
                            borderColor:
                              !selectedMaterialId
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={19}
                          color={
                            !selectedMaterialId
                              ? colors.primaryText
                              : colors.textMuted
                          }
                        />

                        <Text
                          style={{
                            color:
                              !selectedMaterialId
                                ? colors.primaryText
                                : colors.text,
                            fontSize: 12,
                            fontWeight:
                              "700",
                            marginLeft: 7,
                          }}
                        >
                          No existing material
                        </Text>
                      </Pressable>

                      {materials.map(
                        (material) => {
                          const selected =
                            selectedMaterialId ===
                            material._id;

                          return (
                            <Pressable
                              key={
                                material._id
                              }
                              onPress={() =>
                                setSelectedMaterialId(
                                  material._id
                                )
                              }
                              style={[
                                styles.materialSelectCard,
                                {
                                  backgroundColor:
                                    selected
                                      ? colors.primary
                                      : colors.background,
                                  borderColor:
                                    selected
                                      ? colors.primary
                                      : colors.border,
                                },
                              ]}
                            >
                              <Ionicons
                                name={
                                  materialIcon(
                                    material.type
                                  ) as any
                                }
                                size={19}
                                color={
                                  selected
                                    ? colors.primaryText
                                    : colors.primary
                                }
                              />

                              <View
                                style={{
                                  flex: 1,
                                  marginLeft: 7,
                                }}
                              >
                                <Text
                                  style={{
                                    color:
                                      selected
                                        ? colors.primaryText
                                        : colors.text,
                                    fontSize: 12,
                                    fontWeight:
                                      "800",
                                  }}
                                  numberOfLines={
                                    1
                                  }
                                >
                                  {
                                    material.title
                                  }
                                </Text>

                                <Text
                                  style={{
                                    color:
                                      selected
                                        ? colors.primaryText
                                        : colors.textMuted,
                                    fontSize: 10,
                                    marginTop: 2,
                                    opacity:
                                      selected
                                        ? 0.8
                                        : 1,
                                  }}
                                >
                                  {
                                    material.type
                                  }
                                </Text>
                              </View>

                              {selected && (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={19}
                                  color={
                                    colors.primaryText
                                  }
                                />
                              )}
                            </Pressable>
                          );
                        }
                      )}
                    </>
                  )}
                </>
              )}

              {/* QUIZ */}

              {selectedType ===
                "Quiz" && (
                <>
                  <Text
                    style={[
                      styles.formLabel,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    Quiz Format
                  </Text>

                  <View
                    style={
                      styles.quizTypeGrid
                    }
                  >
                    {QUIZ_TYPES.map(
                      (option) => {
                        const selected =
                          selectedQuizType ===
                          option.value;

                        return (
                          <Pressable
                            key={
                              option.value
                            }
                            onPress={() =>
                              setSelectedQuizType(
                                option.value
                              )
                            }
                            style={[
                              styles.quizTypeOption,
                              {
                                backgroundColor:
                                  selected
                                    ? colors.primary
                                    : colors.background,
                                borderColor:
                                  selected
                                    ? colors.primary
                                    : colors.border,
                              },
                            ]}
                          >
                            <Ionicons
                              name={
                                option.icon as any
                              }
                              size={17}
                              color={
                                selected
                                  ? colors.primaryText
                                  : colors.primary
                              }
                            />

                            <Text
                              style={{
                                color:
                                  selected
                                    ? colors.primaryText
                                    : colors.text,
                                fontSize: 10,
                                fontWeight:
                                  "800",
                                marginLeft: 5,
                                flex: 1,
                              }}
                            >
                              {
                                option.label
                              }
                            </Text>
                          </Pressable>
                        );
                      }
                    )}
                  </View>

                  <View
                    style={
                      styles.questionsHeader
                    }
                  >
                    <View>
                      <Text
                        style={[
                          styles.formLabel,
                          {
                            color:
                              colors.text,
                            marginBottom: 0,
                          },
                        ]}
                      >
                        Questions
                      </Text>

                      <Text
                        style={{
                          color:
                            colors.textMuted,
                          fontSize: 10,
                          marginTop: 2,
                        }}
                      >
                        {questions.length}{" "}
                        question
                        {questions.length ===
                        1
                          ? ""
                          : "s"}
                      </Text>
                    </View>

                    <Pressable
                      onPress={
                        addQuestion
                      }
                      style={[
                        styles.addQuestionButton,
                        {
                          backgroundColor:
                            colors.primary,
                        },
                      ]}
                    >
                      <Ionicons
                        name="add"
                        size={17}
                        color={
                          colors.primaryText
                        }
                      />

                      <Text
                        style={{
                          color:
                            colors.primaryText,
                          fontSize: 11,
                          fontWeight:
                            "800",
                          marginLeft: 3,
                        }}
                      >
                        Add Question
                      </Text>
                    </Pressable>
                  </View>

                  {questions.map(
                    (
                      question,
                      index
                    ) => (
                      <QuizQuestionEditor
                        key={`question-${index}`}
                        question={
                          question
                        }
                        index={index}
                        colors={colors}
                        onChange={
                          updateQuestion
                        }
                        onChoiceChange={
                          updateChoice
                        }
                        onRemove={() =>
                          removeQuestion(
                            index
                          )
                        }
                      />
                    )
                  )}

                  {questions.length ===
                    0 && (
                    <View
                      style={[
                        styles.emptyQuestions,
                        {
                          backgroundColor:
                            colors.background,
                          borderColor:
                            colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="help-circle-outline"
                        size={28}
                        color={
                          colors.primary
                        }
                      />

                      <Text
                        style={{
                          color:
                            colors.text,
                          fontWeight:
                            "800",
                          marginTop: 7,
                        }}
                      >
                        No questions yet
                      </Text>

                      <Text
                        style={{
                          color:
                            colors.textMuted,
                          fontSize: 11,
                          textAlign:
                            "center",
                          marginTop: 3,
                        }}
                      >
                        Add your first question
                        above.
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* ASSIGNMENT */}

              <Text
                style={[
                  styles.formLabel,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Assign To
              </Text>

              <View
                style={[
                  styles.assignAllCard,
                  {
                    backgroundColor:
                      colors.background,
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 13,
                      fontWeight: "800",
                    }}
                  >
                    All learners
                  </Text>

                  <Text
                    style={{
                      color:
                        colors.textMuted,
                      fontSize: 10,
                      marginTop: 2,
                    }}
                  >
                    Assign this classwork to everyone.
                  </Text>
                </View>

                <Switch
                  value={assignToAll}
                  onValueChange={
                    setAssignToAll
                  }
                  trackColor={{
                    false: colors.border,
                    true: colors.primary,
                  }}
                  thumbColor={
                    colors.primaryText
                  }
                />
              </View>

              {!assignToAll && (
                <View
                  style={
                    styles.learnerPicker
                  }
                >
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: 10,
                      fontWeight: "700",
                      marginBottom: 7,
                    }}
                  >
                    SELECT LEARNERS
                  </Text>

                  {learners.length ===
                    0 && (
                    <Text
                      style={{
                        color:
                          colors.textMuted,
                        fontSize: 11,
                      }}
                    >
                      No learners are currently enrolled.
                    </Text>
                  )}

                  {learners.map(
                    (enrollment) => {
                      const learnerId =
                        enrollment.learner
                          ?._id;

                      if (!learnerId) {
                        return null;
                      }

                      const selected =
                        selectedLearners.includes(
                          learnerId
                        );

                      return (
                        <Pressable
                          key={
                            enrollment._id
                          }
                          onPress={() =>
                            toggleLearner(
                              learnerId
                            )
                          }
                          style={[
                            styles.learnerSelectRow,
                            {
                              backgroundColor:
                                selected
                                  ? colors.primary
                                  : colors.background,
                              borderColor:
                                selected
                                  ? colors.primary
                                  : colors.border,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.smallAvatar,
                              {
                                backgroundColor:
                                  selected
                                    ? colors.primaryText
                                    : colors.primary,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color:
                                  selected
                                    ? colors.primary
                                    : colors.primaryText,
                                fontWeight:
                                  "800",
                                fontSize: 11,
                              }}
                            >
                              {enrollment.learner.displayName?.[0]?.toUpperCase() ??
                                "?"}
                            </Text>
                          </View>

                          <Text
                            style={{
                              color:
                                selected
                                  ? colors.primaryText
                                  : colors.text,
                              fontSize: 12,
                              fontWeight:
                                "700",
                              flex: 1,
                              marginLeft: 8,
                            }}
                          >
                            {
                              enrollment
                                .learner
                                .displayName
                            }
                          </Text>

                          <Ionicons
                            name={
                              selected
                                ? "checkmark-circle"
                                : "ellipse-outline"
                            }
                            size={20}
                            color={
                              selected
                                ? colors.primaryText
                                : colors.textMuted
                            }
                          />
                        </Pressable>
                      );
                    }
                  )}
                </View>
              )}

              {/* BUTTONS */}

              <View
                style={[
                  styles.modalButtonRow,
                  {
                    marginTop: spacing.lg,
                  },
                ]}
              >
                <Pressable
                  onPress={closeCreate}
                  disabled={submitting}
                  style={[
                    styles.smallButton,
                    {
                      flex: 1,
                      backgroundColor:
                        colors.border,
                      opacity: submitting
                        ? 0.5
                        : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "700",
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleCreate}
                  disabled={
                    submitting ||
                    !title.trim()
                  }
                  style={[
                    styles.smallButton,
                    {
                      flex: 1,
                      backgroundColor:
                        colors.primary,
                      opacity:
                        submitting ||
                        !title.trim()
                          ? 0.55
                          : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        colors.primaryText,
                      fontWeight: "800",
                    }}
                  >
                    {submitting
                      ? "Publishing..."
                      : "Publish"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          DETAILS MODAL
          ===================================================== */}

      <Modal
        visible={!!detailsItem}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setDetailsItem(null)
        }
      >
        <View style={styles.modalOverlay}>
          {detailsItem ? (
            <View
              style={[
                styles.detailsModal,
                {
                  backgroundColor:
                    colors.surface,
                },
              ]}
            >
              <View
                style={
                  styles.modalHeaderRow
                }
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={[
                      styles.modalKicker,
                      {
                        color:
                          colors.primary,
                      },
                    ]}
                  >
                    {displayTypeFromApi(
                      detailsItem.type
                    )}
            </Text>

                  <Text
                    style={[
                      styles.detailsTitle,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    {detailsItem.title}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    setDetailsItem(null)
                  }
                >
                  <Ionicons
                    name="close"
                    size={25}
                    color={colors.text}
                  />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={{
                  paddingBottom: 10,
                }}
              >
                <Text
                  style={[
                    styles.detailsLabel,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  INSTRUCTIONS
                </Text>

                <Text
                  style={[
                    styles.detailsDescription,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {detailsItem.description ||
                    "No instructions provided."}
                </Text>

                {/* META */}

                <View
                  style={[
                    styles.detailMetaCard,
                    {
                      backgroundColor:
                        colors.background,
                      borderColor:
                        colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="star-outline"
                    size={20}
                    color={
                      colors.primary
                    }
                  />

                  <View>
                    <Text
                      style={[
                        styles.detailMetaLabel,
                        {
                          color:
                            colors.textMuted,
                        },
                      ]}
                    >
                      POINTS
                    </Text>

                    <Text
                      style={[
                        styles.detailMetaValue,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                    >
                      {detailsItem.points}{" "}
                      points
                    </Text>
                  </View>
                </View>

                {detailsItem.dueDate && (
                  <View
                    style={[
                      styles.detailMetaCard,
                      {
                        backgroundColor:
                          colors.background,
                        borderColor:
                          colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={
                        colors.primary
                      }
                    />

                    <View>
                      <Text
                        style={[
                          styles.detailMetaLabel,
                          {
                            color:
                              colors.textMuted,
                          },
                        ]}
                      >
                        DUE DATE
                      </Text>

                      <Text
                        style={[
                          styles.detailMetaValue,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        {formatDueDate(
                          detailsItem.dueDate
                        )}
                      </Text>
                    </View>
                  </View>
                )}

                <View
                  style={[
                    styles.detailMetaCard,
                    {
                      backgroundColor:
                        colors.background,
                      borderColor:
                        colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={
                      colors.primary
                    }
                  />

                  <View>
                    <Text
                      style={[
                        styles.detailMetaLabel,
                        {
                          color:
                            colors.textMuted,
                        },
                      ]}
                    >
                      ASSIGNED TO
                    </Text>

                    <Text
                      style={[
                        styles.detailMetaValue,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                    >
                      {detailsItem.assignToAll
                        ? "All learners"
                        : `${detailsItem.assignedTo?.length ?? 0} selected learner(s)`}
                    </Text>
                  </View>
                </View>

                {detailsItem.attachment && (
                  <View
                    style={[
                      styles.detailMetaCard,
                      {
                        backgroundColor:
                          colors.background,
                        borderColor:
                          colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="attach-outline"
                      size={20}
                      color={
                        colors.primary
                      }
                    />

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={[
                          styles.detailMetaLabel,
                          {
                            color:
                              colors.textMuted,
                          },
                        ]}
                      >
                        ATTACHMENT
                      </Text>

                      <Text
                        style={[
                          styles.detailMetaValue,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {
                          detailsItem
                            .attachment
                            .name
                        }
                      </Text>
                    </View>
                  </View>
                )}

                {detailsItem.type ===
                  "reading" &&
                  detailsItem.readingActivities &&
                  detailsItem
                    .readingActivities
                    .length > 0 && (
                    <View
                      style={[
                        styles.detailSection,
                        {
                          backgroundColor:
                            colors.background,
                          borderColor:
                            colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailMetaLabel,
                          {
                            color:
                              colors.textMuted,
                          },
                        ]}
                      >
                        READING ACTIVITIES
                      </Text>

                      <View
                        style={
                          styles.detailChipRow
                        }
                      >
                        {detailsItem.readingActivities.map(
                          (
                            activity
                          ) => (
                            <View
                              key={
                                activity
                              }
                              style={[
                                styles.detailChip,
                                {
                                  backgroundColor:
                                    colors.primary,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  color:
                                    colors.primaryText,
                                  fontSize: 10,
                                  fontWeight:
                                    "800",
                                }}
                              >
                                {activity ===
                                "read-aloud"
                                  ? "Read Aloud"
                                  : "Comprehension"}
                              </Text>
                            </View>
                          )
                        )}
                      </View>
                    </View>
                  )}

                {detailsItem.type ===
                  "quiz" &&
                  detailsItem.quizType && (
                    <View
                      style={[
                        styles.detailMetaCard,
                        {
                          backgroundColor:
                            colors.background,
                          borderColor:
                            colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="help-circle-outline"
                        size={20}
                        color={
                          colors.primary
                        }
                      />

                      <View>
                        <Text
                          style={[
                            styles.detailMetaLabel,
                            {
                              color:
                                colors.textMuted,
                            },
                          ]}
                        >
                          QUIZ FORMAT
                        </Text>

                        <Text
                          style={[
                            styles.detailMetaValue,
                            {
                              color:
                                colors.text,
                            },
                          ]}
                        >
                          {detailsItem.quizType ===
                          "multiple-choice"
                            ? "Multiple Choice"
                            : detailsItem.quizType ===
                              "checkboxes"
                            ? "Checkboxes"
                            : detailsItem.quizType ===
                              "true-false"
                            ? "True / False"
                            : detailsItem.quizType ===
                              "short-answer"
                            ? "Short Answer"
                            : detailsItem.quizType ===
                              "essay"
                            ? "Essay"
                            : "Mixed"}
                        </Text>
                      </View>
                    </View>
                  )}

                {detailsItem.type ===
                  "quiz" &&
                  detailsItem.questions &&
                  detailsItem.questions
                    .length > 0 && (
                    <View
                      style={
                        styles.detailQuestions
                      }
                    >
                      <Text
                        style={[
                          styles.detailsLabel,
                          {
                            color:
                              colors.textMuted,
                          },
                        ]}
                      >
                        QUESTIONS
                      </Text>

                      {detailsItem.questions.map(
                        (
                          question,
                          index
                        ) => (
                          <View
                            key={
                              question._id ??
                              `detail-${index}`
                            }
                            style={[
                              styles.detailQuestionCard,
                              {
                                backgroundColor:
                                  colors.background,
                                borderColor:
                                  colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color:
                                  colors.primary,
                                fontSize: 10,
                                fontWeight:
                                  "900",
                              }}
                            >
                              QUESTION{" "}
                              {index + 1}
                            </Text>

                            <Text
                              style={{
                                color:
                                  colors.text,
                                fontSize: 13,
                                lineHeight:
                                  19,
                                fontWeight:
                                  "700",
                                marginTop: 4,
                              }}
                            >
                              {
                                question.question
                              }
                            </Text>
                          </View>
                        )
                      )}
                    </View>
                  )}

                <View
                  style={[
                    styles.detailMetaCard,
                    {
                      backgroundColor:
                        colors.background,
                      borderColor:
                        colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={
                      colors.primary
                    }
                  />

                  <View>
                    <Text
                      style={[
                        styles.detailMetaLabel,
                        {
                          color:
                            colors.textMuted,
                        },
                      ]}
                    >
                      POSTED
                    </Text>

                    <Text
                      style={[
                        styles.detailMetaValue,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                    >
                      {formatRelativeTime(
                        detailsItem.createdAt
                      )}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() =>
                    setDetailsItem(null)
                  }
                  style={[
                    styles.fullButton,
                    {
                      backgroundColor:
                        colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        colors.primaryText,
                      fontWeight: "800",
                    }}
                  >
                    Done
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   QUIZ QUESTION EDITOR
   ========================================================= */

function QuizQuestionEditor({
  question,
  index,
  colors,
  onChange,
  onChoiceChange,
  onRemove,
}: {
  question: ApiQuizQuestion;
  index: number;
  colors: ReturnType<
    typeof useTheme
  >["colors"];
  onChange: (
    index: number,
    updates: Partial<ApiQuizQuestion>
  ) => void;
  onChoiceChange: (
    questionIndex: number,
    choiceIndex: number,
    value: string
  ) => void;
  onRemove: () => void;
}) {
  const type =
    question.type;

  const isChoiceQuestion =
    type === "multiple-choice" ||
    type === "checkboxes";

  const isTrueFalse =
    type === "true-false";

  return (
    <View
      style={[
        styles.questionCard,
        {
          backgroundColor:
            colors.background,
          borderColor:
            colors.border,
        },
      ]}
    >
      <View
        style={
          styles.questionHeader
        }
      >
        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 9,
              fontWeight: "900",
              letterSpacing: 1,
            }}
          >
            QUESTION {index + 1}
          </Text>
        </View>

        <Pressable
          onPress={onRemove}
          hitSlop={7}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={colors.textMuted}
          />
        </Pressable>
      </View>

      {/* QUESTION TYPE */}

      <View
        style={
          styles.questionTypeRow
        }
      >
        {QUESTION_TYPES.map(
          (option) => {
            const selected =
              question.type ===
              option.value;

            return (
              <Pressable
                key={
                  option.value
                }
                onPress={() => {
                  const updates: Partial<ApiQuizQuestion> =
                    {
                      type: option.value,
                    };

                  if (
                    option.value ===
                      "multiple-choice" ||
                    option.value ===
                      "checkboxes"
                  ) {
                    updates.choices = [
                      "",
                      "",
                      "",
                      "",
                    ];
                    updates.correctAnswer =
                      option.value ===
                      "checkboxes"
                        ? []
                        : 0;
                  } else if (
                    option.value ===
                    "true-false"
                  ) {
                    updates.choices = [
                      "True",
                      "False",
                    ];
                    updates.correctAnswer =
                      0;
                  } else {
                    updates.choices =
                      [];
                    updates.correctAnswer =
                      "";
                  }

                  onChange(
                    index,
                    updates
                  );
                }}
                style={[
                  styles.questionTypePill,
                  {
                    backgroundColor:
                      selected
                        ? colors.primary
                        : colors.surface,
                    borderColor:
                      selected
                        ? colors.primary
                        : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected
                      ? colors.primaryText
                      : colors.textMuted,
                    fontSize: 9,
                    fontWeight:
                      "700",
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          }
        )}
      </View>

      {/* QUESTION TEXT */}

            <TextInput
        placeholder="Write your question..."
        placeholderTextColor={
          colors.textMuted
        }
        value={question.question}
        onChangeText={(value) =>
          onChange(index, {
            question: value,
          })
        }
              multiline
        textAlignVertical="top"
              style={[
                styles.input,
          {
            color: colors.text,
            borderColor:
              colors.border,
            backgroundColor:
              colors.surface,
            marginBottom: 9,
          },
        ]}
      />

      {/* POINTS */}

      <TextInput
        placeholder="Points"
        placeholderTextColor={
          colors.textMuted
        }
        value={String(
          question.points ?? 1
        )}
        onChangeText={(value) =>
          onChange(index, {
            points:
              Number(value) || 0,
          })
        }
        keyboardType="numeric"
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor:
              colors.border,
            backgroundColor:
              colors.surface,
            marginBottom: 9,
          },
              ]}
            />

      {/* CHOICES */}

      {isChoiceQuestion && (
        <View>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 9,
              fontWeight: "800",
              marginBottom: 6,
            }}
          >
            CHOICES
          </Text>

          {(
            question.choices ?? []
          ).map(
            (choice, choiceIndex) => {
              const correct =
                type ===
                "multiple-choice"
                  ? question.correctAnswer ===
                    choiceIndex
                  : Array.isArray(
                      question.correctAnswer
                    ) &&
                    question.correctAnswer.includes(
                      choiceIndex
                    );

              return (
                <View
                  key={
                    `choice-${choiceIndex}`
                  }
                  style={
                    styles.choiceRow
                  }
                >
              <Pressable
                    onPress={() => {
                      if (
                        type ===
                        "multiple-choice"
                      ) {
                        onChange(
                          index,
                          {
                            correctAnswer:
                              choiceIndex,
                          }
                        );
                      } else {
                        const current =
                          Array.isArray(
                            question.correctAnswer
                          )
                            ? [
                                ...question.correctAnswer,
                              ]
                            : [];

                        if (
                          current.includes(
                            choiceIndex
                          )
                        ) {
                          onChange(
                            index,
                            {
                              correctAnswer:
                                current.filter(
                                  (
                                    value
                                  ) =>
                                    value !==
                                    choiceIndex
                                ),
                            }
                          );
                        } else {
                          onChange(
                            index,
                            {
                              correctAnswer:
                                [
                                  ...current,
                                  choiceIndex,
                                ],
                            }
                          );
                        }
                      }
                    }}
                    style={[
                      styles.answerIndicator,
                      {
                        borderColor:
                          correct
                            ? colors.primary
                            : colors.border,
                        backgroundColor:
                          correct
                            ? colors.primary
                            : colors.surface,
                      },
                    ]}
              >
                    <Ionicons
                      name={
                        correct
                          ? "checkmark"
                          : "ellipse-outline"
                      }
                      size={13}
                      color={
                        correct
                          ? colors.primaryText
                          : colors.textMuted
                      }
                    />
              </Pressable>

                  <TextInput
                    placeholder={`Choice ${
                      choiceIndex + 1
                    }`}
                    placeholderTextColor={
                      colors.textMuted
                    }
                    value={choice}
                    onChangeText={(
                      value
                    ) =>
                      onChoiceChange(
                        index,
                        choiceIndex,
                        value
                      )
                    }
                    style={[
                      styles.choiceInput,
                      {
                        color:
                          colors.text,
                        borderColor:
                          colors.border,
                        backgroundColor:
                          colors.surface,
                      },
                    ]}
                  />
                </View>
              );
            }
          )}

          <Text
            style={{
              color: colors.textMuted,
              fontSize: 9,
              marginTop: 3,
            }}
          >
            Tap the circle beside a choice to mark the correct answer.
          </Text>
        </View>
      )}

      {/* TRUE / FALSE */}

      {isTrueFalse && (
        <View>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 9,
              fontWeight: "800",
              marginBottom: 6,
            }}
          >
            CORRECT ANSWER
          </Text>

          <View
            style={
              styles.trueFalseRow
            }
          >
            {["True", "False"].map(
              (value, valueIndex) => {
                const selected =
                  question.correctAnswer ===
                  valueIndex;

                return (
              <Pressable
                    key={value}
                    onPress={() =>
                      onChange(
                        index,
                        {
                          correctAnswer:
                            valueIndex,
                        }
                      )
                    }
                style={[
                      styles.trueFalseButton,
                      {
                        backgroundColor:
                          selected
                            ? colors.primary
                            : colors.surface,
                        borderColor:
                          selected
                            ? colors.primary
                            : colors.border,
                      },
                ]}
              >
                    <Text
                      style={{
                        color:
                          selected
                            ? colors.primaryText
                            : colors.text,
                        fontWeight:
                          "800",
                        fontSize: 11,
                      }}
                    >
                      {value}
                </Text>
              </Pressable>
                );
              }
            )}
            </View>
          </View>
      )}

      {/* SHORT ANSWER */}

      {type === "short-answer" && (
        <View>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 9,
              fontWeight: "800",
              marginBottom: 6,
            }}
          >
            ACCEPTED ANSWER
          </Text>

          <TextInput
            placeholder="Expected answer"
            placeholderTextColor={
              colors.textMuted
            }
            value={
              typeof question.correctAnswer ===
              "string"
                ? question.correctAnswer
                : ""
            }
            onChangeText={(value) =>
              onChange(index, {
                correctAnswer:
                  value,
              })
            }
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor:
                  colors.border,
                backgroundColor:
                  colors.surface,
              },
            ]}
          />
        </View>
      )}

      {/* ESSAY */}

      {type === "essay" && (
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={17}
            color={colors.primary}
          />

          <Text
            style={{
              color: colors.textMuted,
              fontSize: 10,
              lineHeight: 15,
              flex: 1,
              marginLeft: 6,
            }}
          >
            Essay questions are intended for manual evaluation by the teacher.
          </Text>
        </View>
      )}
    </View>
  );
}

/* =========================================================
   CLASSWORK CARD
   ========================================================= */

function ClassworkCard({
  item,
  colors,
  onPress,
}: {
  item: ApiClasswork;
  colors: ReturnType<
    typeof useTheme
  >["colors"];
  onPress: () => void;
}) {
  const type =
    displayTypeFromApi(item.type);

  const description =
    item.description ?? "";

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.classworkListCard,
        {
          backgroundColor:
            colors.surface,
          borderColor:
            colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.listTypeIcon,
          {
            backgroundColor:
              colors.primary,
          },
        ]}
      >
        <Ionicons
          name={
            classworkIcon(type) as any
          }
          size={21}
          color={
            colors.primaryText
          }
        />
      </View>

      <View
        style={{
          flex: 1,
          marginLeft: spacing.sm,
        }}
      >
        <Text
          style={[
            styles.listType,
            {
              color: colors.primary,
            },
          ]}
        >
          {type}
        </Text>

        <Text
          style={[
            styles.listTitle,
            {
              color: colors.text,
            },
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {description ? (
          <Text
            style={[
              styles.listDescription,
              {
                color:
                  colors.textMuted,
              },
            ]}
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}

        <View
          style={
            styles.listMetaRow
          }
        >
          <Ionicons
            name="star-outline"
            size={12}
            color={
              colors.textMuted
            }
          />

          <Text
            style={[
              styles.listDue,
              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            {item.points} points
          </Text>

          {item.dueDate && (
            <>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={
                  colors.textMuted
                }
              />

              <Text
                style={[
                  styles.listDue,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
                numberOfLines={1}
              >
                Due{" "}
                {formatDueDate(
                  item.dueDate
                )}
              </Text>
            </>
          )}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={colors.textMuted}
      />
    </Pressable>
  );
}

/* =========================================================
   EMPTY CLASSWORK
   ========================================================= */

function EmptyClasswork({
  colors,
  hasItems,
  onCreate,
}: {
  colors: ReturnType<
    typeof useTheme
  >["colors"];
  hasItems: boolean;
  onCreate: () => void;
}) {
  return (
    <View
      style={styles.emptyClasswork}
    >
      <View
        style={[
          styles.emptyClassworkIcon,
          {
            backgroundColor:
              colors.background,
            borderColor:
              colors.border,
          },
        ]}
      >
        <Ionicons
          name="clipboard-outline"
          size={28}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.emptyClassworkTitle,
          {
            color: colors.text,
          },
        ]}
      >
        {hasItems
          ? "No classwork in this category"
          : "No classwork yet"}
      </Text>

      <Text
        style={[
          styles.emptyClassworkText,
          {
            color: colors.textMuted,
          },
        ]}
      >
        {hasItems
          ? "Try another filter to see your classwork."
          : "Create a reading assignment, activity, or quiz for your learners."}
      </Text>

      {!hasItems && (
        <Pressable
          onPress={onCreate}
          style={[
            styles.emptyCreateButton,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
        >
          <Ionicons
            name="add"
            size={18}
            color={
              colors.primaryText
            }
          />

          <Text
            style={{
              color:
                colors.primaryText,
              fontWeight: "800",
              fontSize: 12,
            }}
          >
            Create Classwork
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/* =========================================================
   MATERIALS
   ========================================================= */

function MaterialsTab({
  classId,
  materials,
  cardStyle,
  colors,
  onChanged,
}: {
  classId: string;
  materials: ApiMaterial[];
  cardStyle: any;
  colors: ReturnType<
    typeof useTheme
  >["colors"];
  onChanged: () => void;
}) {
  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [type, setType] =
    useState<ApiMaterial["type"]>(
      "document"
    );

  const [category, setCategory] =
    useState("");

  const [fileUrl, setFileUrl] =
    useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("document");
    setCategory("");
    setFileUrl("");
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert(
        "Title required",
        "Please enter a material title."
      );
      return;
    }

    setSubmitting(true);

    try {
      await createMaterial(
        classId,
        {
          title: title.trim(),
          description:
            description.trim() ||
            undefined,
          type,
          category:
            category.trim() ||
            "General",
          fileUrl:
            fileUrl.trim() ||
            undefined,
        }
      );

      resetForm();
      setModalVisible(false);

      onChanged();
    } catch (err) {
      Alert.alert(
        "Couldn't add material",
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (
    material: ApiMaterial
  ) => {
    Alert.alert(
      "Delete material?",
      `Are you sure you want to delete "${material.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMaterial(
                classId,
                material._id
              );

              onChanged();
            } catch (err) {
              Alert.alert(
                "Couldn't delete material",
                err instanceof Error
                  ? err.message
                  : "Something went wrong."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View>
      <Pressable
        onPress={() =>
          setModalVisible(true)
        }
        style={[
          styles.addMaterialButton,
          {
            backgroundColor:
              colors.primary,
            borderColor:
              colors.primaryShadow,
          },
        ]}
      >
        <Ionicons
          name="add"
          size={21}
          color={
            colors.primaryText
          }
        />

        <Text
          style={[
            typography.reading.sm,
            {
              color:
                colors.primaryText,
              fontWeight: "800",
              marginLeft: 6,
            },
          ]}
        >
          Add material
        </Text>
      </Pressable>

      {materials.length === 0 ? (
        <EmptyState
          colors={colors}
          message="No learning materials added yet."
        />
      ) : (
        materials.map((material) => (
          <View
            key={material._id}
            style={cardStyle}
          >
            <View
              style={
                styles.materialHeader
              }
            >
              <View
                style={[
                  styles.materialIcon,
                  {
                    backgroundColor:
                      colors.background,
                  },
                ]}
              >
                <Ionicons
                  name={
                    materialIcon(
                      material.type
                    ) as any
                  }
                  size={24}
                  color={
                    colors.primary
                  }
                />
              </View>

              <View
                style={{
                  flex: 1,
                  marginLeft:
                    spacing.sm,
                }}
              >
                <Text
                  style={[
                    typography.reading.sm,
                    {
                      color:
                        colors.text,
                      fontWeight:
                        "700",
                    },
                  ]}
                >
                  {material.title}
                </Text>

                <Text
                  style={{
                    color:
                      colors.textMuted,
                    fontSize: 12,
                    marginTop: 3,
                  }}
                >
                  {material.category ||
                    "General"}{" "}
                  • {material.type}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  handleDelete(
                    material
                  )
                }
                hitSlop={8}
              >
                <Ionicons
                  name="trash-outline"
                  size={19}
                  color={
                    colors.textMuted
                  }
                />
              </Pressable>
            </View>

            {material.description ? (
              <Text
                style={[
                  typography.reading.sm,
                  {
                    color:
                      colors.textMuted,
                    marginTop:
                      spacing.sm,
                  },
                ]}
              >
                {material.description}
              </Text>
            ) : null}

            {material.fileUrl ? (
              <Pressable
                onPress={() =>
                  Alert.alert(
                    "Material link",
                    material.fileUrl
                  )
                }
                style={{
                  marginTop:
                    spacing.sm,
                }}
              >
                <Text
                  style={{
                    color:
                      colors.primary,
                    fontSize: 13,
                    fontWeight:
                      "600",
                  }}
                  numberOfLines={2}
                >
                  {material.fileUrl}
                </Text>
              </Pressable>
            ) : null}

            <Text
              style={{
                color:
                  colors.textMuted,
                fontSize: 11,
                marginTop:
                  spacing.sm,
              }}
            >
              Added{" "}
              {formatRelativeTime(
                material.createdAt
              )}
            </Text>
          </View>
        ))
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setModalVisible(false)
        }
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  colors.surface,
              },
            ]}
          >
            <Text
              style={[
                typography.display.sm,
                {
                  color: colors.text,
                  marginBottom:
                    spacing.md,
                },
              ]}
            >
              Add Learning Material
            </Text>

        <TextInput
              placeholder="Material title"
              placeholderTextColor={
                colors.textMuted
              }
          value={title}
          onChangeText={setTitle}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor:
                    colors.border,
                  backgroundColor:
                    colors.background,
                },
              ]}
        />

        <TextInput
          placeholder="Description (optional)"
              placeholderTextColor={
                colors.textMuted
              }
          value={description}
              onChangeText={
                setDescription
              }
          multiline
              style={[
                styles.input,
                styles.multiline,
                {
                  color: colors.text,
                  borderColor:
                    colors.border,
                  backgroundColor:
                    colors.background,
                },
              ]}
            />

            <TextInput
              placeholder="Type: document, video, link, image, other"
              placeholderTextColor={
                colors.textMuted
              }
              value={type}
              onChangeText={(value) => {
                const allowedTypes: ApiMaterial["type"][] =
                  [
                    "document",
                    "video",
                    "link",
                    "image",
                    "other",
                  ];

                if (
                  allowedTypes.includes(
                    value as ApiMaterial["type"]
                  )
                ) {
                  setType(
                    value as ApiMaterial["type"]
                  );
                }
              }}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor:
                    colors.border,
                  backgroundColor:
                    colors.background,
                },
              ]}
            />

            <TextInput
              placeholder="Category, e.g. Reading"
              placeholderTextColor={
                colors.textMuted
              }
              value={category}
              onChangeText={setCategory}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor:
                    colors.border,
                  backgroundColor:
                    colors.background,
                },
              ]}
            />

            <TextInput
              placeholder="File or website URL (optional)"
              placeholderTextColor={
                colors.textMuted
              }
              value={fileUrl}
              onChangeText={setFileUrl}
              autoCapitalize="none"
              keyboardType="url"
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor:
                    colors.border,
                  backgroundColor:
                    colors.background,
                },
              ]}
        />

            <View
              style={[
                styles.modalButtonRow,
                {
                  marginTop:
                    spacing.sm,
                },
              ]}
            >
        <Pressable
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
                style={[
                  styles.smallButton,
                  {
                    flex: 1,
                    backgroundColor:
                      colors.border,
                  },
                ]}
        >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "600",
                  }}
                >
                  Cancel
          </Text>
        </Pressable>

              <Pressable
                onPress={handleCreate}
                disabled={
                  !title.trim() ||
                  submitting
                }
                style={[
                  styles.smallButton,
                  {
                    flex: 1,
                    backgroundColor:
                      colors.primary,
                    opacity:
                      !title.trim() ||
                      submitting
                        ? 0.6
                        : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      colors.primaryText,
                    fontWeight: "600",
                  }}
                >
                  {submitting
                    ? "Adding..."
                    : "Add material"}
              </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   LEARNERS
   ========================================================= */

function LearnersTab({
  learners,
  cardStyle,
  colors,
}: {
  learners: ApiEnrollment[];
  cardStyle: any;
  colors: ReturnType<
    typeof useTheme
  >["colors"];
}) {
  if (learners.length === 0) {
    return (
      <EmptyState
        colors={colors}
        message="No learners have joined yet. Share your class code so they can join."
      />
    );
  }

  return (
    <View>
      {learners.map((enrollment) => (
        <View
          key={enrollment._id}
          style={[
            cardStyle,
            styles.row,
          ]}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor:
                  colors.primary,
              },
            ]}
          >
            <Text
              style={{
                color:
                  colors.primaryText,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              {enrollment.learner.displayName?.[0]?.toUpperCase() ??
                "?"}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              marginLeft: spacing.sm,
            }}
          >
            <Text
              style={[
                typography.reading.sm,
                {
                  color: colors.text,
                  fontWeight: "600",
                },
              ]}
            >
              {
                enrollment.learner
                  .displayName
              }
            </Text>

            <Text
              style={[
                typography.reading.sm,
                {
                  color:
                    colors.textMuted,
                },
              ]}
            >
              {enrollment.streakDays}
              -day streak
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/* =========================================================
   PROGRESS
   ========================================================= */

function ProgressTab({
  progress,
  cardStyle,
  colors,
}: {
  progress: ApiEnrollment[];
  cardStyle: any;
  colors: ReturnType<
    typeof useTheme
  >["colors"];
}) {
  if (progress.length === 0) {
    return (
      <EmptyState
        colors={colors}
        message="No progress data yet."
      />
    );
  }

  return (
    <View>
      {progress.map((enrollment) => (
        <View
          key={enrollment._id}
          style={cardStyle}
        >
          <Text
            style={[
              typography.reading.sm,
              {
                color: colors.text,
                fontWeight: "600",
              },
            ]}
          >
            {
              enrollment.learner
                .displayName
            }
          </Text>

          <Text
            style={[
              typography.reading.sm,
              {
                color:
                  colors.textMuted,
                marginTop: 4,
              },
            ]}
          >
            {
              enrollment.comprehensionAvg
            }
            % comprehension
          </Text>
        </View>
      ))}
    </View>
  );
}

/* =========================================================
   EMPTY
   ========================================================= */

function EmptyState({
  colors,
  message,
}: {
  colors: ReturnType<
    typeof useTheme
  >["colors"];
  message: string;
}) {
  return (
    <Text
      style={[
        typography.reading.sm,
        {
          color: colors.textMuted,
          textAlign: "center",
          marginTop: spacing.lg,
          marginBottom: spacing.lg,
        },
      ]}
    >
      {message}
    </Text>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  edgeToEdge: {
    marginHorizontal: -28,
  },

  hero: {
    position: "relative",
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 15,
    borderBottomWidth: 1,
    overflow: "hidden",
  },

  heroAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 5,
    bottom: 0,
  },

  heroTopRow: {
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  roundIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  heroTitleWrap: {
    flex: 1,
  },

  heroOverline: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 1,
  },

  heroTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900",
  },

  heroInfo: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
  },

  heroBadge: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  heroDetails: {
    flex: 1,
  },

  heroDescription: {
    fontSize: 12,
    lineHeight: 17,
  },

  heroMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 9,
    gap: 9,
  },

  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  heroMetaText: {
    fontSize: 11,
    fontWeight: "600",
  },

  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  metaPillText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  metaCode: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  newTabBar: {
    height: 56,
    borderBottomWidth: 1,
  },

  tabRow: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
  },

  newTab: {
    flex: 1,
    height: 56,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    position: "relative",
    paddingHorizontal: 4,
  },

  newTabSelected: {},

  newTabText: {
    fontSize: 10.5,
    fontWeight: "700",
  },

  newTabLine: {
    position: "absolute",
    bottom: 0,
    left: 15,
    right: 15,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  streamArea: {
    flex: 1,
    minHeight: 0,
    paddingTop: 16,
  },

  contentScroll: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 100,
  },

  pageHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  pageKicker: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 2,
  },

  pageTitle: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
  },

  pageDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginBottom: 5,
    marginRight: 3,
  },

  moreOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor:
      "rgba(0,0,0,0.42)",
  },

  moreSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 9,
    paddingBottom: 30,
  },

  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  sheetKicker: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 2,
  },

  sheetTitle: {
    fontSize: 22,
    fontWeight: "900",
  },

  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  moreOption: {
    minHeight: 72,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 10,
  },

  moreOptionIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  moreOptionText: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  moreOptionTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 2,
  },

  moreOptionSub: {
    fontSize: 11,
    lineHeight: 15,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },

  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: 14,
  },

  multiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },

  smallButton: {
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  modalButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  addMaterialButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    borderWidth: 1,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },

  materialHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  materialIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor:
      "rgba(0,0,0,0.45)",
    padding: spacing.md,
  },

  modalCard: {
    borderRadius: 20,
    padding: spacing.lg,
  },

  /* CLASSWORK */

  createClassworkButton: {
    minHeight: 72,
    borderRadius: 17,
    borderWidth: 2,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  createClassworkIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  createClassworkTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  createClassworkSub: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.75,
  },

  classworkFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: spacing.md,
  },

  classworkFilter: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  classworkFilterText: {
    fontSize: 10,
    fontWeight: "800",
  },

  classworkListCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  listTypeIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  listType: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  listTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },

  listDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  listMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 6,
  },

  listDue: {
    fontSize: 10,
    fontWeight: "600",
  },

  classworkModal: {
    maxHeight: "94%",
    borderRadius: 22,
    padding: spacing.lg,
  },

  detailsModal: {
    maxHeight: "90%",
    borderRadius: 22,
    padding: spacing.lg,
  },

  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
  },

  modalSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  formLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 5,
  },

  typeGrid: {
    gap: 8,
    marginBottom: spacing.md,
  },

  typeCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },

  typeCardTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 6,
  },

  typeCardSub: {
    fontSize: 10,
    marginTop: 2,
  },

  largeInput: {
    minHeight: 105,
    paddingTop: 12,
  },

  dateButtonRow: {
    flexDirection: "row",
    gap: 8,
  },

  dateButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  dateButtonText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 7,
  },

  clearDateButton: {
    alignSelf: "flex-start",
    paddingVertical: 5,
  },

  uploadButton: {
    minHeight: 66,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  uploadIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  uploadTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 9,
  },

  uploadSub: {
    fontSize: 9,
    marginTop: 3,
    marginLeft: 9,
    lineHeight: 13,
  },

  clearFileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingVertical: 6,
  },

  activityOptionRow: {
    flexDirection: "row",
    gap: 8,
  },

  activityOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  materialSelectCard: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 7,
  },

  quizTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  quizTypeOption: {
    width: "48%",
    minHeight: 39,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  questionsHeader: {
    marginTop: 13,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  addQuestionButton: {
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  questionCard: {
    borderRadius: 15,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },

  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  questionTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 9,
  },

  questionTypePill: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },

  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 7,
  },

  answerIndicator: {
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  choiceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 9,
    minHeight: 40,
    paddingHorizontal: 9,
    fontSize: 12,
  },

  trueFalseRow: {
    flexDirection: "row",
    gap: 7,
  },

  trueFalseButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  infoBox: {
    borderWidth: 1,
    borderRadius: 11,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  emptyQuestions: {
    minHeight: 130,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    marginBottom: 10,
  },

  assignAllCard: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  learnerPicker: {
    marginTop: 8,
  },

  learnerSelectRow: {
    minHeight: 49,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  modalKicker: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 3,
  },

  detailsTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
  },

  detailsLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 7,
  },

  detailsDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.md,
  },

  detailMetaCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  detailMetaLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  detailMetaValue: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },

  detailSection: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 12,
    marginBottom: 8,
  },

  detailChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },

  detailChip: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  detailQuestions: {
    marginTop: 5,
  },

  detailQuestionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    marginBottom: 7,
  },

  fullButton: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },

  emptyClasswork: {
    alignItems: "center",
    paddingVertical: 35,
    paddingHorizontal: 25,
  },

  emptyClassworkIcon: {
    width: 62,
    height: 62,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  emptyClassworkTitle: {
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyClassworkText: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 290,
  },

  emptyCreateButton: {
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
});