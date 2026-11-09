import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../app/components/Screen';
import { useTheme } from '../../app/theme/ThemeProvider';
import { typography } from '../../app/theme/tokens';
import { gradeComprehension, publishComprehension, teacherAttempts, teacherQuizConfig } from './api';
import { QuizBuilder } from './QuizBuilder';
import { QuizAction, QuizDisclosure, ui } from './QuizUI';
import type { Attempt, Grade, QuizDraft } from './types';
import type { ReadingPassage } from '../readingRate';
import { AttemptResult } from './LearnerQuiz';
import { learnerInitials, submissionDate } from '../submissionPresentation';

export function TeacherQuizSetupScreen() {
  const { colors } = useTheme();
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
  return <Screen>
    <View style={ui.header}>
      <QuizAction label="‹ Back" onPress={() => router.back()} disabled={busy} compact />
      <Text accessibilityRole="header" style={[typography.display.md, ui.flex, { color: colors.text }]}>Comprehension setup</Text>
    </View>
    <ScrollView style={ui.fill} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.scroll}>
      {!!config && <View style={[ui.titleCard, { backgroundColor: colors.surface }]}>
        <Text style={[typography.display.lg, { color: colors.text }]}>{config.title}</Text>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Reading assignment</Text>
      </View>}
      {!config && !error && <ActivityIndicator color={colors.primary} />}
      {config?.quiz ? <View style={ui.stack}>
        <Text style={[typography.display.md, { color: colors.successText }]}>✓ Published · {config.quiz.questions.length} questions</Text>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Published sets are fixed to preserve learner attempts. Create a new assignment to change the quiz.</Text>
        <QuizDisclosure title="View published questions">{config.quiz.questions.map((q, i) => <Text key={q.id || i} style={[typography.reading.sm, { color: colors.text }]}>{i + 1}. {q.question}</Text>)}</QuizDisclosure>
        <QuizAction label="View comprehension results" onPress={() => router.push({ pathname: '/teacher/classwork/comprehension/[id]', params: { id } })} primary />
      </View> : config?.passage?.confirmed ? <QuizBuilder passage={config.passage} title={config.title} onChange={setDraft} disabled={busy} />
        : config && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>This older activity has no confirmed passage. Create a new reading assignment with a confirmed passage.</Text>}
      {!!error && <><Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>{!config && <QuizAction label="Try again" onPress={() => setRetry(v => v + 1)} />}</>}
    </ScrollView>
    {!!draft && !config?.quiz && <View style={[ui.footer, { borderColor: colors.border }]}>
      <Text style={[typography.reading.sm, { color: colors.textMuted, textAlign: 'center' }]}>Your reviewed quiz is ready.</Text>
      <QuizAction label={busy ? 'Publishing…' : 'Publish comprehension quiz'} onPress={() => { void publish(); }} disabled={busy} primary />
    </View>}
  </Screen>;
}
type ManualDraft = Record<string, { correct: boolean | null; points: string; feedback: string }>;
function initialGrades(attempt: Attempt): ManualDraft {
  return Object.fromEntries(attempt.quiz.questions.filter(q => ['short-answer', 'essay'].includes(q.type)).map(q => {
    const old = attempt.grades.find(g => g.questionId === q.id);
    return [q.id!, { correct: old?.correct ?? null, points: old?.awardedPoints === null || old?.awardedPoints === undefined ? '' : String(old.awardedPoints), feedback: old?.feedback || '' }];
  }));
}
function learnerName(attempt: Attempt) {
  return typeof attempt.learner === 'string' ? 'Learner' : attempt.learner.displayName || `${attempt.learner.firstName || ''} ${attempt.learner.secondName || ''}`.trim() || 'Learner';
}
function statusLabel(attempt: Attempt) { return attempt.status === 'draft' ? 'In progress' : attempt.status === 'pending-review' ? 'Pending review' : 'Graded'; }
function ManualReview({ attempt, assignment, manual, onChange, onSaved, onBack }: {
  attempt: Attempt; assignment: string; manual: ManualDraft; onChange: (draft: ManualDraft) => void; onSaved: (attempt: Attempt) => void; onBack: () => void;
}) {
  const { colors } = useTheme();
  const questions = attempt.quiz.questions.filter(q => ['short-answer', 'essay'].includes(q.type));
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const q = questions[index];
  const text = [typography.reading.sm, { color: colors.text }];
  const input = [ui.input, typography.reading.sm, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }];
  const change = (id: string, patch: Partial<ManualDraft[string]>) => onChange({ ...manual, [id]: { ...manual[id], ...patch } });
  const valid = (id: string, max: number) => {
    const value = manual[id];
    return value.correct !== null && !!value.points.trim() && Number.isFinite(Number(value.points)) && Number(value.points) >= 0 && Number(value.points) <= max;
  };
  const reviewed = questions.filter(question => valid(question.id!, question.points)).length;
  const complete = questions.length > 0 && reviewed === questions.length;
  async function save() {
    if (!complete) { setError('Mark correctness and enter valid quiz points for every written response.'); return; }
    const grades: Grade[] = questions.map(question => ({ questionId: question.id!, correct: manual[question.id!].correct!, awardedPoints: Number(manual[question.id!].points), feedback: manual[question.id!].feedback }));
    setBusy(true); setError('');
    try { onSaved((await gradeComprehension(attempt, grades)).attempt); Alert.alert('Review saved', 'The final comprehension percentage and quiz points have been updated.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save grades.'); }
    finally { setBusy(false); }
  }
  return <KeyboardAvoidingView style={ui.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={ui.header}>
      <QuizAction label="‹ Results" onPress={onBack} disabled={busy} compact />
      <Text accessibilityRole="header" style={[typography.display.md, ui.flex, { color: colors.text }]}>Comprehension review</Text>
    </View>
    <ScrollView style={ui.fill} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.scroll}>
      <View style={[ui.titleCard, { backgroundColor: colors.surface }]}><Text style={[typography.display.md, { color: colors.text }]}>{assignment}</Text></View>
      <View style={ui.row}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}><Text style={[typography.display.md, { color: colors.secondaryText }]}>{learnerInitials(learnerName(attempt))}</Text></View>
        <View style={ui.flex}>
          <Text style={[typography.display.md, { color: colors.text }]}>{learnerName(attempt)}</Text>
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{attempt.submittedAt ? submissionDate(attempt.submittedAt) : 'Not submitted yet'}</Text>
        </View>
      </View>
      <Text style={[typography.reading.sm, { color: colors.secondaryText, backgroundColor: colors.secondary, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }]}>{statusLabel(attempt)}</Text>
      <QuizDisclosure title="Recording and passage">
        <Text style={text}>{attempt.attemptLabel}</Text>
        {!!attempt.passage && <Text selectable style={text}>{attempt.passage.text}</Text>}
        {!!attempt.readingSubmission && <QuizAction label="Open linked reading submission" onPress={() => router.push({ pathname: '/teacher/classwork/submission/[id]', params: { id: attempt.readingSubmission!, classworkId: attempt.classwork } })} disabled={busy} />}
      </QuizDisclosure>
      {attempt.status === 'draft' ? <View style={ui.stack}>
        <Text style={text}>This learner has saved progress but has not submitted the quiz. Grading is unavailable.</Text>
        <QuizDisclosure title="View saved responses">{attempt.quiz.questions.map(question => <View key={question.id}>
          <Text style={text}>{question.question}</Text>
          <Text style={text}>{String(attempt.answers.find(answer => answer.questionId === question.id)?.answer ?? '(not answered)')}</Text>
        </View>)}</QuizDisclosure>
      </View> : <>
        <QuizDisclosure title="All responses and result"><AttemptResult attempt={attempt} /></QuizDisclosure>
        {q && <View style={[ui.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Written response {index + 1} of {questions.length}</Text>
          <Text style={[typography.display.md, { color: colors.text }]}>{q.question}</Text>
          <View style={[ui.card, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text selectable style={text}>{String(attempt.answers.find(answer => answer.questionId === q.id)?.answer ?? '')}</Text>
          </View>
          <QuizDisclosure key={q.id} title="Expected answer and rubric">
            {!!q.expectedAnswer && <Text style={text}>Expected answer: {q.expectedAnswer}</Text>}
            {!!q.rubric && <Text style={text}>Rubric: {q.rubric}</Text>}
            {!!q.supportingParagraph && <Text style={text}>Passage support: {q.supportingParagraph}</Text>}
            {!q.expectedAnswer && !q.rubric && !q.supportingParagraph && <Text style={text}>No teacher guide was added for this question.</Text>}
          </QuizDisclosure>
          <Text style={text}>Correctness</Text>
          <View style={ui.row}>
            <View style={ui.flex}><QuizAction label="Correct" selected={manual[q.id!].correct === true} onPress={() => change(q.id!, { correct: true })} disabled={busy} /></View>
            <View style={ui.flex}><QuizAction label="Incorrect" selected={manual[q.id!].correct === false} onPress={() => change(q.id!, { correct: false })} disabled={busy} /></View>
          </View>
          <View style={ui.row}>
            <Text style={[...text, ui.flex]}>Quiz points (0–{q.points})</Text>
            <TextInput accessibilityLabel={`Points for ${q.id}`} value={manual[q.id!].points} onChangeText={points => change(q.id!, { points })} keyboardType="decimal-pad" editable={!busy} style={[input, { width: 88 }]} />
          </View>
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Points are separate from comprehension %.</Text>
          <TextInput accessibilityLabel={`Feedback for ${q.id}`} value={manual[q.id!].feedback} onChangeText={feedback => change(q.id!, { feedback })} multiline maxLength={6000} editable={!busy} placeholder="Feedback (optional)" placeholderTextColor={colors.textMuted} style={[input, { minHeight: 80, textAlignVertical: 'top' }]} />
        </View>}
        {questions.length > 1 && <>
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{reviewed} of {questions.length} written responses reviewed</Text>
          <View style={ui.row}>
            <View style={ui.flex}><QuizAction label="Previous response" onPress={() => setIndex(value => value - 1)} disabled={busy || index === 0} /></View>
            <View style={ui.flex}><QuizAction label="Next response" onPress={() => setIndex(value => value + 1)} disabled={busy || index === questions.length - 1} /></View>
          </View>
        </>}
        {!questions.length && <AttemptResult attempt={attempt} />}
      </>}
      {!!error && <Text accessibilityRole="alert" style={[...text, { color: colors.retryText }]}>{error}</Text>}
    </ScrollView>
    {attempt.status !== 'draft' && !!questions.length && <View style={[ui.footer, { borderColor: colors.border }]}>
      <Text style={[typography.reading.sm, { color: colors.textMuted, textAlign: 'center' }]}>{complete ? 'Save correctness and quiz points separately.' : 'Review every written response to finalize the percentage.'}</Text>
      <QuizAction label={busy ? 'Saving…' : 'Save grades'} onPress={() => { void save(); }} disabled={busy || !complete} primary />
    </View>}
  </KeyboardAvoidingView>;
}
export function TeacherQuizResultsScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<{ title: string; attempts: Attempt[] } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Attempt['status']>('pending-review');
  const [drafts, setDrafts] = useState<Record<string, ManualDraft>>({});
  const [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    teacherAttempts(id).then(result => { if (active) { setData(result); setError(''); } }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load results.'); });
    return () => { active = false; };
  }, [id, retry]);
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android' || !selected) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { setSelected(null); return true; });
    return () => listener.remove();
  }, [selected]));
  const active = data?.attempts.find(attempt => attempt._id === selected);
  const draftKey = active ? `${active._id}:${active.revision}` : '';
  if (active && data) return <Screen><ManualReview key={draftKey} attempt={active} assignment={data.title} manual={drafts[draftKey] ?? initialGrades(active)}
    onChange={draft => setDrafts(old => ({ ...old, [draftKey]: draft }))} onBack={() => setSelected(null)}
    onSaved={updated => setData(previous => previous ? { ...previous, attempts: previous.attempts.map(attempt => attempt._id === updated._id ? { ...updated, learner: attempt.learner } : attempt) } : previous)} /></Screen>;
  const counts = (status: Attempt['status']) => data?.attempts.filter(attempt => attempt.status === status).length || 0;
  return <Screen>
    <View style={ui.header}>
      <QuizAction label="‹ Back" onPress={() => router.back()} compact />
      <Text accessibilityRole="header" style={[typography.display.md, ui.flex, { color: colors.text }]}>Comprehension results</Text>
      <QuizAction label="Refresh" onPress={() => setRetry(v => v + 1)} compact />
    </View>
    <ScrollView style={ui.fill} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.scroll}>
      {!!data && <>
        <View style={[ui.titleCard, { backgroundColor: colors.surface }]}><Text style={[typography.display.lg, { color: colors.text }]}>{data.title}</Text></View>
        <View style={ui.row}>
          {([{ key: 'pending-review', label: 'Pending review' }, { key: 'graded', label: 'Graded' }] as const).map(item => <View key={item.key} style={[ui.card, ui.flex, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[typography.display.lg, { color: colors.primary }]}>{counts(item.key)}</Text><Text style={[typography.reading.sm, { color: colors.text }]}>{item.label}</Text>
          </View>)}
        </View>
        <View accessibilityRole="tablist" style={[ui.tabs, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {([{ key: 'pending-review', label: 'Pending' }, { key: 'graded', label: 'Graded' }, { key: 'draft', label: 'In progress' }] as const).map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={`${item.label} (${counts(item.key)})`}
            accessibilityState={{ selected: filter === item.key }} aria-selected={filter === item.key} onPress={() => setFilter(item.key)} style={[ui.tab, { backgroundColor: filter === item.key ? colors.primary : 'transparent' }]}>
            <Text style={[typography.reading.sm, { color: filter === item.key ? colors.primaryText : colors.text, textAlign: 'center' }]}>{item.label} ({counts(item.key)})</Text>
          </Pressable>)}
        </View>
        {!data.attempts.length && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>No comprehension attempts yet.</Text>}
        {!!data.attempts.length && !counts(filter) && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>No {filter === 'pending-review' ? 'pending reviews' : filter === 'graded' ? 'graded attempts' : 'saved drafts'} in this view. Choose another filter.</Text>}
        {data.attempts.filter(attempt => attempt.status === filter).map(attempt => <Pressable key={attempt._id} accessibilityRole="button" accessibilityLabel={`Review ${learnerName(attempt)}`} onPress={() => setSelected(attempt._id)}
          style={[ui.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={ui.row}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}><Text style={[typography.display.md, { color: colors.secondaryText }]}>{learnerInitials(learnerName(attempt))}</Text></View>
            <View style={ui.flex}>
              <Text style={[typography.display.md, { color: colors.text }]}>{learnerName(attempt)}</Text>
              <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{statusLabel(attempt)}{attempt.submittedAt ? ` · ${submissionDate(attempt.submittedAt)}` : ''}</Text>
            </View>
            <Text style={{ fontSize: 24, color: colors.primary }}>›</Text>
          </View>
          {attempt.result?.percentage !== null && attempt.result?.percentage !== undefined && <Text style={[typography.reading.sm, { color: colors.primary }]}>{attempt.result.percentage.toFixed(1)}% comprehension</Text>}
        </Pressable>)}
      </>}
      {!data && !error && <ActivityIndicator color={colors.primary} />}
      {!!error && <><Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text><QuizAction label="Try again" onPress={() => setRetry(v => v + 1)} /></>}
    </ScrollView>
  </Screen>;
}
