import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { useTheme } from '../../../theme/ThemeProvider';
import { typography } from '../../../theme/tokens';
import { ProgressAction, ProgressBadge, ProgressCard, progressStyles as s } from '../../../../components/progress/ProgressUI';
import { submissionDate } from '../../../../components/progress/data';
import { ActivityFile } from '../../../../components/workflow/ActivityUI';
import { checkActivity, getActivity } from '../../../../components/workflow/api';
import type { ActivitySubmission } from '../../../../components/workflow/data';
export default function ActivityReviewScreen() {
  const { colors } = useTheme(); const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<{ submission: ActivitySubmission; title: string } | null>(null), [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const request = `${id}:${retry}`;
  useFocusEffect(useCallback(() => {
    const [submissionId] = request.split(':'); let active = true; setData(null); setError('');
    getActivity(submissionId).then(response => { if (active) { setData(response); setFeedback(response.submission.feedback || ''); } }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load the submission.'); });
    return () => { active = false; };
  }, [request]));
  async function save() {
    if (!data || busy) return; setBusy(true); setError('');
    try { const { submission } = await checkActivity(data.submission, feedback); setData({ ...data, submission }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save review.'); }
    finally { setBusy(false); }
  }
  const learner = data?.submission.learner;
  const name = typeof learner === 'object' ? learner.displayName || [learner.firstName, learner.secondName].filter(Boolean).join(' ') : 'Learner';
  return <Screen><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.stack, { paddingBottom: 28 }]}>
    <ProgressAction label="‹ Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/teacher/todo')} />
    <Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>Activity submission</Text>
    {!data && !error && <ActivityIndicator color={colors.primary} />}
    {!!error && <><Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text><ProgressAction label="Reload submission" onPress={() => setRetry(value => value + 1)} /></>}
    {data && <><ProgressCard><Text style={[typography.display.md, { color: colors.text }]}>{name}</Text><Text style={[typography.display.md, { color: colors.text }]}>{data.title}</Text><Text style={{ color: colors.textMuted }}>Submitted {submissionDate(data.submission.submittedAt)}</Text><ProgressBadge tone={data.submission.checkedAt ? 'green' : 'orange'}>{data.submission.checkedAt ? 'Checked' : 'Not checked'}</ProgressBadge></ProgressCard>
      {!!data.submission.text && <ProgressCard><Text selectable style={[typography.reading.sm, { color: colors.text }]}>{data.submission.text}</Text></ProgressCard>}
      {data.submission.attachment && <ActivityFile file={data.submission.attachment} />}
      <View style={s.stack}><Text style={[typography.reading.sm, { color: colors.text }]}>Feedback (optional)</Text><TextInput accessibilityLabel="Activity feedback" value={feedback} onChangeText={setFeedback} editable={!busy} multiline maxLength={6000} style={[s.input, typography.reading.sm, { minHeight: 100, paddingVertical: 12, color: colors.text, borderColor: colors.border }]} />{busy ? <ActivityIndicator color={colors.primary} /> : <ProgressAction label={data.submission.checkedAt ? 'Save review' : 'Mark as checked'} onPress={() => { void save(); }} />}</View>
    </>}
  </ScrollView></Screen>;
}
