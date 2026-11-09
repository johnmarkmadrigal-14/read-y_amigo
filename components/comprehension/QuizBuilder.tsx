import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../app/theme/ThemeProvider';
import { radius, typography } from '../../app/theme/tokens';
import type { ReadingPassage } from '../readingRate';
import { quizSets, saveQuizSet } from './api';
import { formatQuiz, parseQuiz, sampleQuiz } from './parser';
import type { QuizConfig, QuizDraft, QuizQuestion, QuizSet } from './types';

export function QuizBuilder({ passage, onChange, disabled = false }: {
  passage: ReadingPassage; onChange: (draft: QuizDraft | null) => void; disabled?: boolean;
}) {
  const { colors } = useTheme();
  const [source, setSource] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [preview, setPreview] = useState(false);
  const [access, setAccess] = useState<QuizConfig['passageAccess']>('after-submission');
  const [showPassage, setShowPassage] = useState(false);
  const [help, setHelp] = useState(false);
  const [sets, setSets] = useState<QuizSet[] | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const text = [typography.reading.sm, { color: colors.text }];
  const input = [styles.input, typography.reading.sm, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }];
  const action = (label: string, run: () => void, primary = false) => <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={run}
    style={[styles.action, { borderColor: colors.primary, backgroundColor: primary ? colors.primary : colors.background, opacity: disabled || busy ? 0.5 : 1 }]}>
    <Text style={[typography.reading.sm, { color: primary ? colors.primaryText : colors.primary, textAlign: 'center' }]}>{label}</Text>
  </Pressable>;
  function edit(value: string) { setSource(value); setPreview(false); setQuestions([]); onChange(null); setError(''); }
  function inspect() {
    try { const next = parseQuiz(source); setQuestions(next); setPreview(true); setError(''); onChange(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Invalid quiz.'); }
  }
  async function loadSets() {
    setBusy(true); setError('');
    try { setSets((await quizSets(passage)).sets); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load saved sets.'); }
    finally { setBusy(false); }
  }
  async function saveSet() {
    if (!title.trim()) { setError('Enter a name for this saved quiz set.'); return; }
    setBusy(true); setError('');
    try { await saveQuizSet(title, passage, { questions, passageAccess: access }); Alert.alert('Quiz set saved', 'You can reuse this set with the same confirmed passage.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save this set.'); }
    finally { setBusy(false); }
  }
  return <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
    <Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>Comprehension setup</Text>
    <Text style={text}>Linked to the confirmed passage · {passage.wordCount} words</Text>
    {action(showPassage ? 'Hide passage preview' : 'Preview passage', () => setShowPassage(v => !v))}
    {showPassage && <Text selectable style={text}>{passage.text}</Text>}
    <Text style={[typography.display.md, { color: colors.primary }]}>Passage ✓  •  {preview ? 'Questions ✓  •  Preview' : 'Questions  •  Preview'}</Text>
    {action('Use saved set', () => { void loadSets(); })}
    {sets && <View style={styles.stack}>
      {!sets.length && <Text style={text}>No saved sets match this exact passage and word count yet.</Text>}
      {sets.map(set => <View key={set._id}>{action(`${set.title} · ${set.quiz.questions.length} questions`, () => {
        const formatted = formatQuiz(set.quiz.questions); setAccess(set.quiz.passageAccess); edit(formatted); setSets(null);
      })}</View>)}
    </View>}
    <Text style={[typography.display.md, { color: colors.text }]}>Paste questions</Text>
    <Text style={text}>Paste questions, choices and answer keys together. Preview and check them before publishing.</Text>
    {!preview ? <>
      <TextInput accessibilityLabel="Paste comprehension questions" value={source} onChangeText={edit} editable={!disabled && !busy}
        multiline maxLength={80000} placeholder={sampleQuiz} placeholderTextColor={colors.textMuted} style={[input, { minHeight: 280, textAlignVertical: 'top' }]} />
      {action('Preview questions', inspect, true)}
      {action(help ? 'Hide format guide' : 'Question format guide', () => setHelp(v => !v))}
      {help && <Text selectable style={text}>{`Number questions as 1. and choices as A., B., C.\nANSWER: A (checkboxes: ANSWER: A, C)\nOptional TYPE: multiple-choice / true-false / checkboxes / short-answer / essay\nTrue/false: ANSWER: TRUE or FALSE\nManual response: GUIDE: expected answer\nEssay: RUBRIC: intended scoring rubric (required)\nPOINTS: 1\nSUPPORT: supporting passage paragraph\nUse one line per field. Separate questions with a blank line. Checkbox scoring uses exact matching.`}</Text>}
    </> : <>
      <Text style={text}>{questions.length} questions detected · Teacher preview</Text>
      {questions.map((q, i) => <View key={i} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={text}>{i + 1}. {q.question}</Text>
        <Text style={text}>{q.type} · {q.points} classroom points</Text>
        {q.choices?.map((choice, index) => <Text key={index} style={text}>{String.fromCharCode(65 + index)}. {choice}</Text>)}
        <Text style={[...text, { color: colors.primary }]}>{q.correctAnswer !== undefined ? `Answer key: ${(Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer]).map(index => String.fromCharCode(65 + index)).join(', ')}` : 'Teacher grading required'}</Text>
        {!!q.expectedAnswer && <Text style={text}>Expected answer: {q.expectedAnswer}</Text>}
        {!!q.rubric && <Text style={text}>Rubric: {q.rubric}</Text>}
        {!!q.supportingParagraph && <Text style={text}>Passage support: {q.supportingParagraph}</Text>}
      </View>)}
      <Text style={text}>Passage access inside the quiz</Text>
      {(['after-submission', 'during-quiz'] as const).map(value => <View key={value}>{action(`${access === value ? '✓ ' : ''}${value === 'during-quiz' ? 'Available while answering' : 'Hidden until quiz submission'}`, () => { setAccess(value); onChange(null); })}</View>)}
      <Text style={text}>This controls the quiz screen only; it does not lock other copies of the material.</Text>
      {action('Use this reviewed quiz', () => { onChange({ passage: { ...passage }, quiz: { questions, passageAccess: access } }); Alert.alert('Quiz ready', 'The quiz is linked to this passage. Publish the reading assignment to make it available.'); }, true)}
      {action('Edit pasted questions', () => { setPreview(false); onChange(null); })}
      <TextInput accessibilityLabel="Saved quiz set name" value={title} onChangeText={setTitle} maxLength={200} editable={!disabled && !busy}
        placeholder="Name this set to reuse it" placeholderTextColor={colors.textMuted} style={input} />
      {action('Save reusable set', () => { void saveSet(); })}
    </>}
    {busy && <ActivityIndicator color={colors.primary} />}
    {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: radius.md, padding: 16, gap: 12 },
  stack: { gap: 8 }, input: { borderWidth: 1, borderRadius: radius.sm, padding: 12, minHeight: 48 },
  action: { minHeight: 48, padding: 12, borderWidth: 1.5, borderRadius: radius.sm, justifyContent: 'center' },
});
