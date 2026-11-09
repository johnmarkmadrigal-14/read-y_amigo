import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AudioPlayerBar, formatTime, useAuthorizedAudioSource } from '../app/components/AudioPlayerBar';
import { HeadingLabel, TextAction } from '../app/components/InterfaceChrome';
import { Screen } from '../app/components/Screen';
import { type ApiClassworkSubmissions, type ApiSubmission, getClassworkSubmissions } from '../app/lib/api';
import { useTheme } from '../app/theme/ThemeProvider';
import { radius, spacing, typography } from '../app/theme/tokens';
import { MiscueReview } from './MiscueReview';
import { ReadingRateReview } from './ReadingRateReview';
import { learnerInitials, submissionDate, submissionLearnerName } from './submissionPresentation';

function ReviewSection({ title, subtitle, initialExpanded = false, children }: {
  title: string; subtitle: string; initialExpanded?: boolean; children: ReactNode;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(initialExpanded);
  const [visited, setVisited] = useState(initialExpanded);
  return <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.background }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded }} aria-expanded={expanded}
      onPress={() => { setExpanded(value => !value); setVisited(true); }}
      style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
      <View style={styles.flex}>
        <Text style={[typography.display.md, { color: colors.text }]}>{title}</Text>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} accessible={false} />
    </Pressable>
    {/* Keep opened forms mounted when collapsed so draft notes, timing and decisions survive. */}
    {visited && <View accessibilityElementsHidden={!expanded} importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      style={[styles.sectionContent, !expanded && styles.hidden]}>{children}</View>}
  </View>;
}

function LearnerSubmission({ submission, assignment, onSaved }: {
  submission: ApiSubmission; assignment: string; onSaved: (updated: ApiSubmission) => void;
}) {
  const { colors } = useTheme();
  const source = useAuthorizedAudioSource(submission.audio.url);
  const name = submissionLearnerName(submission);
  return <View style={styles.content}>
    <View style={[styles.identity, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
        <Text style={[typography.display.md, { color: colors.secondaryText }]}>{learnerInitials(name)}</Text>
      </View>
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={[typography.display.md, { color: colors.text }]}>{name}</Text>
        <Text style={[typography.reading.sm, { color: colors.text }]}>{assignment}</Text>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Submitted {submissionDate(submission.submittedAt)}</Text>
      </View>
    </View>
    <AudioPlayerBar source={source} title="Recording"
      subtitle={submission.audio.durationMs ? `Duration ${formatTime(submission.audio.durationMs)}` : 'Learner recording'} />
    <ReviewSection title="Reading review" subtitle="Passage, transcript and observations" initialExpanded>
      <MiscueReview embedded key={`${submission._id}:${submission.miscueReview?.reviewedAt ?? 'new'}`} submission={submission} onSaved={onSaved} />
    </ReviewSection>
    <ReviewSection title="Reading speed review" subtitle="Word count and reading time">
      <ReadingRateReview embedded key={`${submission._id}:${submission.reviewedAt ?? 'new'}`} submission={submission} onSaved={onSaved} />
    </ReviewSection>
    <Text style={[typography.reading.sm, { color: colors.textMuted, textAlign: 'center' }]}>Review and save each section separately.</Text>
  </View>;
}

type Response = { key: string; data?: ApiClassworkSubmissions; error?: string };

export function SubmissionReviewScreen() {
  const { colors } = useTheme();
  const { id, classworkId } = useLocalSearchParams<{ id: string; classworkId: string }>();
  const [response, setResponse] = useState<Response | null>(null);
  const [retry, setRetry] = useState(0);
  const requestKey = `${classworkId}:${retry}`;

  useEffect(() => {
    if (!id || !classworkId) return;
    let active = true;
    getClassworkSubmissions(classworkId).then(data => {
      if (active) setResponse({ key: requestKey, data });
    }).catch(err => {
      if (active) setResponse({ key: requestKey, error: err instanceof Error ? err.message : "Couldn't load this submission." });
    });
    return () => { active = false; };
  }, [id, classworkId, requestKey]);

  const backToList = () => {
    if (router.canGoBack()) router.back();
    else if (classworkId) router.replace({ pathname: '/teacher/classwork/[id]', params: { id: classworkId } });
    else router.replace('/teacher/todo');
  };
  const current = response?.key === requestKey ? response : null;
  const submission = current?.data?.submissions.find(item => item._id === id);
  const onSaved = (updated: ApiSubmission) => setResponse(previous => previous?.data ? {
    ...previous,
    data: { ...previous.data, submissions: previous.data.submissions.map(item => item._id === updated._id ? { ...updated, learner: item.learner } : item) },
  } : previous);

  return <Screen>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.xl }}>
    <View style={styles.content}>
      <TextAction icon="chevron-back" onPress={backToList}>
        <Text style={[typography.reading.sm, { color: colors.text }]}>Submissions</Text>
      </TextAction>
      <HeadingLabel icon="person-outline" style={[typography.display.lg, { color: colors.text }]}>Learner submission</HeadingLabel>
      {!id || !classworkId ? <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.textMuted }]}>This submission link is incomplete. Return to the classwork and open the submission again.</Text>
        : !current ? <View style={styles.loading}><ActivityIndicator accessibilityLabel="Loading learner submission" color={colors.primary} /></View>
        : current.error ? <View style={styles.content}>
          <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.textMuted }]}>{current.error}</Text>
          <TextAction icon="refresh" onPress={() => setRetry(value => value + 1)}>
            <Text style={[typography.reading.sm, { color: colors.primary }]}>Try again</Text>
          </TextAction>
        </View>
        : !submission ? <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.textMuted }]}>This submission is no longer available. Return to Submissions to refresh the learner list.</Text>
        : <LearnerSubmission key={submission._id} submission={submission} assignment={current.data!.classwork.title} onSaved={onSaved} />}
    </View>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  flex: { flex: 1, minWidth: 0 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1.5, borderRadius: radius.md },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  section: { borderWidth: 1.5, borderRadius: radius.md, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 64 },
  sectionContent: { padding: 16 },
  hidden: { display: 'none' },
  loading: { padding: spacing.xl, alignItems: 'center' },
});
