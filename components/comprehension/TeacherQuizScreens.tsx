import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../app/components/Screen';
import { useTheme } from '../../app/theme/ThemeProvider';
import { radius, typography } from '../../app/theme/tokens';
import { gradeComprehension, publishComprehension, teacherAttempts, teacherQuizConfig } from './api';
import { QuizBuilder } from './QuizBuilder';
import type { Attempt, Grade, QuizDraft } from './types';
import type { ReadingPassage } from '../readingRate';
import { AttemptResult } from './LearnerQuiz';

function useAction() {
  const { colors } = useTheme();
  return function renderAction(label: string, run: () => void, disabled = false, primary = false) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={run}
    style={[styles.action, { backgroundColor: primary ? colors.primary : colors.background, borderColor: colors.primary, opacity: disabled ? 0.45 : 1 }]}>
    <Text style={[typography.reading.sm, { color: primary ? colors.primaryText : colors.primary, textAlign: 'center' }]}>{label}</Text>
  </Pressable>; };
}
export function TeacherQuizSetupScreen() {
  const { colors } = useTheme(), action = useAction();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [config, setConfig] = useState<{ title: string; passage: ReadingPassage; quiz: Attempt['quiz'] | null } | null>(null);
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    teacherQuizConfig(id).then(data => { if (active) { setConfig(data); setError(''); } }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load setup.'); });
    return () => { active = false; };
  }, [id, retry]);
  async function publish() {
    if (!draft) return;
    setBusy(true); setError('');
    try { await publishComprehension(id, draft.passage, draft.quiz); setConfig(old => old ? { ...old, quiz: draft.quiz } : old); Alert.alert('Comprehension published', 'Learners can now open the quiz for this passage.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not publish quiz.'); }
    finally { setBusy(false); }
  }
  return <Screen><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.stack}>
    {action('Back', () => router.back(), busy)}
    <Text style={[typography.display.lg, { color: colors.text }]}>Comprehension setup</Text>
    {!!config && <Text style={[typography.display.md, { color: colors.text }]}>{config.title}</Text>}
    {!config && !error && <ActivityIndicator color={colors.primary} />}
    {config?.quiz ? <View style={styles.stack}>
      <Text style={[typography.reading.sm, { color: colors.text }]}>✓ Published · {config.quiz.questions.length} questions. Published sets are fixed to preserve learner attempts. Create a new assignment to change the quiz.</Text>
      {config.quiz.questions.map(q => <Text key={q.id || q.question} style={[typography.reading.sm, { color: colors.text }]}>{q.question}</Text>)}
      {action('View comprehension results', () => router.push({ pathname: '/teacher/classwork/comprehension/[id]', params: { id } }))}
    </View> : config?.passage?.confirmed ? <>
      <QuizBuilder passage={config.passage} onChange={setDraft} disabled={busy} />
      {action(busy ? 'Publishing…' : 'Publish comprehension quiz', () => { void publish(); }, busy || !draft, true)}
    </> : config && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>This older activity has no confirmed passage. Create a new reading assignment with a confirmed passage.</Text>}
    {!!error && <><Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>{!config && action('Try again', () => setRetry(v => v + 1))}</>}
  </ScrollView></Screen>;
}
function ManualReview({ attempt, onSaved }: { attempt: Attempt; onSaved: (attempt: Attempt) => void }) {
  const { colors } = useTheme(), action = useAction();
  const questions = attempt.quiz.questions.filter(q => ['short-answer', 'essay'].includes(q.type));
  const [manual, setManual] = useState<Record<string, { correct: boolean | null; points: string; feedback: string }>>(() => Object.fromEntries(questions.map(q => {
    const old = attempt.grades.find(g => g.questionId === q.id);
    return [q.id!, { correct: old?.correct ?? null, points: old?.awardedPoints === null || old?.awardedPoints === undefined ? '' : String(old.awardedPoints), feedback: old?.feedback || '' }];
  })));
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const text = [typography.reading.sm, { color: colors.text }];
  const change = (id: string, patch: Partial<typeof manual[string]>) => setManual(old => ({ ...old, [id]: { ...old[id], ...patch } }));
  async function save() {
    const grades: Grade[] = [];
    for (const q of questions) {
      const value = manual[q.id!], points = value.points.trim() ? Number(value.points) : NaN;
      if (value.correct === null || !Number.isFinite(points) || points < 0 || points > q.points) { setError('Mark correctness and enter valid classroom points for every written response.'); return; }
      grades.push({ questionId: q.id!, correct: value.correct, awardedPoints: points, feedback: value.feedback });
    }
    setBusy(true); setError('');
    try { onSaved((await gradeComprehension(attempt, grades)).attempt); Alert.alert('Review saved', 'The final comprehension percentage and classroom points have been updated.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save grades.'); }
    finally { setBusy(false); }
  }
  return <View style={styles.stack}>
    <AttemptResult attempt={attempt} />
    {!!attempt.readingSubmission && action('Open linked reading submission', () => router.push({ pathname: '/teacher/classwork/submission/[id]', params: { id: attempt.readingSubmission!, classworkId: attempt.classwork } }))}
    {attempt.status === 'draft' ? <Text style={text}>This learner has saved progress but has not submitted the quiz.</Text> : <>
      {questions.map(q => <View key={q.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[typography.display.md, { color: colors.text }]}>{q.question}</Text>
        <Text style={text}>Learner response: {String(attempt.answers.find(a => a.questionId === q.id)?.answer ?? '')}</Text>
        {!!q.expectedAnswer && <Text style={text}>Expected answer: {q.expectedAnswer}</Text>}
        {!!q.rubric && <Text style={text}>Rubric: {q.rubric}</Text>}
        {!!q.supportingParagraph && <Text style={text}>Passage support: {q.supportingParagraph}</Text>}
        {action(`${manual[q.id!].correct === true ? '✓ ' : ''}Correct`, () => change(q.id!, { correct: true }), busy)}
        {action(`${manual[q.id!].correct === false ? '✓ ' : ''}Incorrect`, () => change(q.id!, { correct: false }), busy)}
        <Text style={text}>Classroom points (0–{q.points}); separate from correctness</Text>
        <TextInput accessibilityLabel={`Points for ${q.id}`} value={manual[q.id!].points} onChangeText={points => change(q.id!, { points })} keyboardType="decimal-pad" editable={!busy} style={[styles.input, typography.reading.sm, { borderColor: colors.border, color: colors.text }]} />
        <TextInput accessibilityLabel={`Feedback for ${q.id}`} value={manual[q.id!].feedback} onChangeText={feedback => change(q.id!, { feedback })} multiline maxLength={6000} editable={!busy} placeholder="Teacher feedback" placeholderTextColor={colors.textMuted} style={[styles.input, typography.reading.sm, { borderColor: colors.border, color: colors.text }]} />
      </View>)}
      {!!questions.length && action(busy ? 'Saving…' : 'Save comprehension grades', () => { void save(); }, busy, true)}
    </>}
    {!!error && <Text accessibilityRole="alert" style={[...text, { color: colors.retryText }]}>{error}</Text>}
  </View>;
}
export function TeacherQuizResultsScreen() {
  const { colors } = useTheme(), action = useAction();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<{ title: string; attempts: Attempt[] } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    teacherAttempts(id).then(result => { if (active) { setData(result); setError(''); } }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load results.'); });
    return () => { active = false; };
  }, [id, retry]);
  return <Screen><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.stack}>
    {action('Back', () => router.back())}
    <Text style={[typography.display.lg, { color: colors.text }]}>Comprehension results</Text>
    {!!data && <Text style={[typography.display.md, { color: colors.text }]}>{data.title}</Text>}
    {!data && !error && <ActivityIndicator color={colors.primary} />}
    {!!data && !data.attempts.length && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>No comprehension attempts yet.</Text>}
    {data?.attempts.map(attempt => {
      const name = typeof attempt.learner === 'string' ? 'Learner' : attempt.learner.displayName || `${attempt.learner.firstName || ''} ${attempt.learner.secondName || ''}`.trim() || 'Learner';
      return <View key={attempt._id} style={[styles.card, { borderColor: colors.border }]}>
        {action(`${name} · ${attempt.status === 'draft' ? 'In progress' : attempt.status === 'pending-review' ? 'Pending review' : 'Graded'}`, () => setSelected(old => old === attempt._id ? null : attempt._id))}
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{attempt.attemptLabel}{attempt.submittedAt ? ` · ${new Date(attempt.submittedAt).toLocaleString()}` : ''}</Text>
        {selected === attempt._id && <ManualReview key={`${attempt._id}:${attempt.revision}`} attempt={attempt} onSaved={updated => setData(previous => previous ? { ...previous, attempts: previous.attempts.map(a => a._id === updated._id ? { ...updated, learner: a.learner } : a) } : previous)} />}
      </View>;
    })}
    {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>}
    {action('Refresh results', () => setRetry(v => v + 1))}
  </ScrollView></Screen>;
}
const styles = StyleSheet.create({
  stack: { gap: 16, paddingBottom: 32 }, card: { gap: 12, borderWidth: 1.5, borderRadius: radius.md, padding: 16 },
  action: { minHeight: 48, borderWidth: 1.5, borderRadius: radius.sm, padding: 12, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: radius.sm, minHeight: 48, padding: 12 },
});
