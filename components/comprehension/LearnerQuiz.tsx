import { useConfirmation } from '../ConfirmationDialog';
import { comprehensionLevel, finalPercentage } from '../progress/data';
import { ProgressBadge } from '../progress/ProgressUI';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../app/components/Screen';
import { useTheme } from '../../app/theme/ThemeProvider';
import { radius, typography } from '../../app/theme/tokens';
import { comprehensionInfo, saveComprehension, startComprehension, startStandaloneQuiz } from './api';
import type { Answer, Attempt, QuizQuestion } from './types';
import { QuizAction as QuizButton, QuizDisclosure, ui } from './QuizUI';

export function QuizLaunch({ classworkId, classId, readingSubmitted }: { classworkId: string; classId: string; readingSubmitted: boolean }) {
  const { colors } = useTheme();
  const [info, setInfo] = useState<{ available: boolean; questionCount: number; requiresReading: boolean } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    comprehensionInfo(classworkId).then(data => { if (active) { setInfo(data); setError(''); } }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load comprehension.'); });
    return () => { active = false; };
  }, [classworkId, retry]);
  const blocked = !info?.available || (!!info?.requiresReading && !readingSubmitted);
  return <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
    <Text style={[typography.display.md, { color: colors.text }]}>Comprehension quiz</Text>
    <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{info?.requiresReading ? readingSubmitted ? '✓ Read-aloud submitted · Continue with comprehension.' : 'Submit your read-aloud recording first.' : 'Comprehension for this confirmed reading passage.'}</Text>
    {!!info && <Text style={[typography.reading.sm, { color: colors.text }]}>{info.available ? `${info.questionCount} questions · Continue your saved attempt or view its result.` : 'Your teacher has not published the quiz yet.'}</Text>}
    {!info && !error && <ActivityIndicator color={colors.primary} />}
    {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>}
    <Pressable accessibilityRole="button" disabled={blocked} accessibilityState={{ disabled: blocked }}
      onPress={() => router.push({ pathname: '/learner/comprehension/[id]', params: { id: classworkId, classId } })}
      style={[styles.action, { backgroundColor: colors.primary, opacity: blocked ? 0.45 : 1 }]}>
      <Text style={[typography.reading.sm, { color: colors.primaryText, textAlign: 'center' }]}>Open comprehension quiz</Text>
    </Pressable>
    {(!info?.available || !!error) && <Pressable accessibilityRole="button" onPress={() => setRetry(v => v + 1)} style={styles.action}>
      <Text style={[typography.reading.sm, { color: colors.primary }]}>Refresh quiz availability</Text>
    </Pressable>}
  </View>;
}
export function answered(question: QuizQuestion, answers: Answer[]) {
  const value = answers.find(a => a.questionId === question.id)?.answer;
  return typeof value === 'number' || (typeof value === 'string' && !!value.trim()) || (Array.isArray(value) && value.length > 0);
}
export function AttemptResult({ attempt }: { attempt: Attempt }) {
  const { colors } = useTheme(), result = attempt.result;
  const standalone = attempt.assessmentType === 'standalone';
  return <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
    <Text style={[typography.display.lg, { color: colors.text }]}>{attempt.status === 'pending-review' ? 'Pending teacher review' : standalone ? 'Quiz result' : 'Comprehension result'}</Text>
    {result && <>
      <Text style={[typography.reading.md, { color: colors.primary }]}>{result.percentage === null ? `${result.pendingQuestions} written responses awaiting grading` : `${result.correctAnswers} / ${result.totalQuestions} correct · ${result.percentage.toFixed(1)}%`}</Text>
      <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{result.percentage === null ? 'Your final percentage will appear after every question is graded.' : `Classroom points: ${result.earnedPoints} / ${result.maxPoints}. These are separate from the correct-answer percentage.`}</Text>
    </>}
    {!standalone && comprehensionLevel(finalPercentage(attempt)) && <ProgressBadge tone={comprehensionLevel(finalPercentage(attempt)) === 'Independent' ? 'green' : 'orange'}>Comprehension level: {comprehensionLevel(finalPercentage(attempt))}</ProgressBadge>}
    <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Responses are submitted and cannot be edited.</Text>
    {attempt.quiz.questions.map(q => {
      const response = attempt.answers.find(a => a.questionId === q.id)?.answer;
      const grade = attempt.grades.find(g => g.questionId === q.id);
      const answerText = typeof response === 'number' ? q.choices?.[response] : Array.isArray(response) ? response.map(i => q.choices?.[i]).join(', ') : response;
      return <View key={q.id} style={{ gap: 4 }}>
        <Text style={[typography.reading.sm, { color: colors.text }]}>{q.question}</Text>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Your answer: {answerText || '(blank)'}</Text>
        {!!grade?.feedback && <Text style={[typography.reading.sm, { color: colors.text }]}>Teacher feedback: {grade.feedback}</Text>}
      </View>;
    })}
  </View>;
}
export function QuizRunner({ initial, onExit }: { initial: Attempt; onExit: () => void }) {
  const confirm = useConfirmation();
  const { colors } = useTheme();
  const [attempt, setAttempt] = useState(initial);
  const [answers, setAnswers] = useState(initial.answers);
  const [index, setIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const lock = useRef(false);
  const text = [typography.reading.sm, { color: colors.text }];
  const persist = useCallback(async (submit = false) => {
    if (lock.current || attempt.status !== 'draft') return false;
    lock.current = true; setBusy(true); setError('');
    try { const saved = (await saveComprehension(attempt, answers, submit)).attempt; setAttempt(saved); setDirty(false); return true; }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save your responses.'); return false; }
    finally { lock.current = false; setBusy(false); }
  }, [attempt, answers]);
  useEffect(() => {
    if (!dirty || busy || confirming || error || attempt.status !== 'draft') return;
    const timer = setTimeout(() => { void persist(); }, 1500);
    return () => clearTimeout(timer);
  }, [dirty, busy, confirming, error, attempt.status, persist]);
  function change(answer: Answer['answer']) {
    const questionId = attempt.quiz.questions[index].id!;
    setAnswers(old => [...old.filter(a => a.questionId !== questionId), { questionId, answer }]); setDirty(true); setError('');
  }
  const exit = useCallback(async () => { if (!dirty || attempt.status !== 'draft' || await persist()) onExit(); }, [dirty, attempt.status, persist, onExit]);
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { void exit(); return true; });
    return () => handler.remove();
  }, [exit]));
  useEffect(() => {
    const handler = AppState.addEventListener('change', state => { if (state !== 'active' && dirty && attempt.status === 'draft') void persist(); });
    return () => handler.remove();
  }, [dirty, attempt.status, persist]);
  const standalone = attempt.assessmentType === 'standalone';
  const q = attempt.quiz.questions[index], answer = answers.find(a => a.questionId === q.id)?.answer;
  return <KeyboardAvoidingView style={ui.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={ui.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" disabled={busy} onPress={() => { void exit(); }} style={styles.back}>
        <Text style={{ color: colors.primary, fontSize: 28 }}>‹</Text>
      </Pressable>
      <Text accessibilityRole="header" style={[typography.display.md, ui.flex, { color: colors.text }]}>{standalone ? 'Classroom quiz' : 'Comprehension quiz'}</Text>
      {attempt.status === 'draft' && <View style={{ maxWidth: 100 }}><QuizButton label="Save progress" onPress={() => { void persist(); }} disabled={busy} compact /></View>}
    </View>
    <ScrollView style={ui.fill} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.scroll}>
      <View style={[ui.titleCard, { backgroundColor: colors.surface }]}>
        <Text style={[typography.display.lg, { color: colors.text }]}>{attempt.title || 'Reading activity'}</Text>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{attempt.attemptLabel}</Text>
      </View>
      {attempt.status !== 'draft' ? <AttemptResult attempt={attempt} /> : <>
        <View style={ui.row}>
          <Text style={[...text, ui.flex]}>Question {index + 1} of {attempt.quiz.questions.length}</Text>
          <Text accessibilityLiveRegion="polite" style={[typography.reading.sm, { color: busy || dirty ? colors.textMuted : colors.successText }]}>{busy ? 'Saving…' : dirty ? 'Unsaved' : '✓ Saved'}</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: attempt.quiz.questions.length, now: index + 1 }} style={[styles.progress, { backgroundColor: colors.border }]}>
          <View style={{ height: 8, width: `${(index + 1) / attempt.quiz.questions.length * 100}%`, backgroundColor: colors.secondary }} />
        </View>
        {!standalone && (attempt.passage ? <QuizDisclosure title="View reading passage"><Text selectable style={text}>{attempt.passage.text}</Text></QuizDisclosure>
          : <View style={[styles.notice, { backgroundColor: colors.surface }]}><Text style={[typography.reading.sm, { color: colors.textMuted }]}>Passage hidden in the quiz until submission.</Text></View>)}
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[typography.reading.sm, { color: colors.secondaryText, backgroundColor: colors.secondary, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }]}>{q.type.replace(/-/g, ' ').toUpperCase()}</Text>
          <Text style={[typography.display.lg, { color: colors.text }]}>{q.question}</Text>
          <Text style={[...text, { color: colors.textMuted }]}>{q.type === 'checkboxes' ? 'Select all correct answers. Exact matching is required.' : q.choices ? 'Choose one answer.' : 'Your teacher will review this response.'}</Text>
          {q.choices?.map((choice, choiceIndex) => {
            const selected = Array.isArray(answer) ? answer.includes(choiceIndex) : answer === choiceIndex;
            return <Pressable key={choiceIndex} accessibilityRole={q.type === 'checkboxes' ? 'checkbox' : 'radio'} accessibilityLabel={`${String.fromCharCode(65 + choiceIndex)}. ${choice}`} accessibilityState={{ checked: selected, disabled: busy }} aria-checked={selected}
              disabled={busy} onPress={() => change(q.type === 'checkboxes' ? selected ? (answer as number[]).filter(i => i !== choiceIndex) : [...(Array.isArray(answer) ? answer : []), choiceIndex] : choiceIndex)}
              style={[styles.choice, { borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: colors.background }]}>
              <View style={[styles.choiceMark, { borderColor: selected ? colors.primary : colors.textMuted, borderRadius: q.type === 'checkboxes' ? 4 : 12 }]}>
                {selected && <View style={{ width: 10, height: 10, borderRadius: q.type === 'checkboxes' ? 2 : 5, backgroundColor: colors.primary }} />}
              </View>
              <Text style={[...text, ui.flex]}>{String.fromCharCode(65 + choiceIndex)}. {choice}</Text>
            </Pressable>;
          })}
          {(q.type === 'short-answer' || q.type === 'essay') && <TextInput accessibilityLabel="Your written answer" value={typeof answer === 'string' ? answer : ''} onChangeText={change}
            editable={!busy} multiline maxLength={20000} placeholder="Type your answer…" placeholderTextColor={colors.textMuted}
            style={[ui.input, typography.reading.sm, { minHeight: q.type === 'essay' ? 180 : 120, color: colors.text, borderColor: colors.border, backgroundColor: colors.background, textAlignVertical: 'top' }]} />}
        </View>
      </>}
    </ScrollView>
    {attempt.status === 'draft' && <View style={[ui.footer, { borderColor: colors.border, backgroundColor: colors.background }]}>
      {!!error && <Text accessibilityRole="alert" style={[...text, { color: colors.retryText }]}>{error} Reopen the quiz if another session changed this attempt.</Text>}
      <Text style={[typography.reading.sm, { color: colors.textMuted, textAlign: 'center' }]}>Your answers save as you go.</Text>
      <View style={ui.row}>
        <View style={ui.flex}><QuizButton label="Previous" onPress={() => { void (async () => { if (!dirty || await persist()) setIndex(i => i - 1); })(); }} disabled={busy || index === 0} /></View>
        <View style={ui.flex}><QuizButton label={index < attempt.quiz.questions.length - 1 ? 'Next' : 'Submit quiz'} primary disabled={busy} onPress={() => {
          if (index < attempt.quiz.questions.length - 1) { void (async () => { if (!dirty || await persist()) setIndex(i => i + 1); })(); return; }
          const missing = attempt.quiz.questions.filter(question => !answered(question, answers)).length;
          if (missing) { setError(`Answer all questions before submitting. ${missing} unanswered.`); return; }
          setConfirming(true);
          confirm({
            title: standalone ? 'Submit classroom quiz?' : 'Submit comprehension quiz?',
            message: 'Your responses will be locked after submission.',
            icon: "paper-plane-outline",
            cancelLabel: 'Keep answering',
            confirmLabel: 'Submit',
            onCancel: () => setConfirming(false),
            onConfirm: () => { setConfirming(false); void persist(true); },
          });
        }} /></View>
      </View>
    </View>}
  </KeyboardAvoidingView>;
}
export function LearnerQuizScreen({ standalone = false }: { standalone?: boolean } = {}) {
  const { colors } = useTheme();
  const { id, classId } = useLocalSearchParams<{ id: string; classId: string }>();
  const [response, setResponse] = useState<{ attempt?: Attempt; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    (standalone ? startStandaloneQuiz(id) : startComprehension(id)).then(data => { if (active) setResponse(data); }).catch(err => { if (active) setResponse({ error: err instanceof Error ? err.message : 'Could not start the quiz.' }); });
    return () => { active = false; };
  }, [id, retry, standalone]);
  const exit = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (!standalone) {
      router.replace({ pathname: '/learner/classwork/[id]', params: { id, classId } });
    } else if (classId) {
      router.replace({ pathname: '/learner/class/[id]', params: { id: classId } });
    } else {
      router.replace('/learner/todo');
    }
  }, [classId, id, standalone]);

  return <Screen onBack={response?.attempt ? undefined : exit}>
    {response?.attempt ? <QuizRunner key={response.attempt._id} initial={response.attempt} onExit={exit} /> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.scroll}><View style={styles.stack}>
      {response?.error ? <><Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{response.error}</Text>
        <Pressable accessibilityRole="button" onPress={() => { setResponse(null); setRetry(v => v + 1); }} style={styles.action}><Text style={[typography.reading.sm, { color: colors.primary }]}>Try again</Text></Pressable></> : <ActivityIndicator color={colors.primary} />}
    </View></ScrollView>}
  </Screen>;
}
const styles = StyleSheet.create({
  back: { minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  notice: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 58, borderRadius: 12 },
  choiceMark: { width: 24, height: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stack: { gap: 16 }, card: { gap: 12, padding: 16, borderWidth: 1.5, borderRadius: radius.md },
  action: { minHeight: 48, padding: 12, borderRadius: radius.sm, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 12 }, flex: { flex: 1, minWidth: 0 }, progress: { height: 8, borderRadius: 4, overflow: 'hidden' },
});
