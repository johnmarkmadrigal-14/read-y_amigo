import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../app/components/Screen';
import { useTheme } from '../../app/theme/ThemeProvider';
import { radius, typography } from '../../app/theme/tokens';
import { comprehensionInfo, saveComprehension, startComprehension } from './api';
import type { Answer, Attempt, QuizQuestion } from './types';

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
  return <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
    <Text style={[typography.display.lg, { color: colors.text }]}>{attempt.status === 'pending-review' ? 'Pending teacher review' : 'Comprehension result'}</Text>
    {result && <>
      <Text style={[typography.reading.md, { color: colors.primary }]}>{result.percentage === null ? `${result.pendingQuestions} written responses awaiting grading` : `${result.correctAnswers} / ${result.totalQuestions} correct · ${result.percentage.toFixed(1)}%`}</Text>
      <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{result.percentage === null ? 'Your final comprehension percentage will appear after every question is graded.' : `Classroom points: ${result.earnedPoints} / ${result.maxPoints}. These are separate from the comprehension percentage.`}</Text>
    </>}
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
function QuizButton({ label, onPress, disabled = false, primary = false }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
    style={[styles.action, { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: primary ? colors.primary : colors.background, opacity: disabled ? 0.45 : 1 }]}>
    <Text style={[typography.reading.sm, { color: primary ? colors.primaryText : colors.primary, textAlign: 'center' }]}>{label}</Text>
  </Pressable>;
}
function QuizRunner({ initial, onExit }: { initial: Attempt; onExit: () => void }) {
  const { colors } = useTheme();
  const [attempt, setAttempt] = useState(initial);
  const [answers, setAnswers] = useState(initial.answers);
  const [index, setIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassage, setShowPassage] = useState(false);
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
  const q = attempt.quiz.questions[index], answer = answers.find(a => a.questionId === q.id)?.answer;
  return <View style={styles.stack}>
    <QuizButton label="Return to reading activity" onPress={() => { void exit(); }} disabled={busy} />
    <Text style={[typography.display.lg, { color: colors.text }]}>Comprehension quiz</Text>
    <Text style={[typography.display.md, { color: colors.text }]}>{attempt.title || 'Reading activity'}</Text>
    <Text style={text}>{attempt.attemptLabel} · {attempt.readingSubmission ? '✓ Read-aloud submitted' : 'Comprehension-only reading activity'}</Text>
    {attempt.status !== 'draft' ? <AttemptResult attempt={attempt} /> : <>
      <Text style={text}>Question {index + 1} of {attempt.quiz.questions.length}</Text>
      <View style={[styles.progress, { backgroundColor: colors.border }]}><View style={{ height: 8, width: `${(index + 1) / attempt.quiz.questions.length * 100}%`, backgroundColor: colors.secondary }} /></View>
      {attempt.passage ? <>
        <QuizButton label={showPassage ? 'Hide passage' : 'View passage'} onPress={() => setShowPassage(v => !v)} disabled={busy} />
        {showPassage && <Text selectable style={text}>{attempt.passage.text}</Text>}
      </> : <Text style={[...text, { color: colors.textMuted }]}>Passage hidden in the quiz until submission.</Text>}
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[typography.display.md, { color: colors.text }]}>{q.question}</Text>
        {q.choices?.map((choice, choiceIndex) => {
          const selected = Array.isArray(answer) ? answer.includes(choiceIndex) : answer === choiceIndex;
          return <Pressable key={choiceIndex} accessibilityRole={q.type === 'checkboxes' ? 'checkbox' : 'radio'} accessibilityState={{ checked: selected, disabled: busy }} aria-checked={selected}
            disabled={busy} onPress={() => change(q.type === 'checkboxes' ? selected ? (answer as number[]).filter(i => i !== choiceIndex) : [...(Array.isArray(answer) ? answer : []), choiceIndex] : choiceIndex)}
            style={[styles.action, { borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: colors.background }]}>
            <Text style={text}>{selected ? '● ' : '○ '}{String.fromCharCode(65 + choiceIndex)}. {choice}</Text>
          </Pressable>;
        })}
        {(q.type === 'short-answer' || q.type === 'essay') && <TextInput accessibilityLabel="Your written answer" value={typeof answer === 'string' ? answer : ''} onChangeText={change}
          editable={!busy} multiline maxLength={20000} placeholder="Type your answer…" placeholderTextColor={colors.textMuted}
          style={[styles.card, typography.reading.sm, { minHeight: q.type === 'essay' ? 180 : 100, color: colors.text, borderColor: colors.border, backgroundColor: colors.background, textAlignVertical: 'top' }]} />}
        <Text style={[...text, { color: colors.textMuted }]}>{q.type === 'checkboxes' ? 'Select all correct answers. Exact matching is required.' : q.choices ? 'Choose one answer.' : 'Your teacher will review this response.'}</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.flex}><QuizButton label="Previous" onPress={() => { void (async () => { if (!dirty || await persist()) setIndex(i => i - 1); })(); }} disabled={busy || index === 0} /></View>
        <View style={styles.flex}><QuizButton label={index < attempt.quiz.questions.length - 1 ? 'Next' : 'Submit quiz'} primary disabled={busy} onPress={() => {
          if (index < attempt.quiz.questions.length - 1) { void (async () => { if (!dirty || await persist()) setIndex(i => i + 1); })(); return; }
          const missing = attempt.quiz.questions.filter(question => !answered(question, answers)).length;
          if (missing) { setError(`Answer all questions before submitting. ${missing} unanswered.`); return; }
          setConfirming(true);
          Alert.alert('Submit comprehension quiz?', 'Your responses will be locked after submission.', [{ text: 'Keep answering', style: 'cancel', onPress: () => setConfirming(false) }, { text: 'Submit', onPress: () => { setConfirming(false); void persist(true); } }], { cancelable: true, onDismiss: () => setConfirming(false) });
        }} /></View>
      </View>
      <QuizButton label="Save progress" onPress={() => { void persist(); }} disabled={busy} />
      <Text accessibilityLiveRegion="polite" style={[...text, { color: colors.textMuted }]}>{busy ? 'Saving…' : dirty ? 'Unsaved changes' : 'Progress saved'}</Text>
    </>}
    {!!error && <Text accessibilityRole="alert" style={[...text, { color: colors.retryText }]}>{error} Reopen the quiz if another session changed this attempt.</Text>}
  </View>;
}
export function LearnerQuizScreen() {
  const { colors } = useTheme();
  const { id, classId } = useLocalSearchParams<{ id: string; classId: string }>();
  const [response, setResponse] = useState<{ attempt?: Attempt; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    startComprehension(id).then(data => { if (active) setResponse(data); }).catch(err => { if (active) setResponse({ error: err instanceof Error ? err.message : 'Could not start the quiz.' }); });
    return () => { active = false; };
  }, [id, retry]);
  const exit = () => router.replace({ pathname: '/learner/classwork/[id]', params: { id, classId } });
  return <Screen><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
    {response?.attempt ? <QuizRunner key={response.attempt._id} initial={response.attempt} onExit={exit} /> : <View style={styles.stack}>
      <Pressable accessibilityRole="button" onPress={exit} style={styles.action}><Text style={[typography.reading.sm, { color: colors.primary }]}>Return to reading activity</Text></Pressable>
      {response?.error ? <><Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{response.error}</Text>
        <Pressable accessibilityRole="button" onPress={() => { setResponse(null); setRetry(v => v + 1); }} style={styles.action}><Text style={[typography.reading.sm, { color: colors.primary }]}>Try again</Text></Pressable></> : <ActivityIndicator color={colors.primary} />}
    </View>}
  </ScrollView></Screen>;
}
const styles = StyleSheet.create({
  stack: { gap: 16 }, card: { gap: 12, padding: 16, borderWidth: 1.5, borderRadius: radius.md },
  action: { minHeight: 48, padding: 12, borderRadius: radius.sm, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 12 }, flex: { flex: 1, minWidth: 0 }, progress: { height: 8, borderRadius: 4, overflow: 'hidden' },
});
