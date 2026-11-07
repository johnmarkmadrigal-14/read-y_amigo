import type { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { HeadingLabel, TextAction } from "../app/components/InterfaceChrome";
import { Screen } from "../app/components/Screen";
import { useTheme } from "../app/theme/ThemeProvider";
import { radius, spacing, typography } from "../app/theme/tokens";

type Role = "teacher" | "learner";
type Topic = "about" | "phil-iri";

export function AppInformationLinks({ role }: { role: Role }) {
  const { colors } = useTheme();
  return <View style={{ marginVertical: spacing.sm }}>
    <HeadingLabel icon="information-circle-outline" style={[typography.display.md, { color: colors.text, marginBottom: spacing.sm }]}>About and reading guide</HeadingLabel>
    {([
      ["about", "About READ-Y AMIGO", "Our purpose and reading goals", "heart-outline"],
      ["phil-iri", "Understanding Phil-IRI", "Reading levels, scores, and our connection", "book-outline"],
    ] as const).map(([topic, title, subtitle, icon]) => <Pressable key={topic}
      accessibilityRole="button" accessibilityLabel={title}
      onPress={() => router.push(`/${role}/${topic}`)}
      style={({ pressed }) => [styles.menuRow, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 }]}>
      <Ionicons name={icon} size={22} color={colors.primary} accessible={false} />
      <View style={{ flex: 1 }}>
        <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "700" }]}>{title}</Text>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} accessible={false} />
    </Pressable>)}
  </View>;
}

function Paragraph({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <Text selectable style={[typography.reading.sm, { color: colors.text, lineHeight: 27 }]}>{children}</Text>;
}

function Section({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }]}>
    <HeadingLabel icon={icon} embedded style={[typography.display.md, { color: colors.text }]}>{title}</HeadingLabel>
    {children}
  </View>;
}

const readingProfiles = [
  { level: "Independent", meaning: "Reads easily on their own", word: "97% to 100%", comprehension: "80% to 100%" },
  { level: "Instructional", meaning: "Needs teacher guidance", word: "90% to 96%", comprehension: "59% to 79%" },
  { level: "Frustration", meaning: "The passage is too difficult at present", word: "89% and below", comprehension: "58% and below" },
] as const;

function ProfileTable() {
  const { colors } = useTheme();
  const cell = [typography.reading.sm, styles.cell, { color: colors.text }];
  return <>
    <Paragraph>Swipe sideways to see all columns on smaller screens.</Paragraph>
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator
      accessibilityLabel="Phil-IRI oral reading profile score table">
      <View style={{ width: 650 }}>
        <View style={[styles.tableRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          {["Reading profile level", "Word reading score", "Comprehension score"].map(label =>
            <Text key={label} accessibilityRole="header" style={[...cell, { color: colors.secondaryText, fontWeight: "700" }]}>{label}</Text>)}
        </View>
        {readingProfiles.map(row => <View key={row.level} accessible
          accessibilityLabel={`${row.level}. ${row.meaning}. Word reading: ${row.word}. Comprehension: ${row.comprehension}.`}
          style={[styles.tableRow, { borderColor: colors.border }]}>
          <View style={styles.cell}>
            <Text style={[typography.reading.sm, { color: colors.text, fontWeight: "700" }]}>{row.level}</Text>
            <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{row.meaning}</Text>
          </View>
          <Text style={cell}>{row.word}</Text>
          <Text style={cell}>{row.comprehension}</Text>
        </View>)}
      </View>
    </ScrollView>
    <Paragraph>These bands describe performance on a passage. Teachers interpret word reading and comprehension together using the applicable Phil-IRI manual, including when the two levels differ. WPM alone does not determine a reading profile.</Paragraph>
  </>;
}

async function openSource(url: string) {
  try { await Linking.openURL(url); }
  catch { Alert.alert("Could not open the reference", "Check your connection and try again."); }
}

export function AppInformationScreen({ role, topic }: { role: Role; topic: Topic }) {
  const { colors } = useTheme();
  const about = topic === "about";
  return <Screen scroll>
    <View style={styles.content}>
      <TextAction icon="arrow-back" accessibilityLabel="Back to settings" onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(`/${role}/settings`);
      }}><Text style={[typography.reading.sm, { color: colors.text }]}>Settings</Text></TextAction>
      <HeadingLabel icon={about ? "heart-outline" : "book-outline"} style={[typography.display.lg, { color: colors.text }]}>
        {about ? "About READ-Y AMIGO" : "Understanding Phil-IRI"}
      </HeadingLabel>
      <Text style={[typography.reading.md, { color: colors.textMuted }]}>
        {about ? "A reading companion for practice, guidance, and progress." : "A quick guide to reading performance and how the app supports it."}
      </Text>
      {about ? <>
        <Section title="Our purpose" icon="flag-outline">
          <Paragraph>READ-Y AMIGO helps learners build confidence through reading practice and gives teachers a place to prepare passages, listen to readings, and guide the next steps.</Paragraph>
        </Section>
        <Section title="Our goals" icon="sparkles-outline">
          <Paragraph>Build a regular reading habit with passages chosen by the teacher.</Paragraph>
          <Paragraph>Support reading fluency, accurate word reading, and understanding through practice and feedback.</Paragraph>
          <Paragraph>Make reading more comfortable with adjustable reading preferences.</Paragraph>
          <Paragraph>Help teachers use recordings and reviewed results to plan appropriate support.</Paragraph>
        </Section>
        <Section title={role === "teacher" ? "For teachers" : "For learners"} icon={role === "teacher" ? "school-outline" : "person-outline"}>
          <Paragraph>{role === "teacher"
            ? "Prepare and confirm a passage and its word count, assign it to your class, then listen to submissions and review the reading time and words covered. Use the results to guide practice and feedback."
            : "Read the passage your teacher assigned, record your voice, and choose whether you completed all or part of it. Your reading-speed preview is provisional until your teacher reviews it. Take time to read clearly and understand the passage."}</Paragraph>
        </Section>
        <Section title="What is available now" icon="checkmark-circle-outline">
          <Paragraph>Passage preparation, word counting, recorded reading, a live transcript on supported devices, and teacher-reviewed reading speed are available. The transcript is a reading aid and can contain recognition errors.</Paragraph>
          <Paragraph>Teachers can compare the saved transcript with the confirmed passage, review suggested miscues against the audio, and save observations. Suggestions are not automatic errors. Comprehension grading and the final Phil-IRI profile are not yet available.</Paragraph>
        </Section>
        <TextAction icon="book-outline" onPress={() => router.push(`/${role}/phil-iri`)}>
          <Text style={[typography.reading.sm, { color: colors.primary }]}>Explore the Phil-IRI guide</Text>
        </TextAction>
      </> : <>
        <Section title="What is Phil-IRI?" icon="information-circle-outline">
          <Paragraph>The Philippine Informal Reading Inventory (Phil-IRI) is a DepEd classroom assessment tool. It uses graded passages to describe reading performance in English and Filipino through oral reading, silent reading, and listening comprehension. Results help teachers choose suitable reading instruction and support.</Paragraph>
        </Section>
        <Section title="How READ-Y AMIGO connects" icon="link-outline">
          <Paragraph>The app supports a Phil-IRI-aligned reading-practice workflow: a teacher confirms the passage and word count, the learner records a reading, and the teacher reviews its speed. The app checks the saved audio duration before storing WPM.</Paragraph>
          <Paragraph>Reading speed is only one measure. The current app update does not automatically assign a Phil-IRI level or replace the teacher-administered assessment with its prescribed passages and procedures.</Paragraph>
        </Section>
        <Section title="Oral reading profile table" icon="grid-outline"><ProfileTable /></Section>
        <Section title="How the measures work" icon="calculator-outline">
          <Paragraph>Word reading accuracy (%) = (total passage words − confirmed miscues) ÷ total passage words × 100.</Paragraph>
          <Paragraph>Comprehension (%) = correct answers ÷ total questions × 100.</Paragraph>
          <Paragraph>Reading speed (WPM) = words read ÷ reading time in seconds × 60.</Paragraph>
          <Paragraph>The current update calculates WPM. The accuracy and comprehension formulas are included here as a reference.</Paragraph>
          <Paragraph>Example: 120 words in 90 seconds = 80 WPM. This describes speed; it does not by itself show accuracy or understanding.</Paragraph>
        </Section>
        <Section title="The teacher’s review matters" icon="ear-outline">
          <Paragraph>Miscues are reading events, such as an omission, substitution, insertion, or mispronunciation. A transcript difference may also be a recognition mistake, so it needs review against the audio and the applicable scoring rules.</Paragraph>
          <Paragraph>For speed, use the words covered in the confirmed passage. Keep hesitations within the reading time; only idle time before and after reading may be excluded. Paused or interrupted recordings receive no WPM in the app.</Paragraph>
          <Paragraph>A reading level describes the support needed for a particular passage, not a permanent label for the learner.</Paragraph>
        </Section>
        <Section title="DepEd references" icon="open-outline">
          <Paragraph>The table above follows the score bands provided for this app. Use the official manual for complete administration and interpretation.</Paragraph>
          <TextAction icon="open-outline" accessibilityRole="link" accessibilityLabel="Open DepEd Order 14, series of 2018 in browser"
            onPress={() => openSource("https://www.deped.gov.ph/2018/03/26/do-14-s-2018-policy-guidelines-on-the-administration-of-the-revised-philippine-informal-reading-inventory/")}>
            <Text style={[typography.reading.sm, { color: colors.primary }]}>DepEd Order 14, s. 2018</Text>
          </TextAction>
          <TextAction icon="open-outline" accessibilityRole="link" accessibilityLabel="Open the Phil-IRI Manual 2018 on the DepEd Learning Portal"
            onPress={() => openSource("https://lrmds.deped.gov.ph/detail/13908")}>
            <Text style={[typography.reading.sm, { color: colors.primary }]}>Phil-IRI Manual 2018</Text>
          </TextAction>
        </Section>
      </>}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, maxWidth: 800, width: "100%", alignSelf: "center" },
  section: { gap: spacing.sm, borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md },
  menuRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1.5, borderRadius: radius.md },
  tableRow: { flexDirection: "row", borderBottomWidth: 1 },
  cell: { width: 216, padding: spacing.sm },
});
