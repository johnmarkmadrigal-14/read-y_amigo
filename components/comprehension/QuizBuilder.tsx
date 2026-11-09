import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../app/theme/ThemeProvider';
import { typography } from '../../app/theme/tokens';
import type { ReadingPassage } from '../readingRate';
import { quizSets, saveQuizSet } from './api';
import { formatQuiz, parseQuiz, sampleQuiz } from './parser';
import { QuizAction, QuizDisclosure, ui } from './QuizUI';
import type { QuizConfig, QuizDraft, QuizQuestion, QuizSet } from './types';

type Step = 'passage' | 'questions' | 'preview';
export function QuizBuilder({ passage, onChange, disabled = false, title = 'Reading assignment' }: {
  passage: ReadingPassage; onChange: (draft: QuizDraft | null) => void; disabled?: boolean; title?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('questions');
  const [method, setMethod] = useState<'paste' | 'sets'>('paste');
  const [source, setSource] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [access, setAccess] = useState<QuizConfig['passageAccess']>('after-submission');
  const [sets, setSets] = useState<QuizSet[] | null>(null);
  const [setTitle, setSetTitle] = useState('');
  const [previewIndex, setPreviewIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const blocked = disabled || busy;
  const text = [typography.reading.sm, { color: colors.text }];
  const input = [ui.input, typography.reading.sm, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }];
  function invalidate() { setReady(false); onChange(null); }
  function edit(value: string) { setSource(value); setQuestions([]); invalidate(); setError(''); }
  function inspect() {
    try { const next = parseQuiz(source); setQuestions(next); setPreviewIndex(0); setStep('preview'); setError(''); invalidate(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Invalid quiz.'); }
  }
  async function loadSets() {
    setMethod('sets'); setBusy(true); setError('');
    try { setSets((await quizSets(passage)).sets); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load saved sets.'); }
    finally { setBusy(false); }
  }
  async function saveSet() {
    if (!setTitle.trim()) { setError('Enter a name for this saved quiz set.'); return; }
    setBusy(true); setError('');
    try { await saveQuizSet(setTitle, passage, { questions, passageAccess: access }); Alert.alert('Quiz set saved', 'You can reuse this set with the same confirmed passage.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save this set.'); }
    finally { setBusy(false); }
  }
  const steps: { key: Step; label: string }[] = [{ key: 'passage', label: 'Passage' }, { key: 'questions', label: 'Questions' }, { key: 'preview', label: 'Preview' }];
  const activeStep = steps.findIndex(item => item.key === step);
  return <>
    <View style={[ui.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text accessibilityRole="header" style={[typography.display.md, { color: colors.text }]}>Comprehension quiz</Text>
      <Text style={text}>{ready ? `✓ ${questions.length} reviewed questions ready to publish` : 'Paste questions or use a saved set, then review before publishing.'}</Text>
      <QuizAction label={ready ? 'Review quiz setup' : 'Set up comprehension quiz'} onPress={() => setOpen(true)} disabled={blocked} primary />
    </View>
    <Modal visible={open} animationType="slide" onRequestClose={() => { if (!blocked) setOpen(false); }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <KeyboardAvoidingView style={styles.shell} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={ui.header}>
            <QuizAction label="Close setup" onPress={() => setOpen(false)} disabled={blocked} compact />
            <Text accessibilityRole="header" style={[typography.display.md, ui.flex, { color: colors.text }]}>Comprehension setup</Text>
          </View>
          <ScrollView key={step} style={ui.fill} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.scroll}>
            <View style={[ui.titleCard, { backgroundColor: colors.surface }]}>
              <Text style={[typography.display.lg, { color: colors.text }]}>{title}</Text>
              <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Reading assignment</Text>
            </View>
            <QuizDisclosure title={`Confirmed passage · ${passage.wordCount} words`}><Text selectable style={text}>{passage.text}</Text></QuizDisclosure>
            <View style={styles.steps}>
              {steps.map((item, index) => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`Step ${index + 1}: ${item.label}`}
                disabled={blocked || (item.key === 'preview' && !questions.length)} accessibilityState={{ selected: step === item.key }}
                onPress={() => setStep(item.key)} style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: index === activeStep ? colors.primary : index < activeStep ? colors.secondary : colors.surface }]}>
                  <Text style={[typography.reading.sm, { color: index === activeStep ? colors.primaryText : colors.text }]}>{index < activeStep ? '✓' : index + 1}</Text>
                </View>
                <Text style={[typography.reading.sm, { color: colors.text, textAlign: 'center' }]}>{item.label}</Text>
              </Pressable>)}
            </View>
            {step === 'passage' && <View style={ui.stack}>
              <Text style={[typography.display.md, { color: colors.text }]}>Your passage is confirmed</Text>
              <Text style={text}>Questions will be linked to this exact passage and word count.</Text>
              <Text selectable style={text}>{passage.text}</Text>
            </View>}
            {step === 'questions' && <>
              <View accessibilityRole="tablist" style={[ui.tabs, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                {([{ key: 'paste', label: 'Paste questions' }, { key: 'sets', label: 'Saved sets' }] as const).map(item => <Pressable key={item.key} accessibilityRole="tab"
                  accessibilityState={{ selected: method === item.key }} aria-selected={method === item.key} disabled={blocked}
                  onPress={() => { if (item.key === 'sets') void loadSets(); else setMethod('paste'); }}
                  style={[ui.tab, { backgroundColor: method === item.key ? colors.primary : 'transparent' }]}>
                  <Text style={[typography.reading.sm, { color: method === item.key ? colors.primaryText : colors.text, textAlign: 'center' }]}>{item.label}</Text>
                </Pressable>)}
              </View>
              {method === 'paste' ? <>
                <Text style={[typography.display.md, { color: colors.text }]}>Add your questions</Text>
                <Text style={text}>Paste questions, choices and answer keys together.</Text>
                <View style={styles.editor}>
                  <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Teacher only</Text>
                  <TextInput accessibilityLabel="Paste comprehension questions" value={source} onChangeText={edit} editable={!blocked}
                    multiline maxLength={80000} placeholder={sampleQuiz} placeholderTextColor={colors.textMuted} style={[input, { minHeight: 280, textAlignVertical: 'top' }]} />
                </View>
                <QuizDisclosure title="Question format guide"><Text selectable style={text}>{`Number questions as 1. and choices as A., B., C.\nANSWER: A (checkboxes: ANSWER: A, C)\nTYPE: multiple-choice / true-false / checkboxes / short-answer / essay\nTrue/false: ANSWER: TRUE or FALSE\nManual response: GUIDE: expected answer\nEssay: RUBRIC: intended scoring rubric (required)\nPOINTS: 1\nSUPPORT: supporting passage paragraph\nUse one line per field. Separate questions with a blank line. Checkbox grading requires exact matching.`}</Text></QuizDisclosure>
              </> : <View style={ui.stack}>
                <Text style={[typography.display.md, { color: colors.text }]}>Reuse a quiz set</Text>
                <Text style={text}>Only sets matching this confirmed passage are listed.</Text>
                {sets && !sets.length && <Text style={text}>No saved sets match this exact passage and word count yet.</Text>}
                {sets?.map(set => <QuizAction key={set._id} label={`${set.title} · ${set.quiz.questions.length} questions`} disabled={blocked} onPress={() => {
                  edit(formatQuiz(set.quiz.questions)); setAccess(set.quiz.passageAccess); setMethod('paste');
                }} />)}
                <QuizAction label="Refresh saved sets" onPress={() => { void loadSets(); }} disabled={blocked} />
              </View>}
            </>}
            {step === 'preview' && <>
              <Text style={[typography.display.md, { color: colors.text }]}>Review {questions.length} questions</Text>
              <Text style={text}>Check the wording, answer key and intended scoring before publishing.</Text>
              {questions.map((q, index) => <View key={index} style={[ui.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Preview question ${index + 1}`} accessibilityState={{ expanded: previewIndex === index }} aria-expanded={previewIndex === index}
                  onPress={() => setPreviewIndex(old => old === index ? -1 : index)} style={styles.questionHeading}>
                  <Text style={[typography.display.md, ui.flex, { color: colors.text }]}>{index + 1}. {q.question}</Text><Text style={{ color: colors.primary }}>{previewIndex === index ? '⌃' : '⌄'}</Text>
                </Pressable>
                {previewIndex === index && <View style={{ gap: 8 }}>
                  <Text style={text}>{q.type} · {q.points} quiz points</Text>
                  {q.choices?.map((choice, i) => <Text key={i} style={text}>{String.fromCharCode(65 + i)}. {choice}</Text>)}
                  <Text style={[...text, { color: colors.primary }]}>{q.correctAnswer !== undefined ? `Answer key: ${(Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer]).map(i => String.fromCharCode(65 + i)).join(', ')}` : 'Teacher grading required'}</Text>
                  {!!q.expectedAnswer && <Text style={text}>Expected answer: {q.expectedAnswer}</Text>}
                  {!!q.rubric && <Text style={text}>Rubric: {q.rubric}</Text>}
                  {!!q.supportingParagraph && <Text style={text}>Passage support: {q.supportingParagraph}</Text>}
                </View>}
              </View>)}
              <QuizDisclosure title="Passage access setting">
                {(['after-submission', 'during-quiz'] as const).map(value => <QuizAction key={value}
                  label={value === 'during-quiz' ? 'Available while answering' : 'Hidden until quiz submission'} selected={access === value} disabled={blocked}
                  onPress={() => { setAccess(value); invalidate(); }} />)}
                <Text style={text}>This controls the quiz screen only; it does not lock other copies of the material.</Text>
              </QuizDisclosure>
              <QuizDisclosure title="Save reusable set (optional)">
                <TextInput accessibilityLabel="Saved quiz set name" value={setTitle} onChangeText={setSetTitle} maxLength={200} editable={!blocked}
                  placeholder="Name this set to reuse it" placeholderTextColor={colors.textMuted} style={input} />
                <QuizAction label="Save reusable set" onPress={() => { void saveSet(); }} disabled={blocked} />
              </QuizDisclosure>
            </>}
            {busy && <ActivityIndicator color={colors.primary} />}
            {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>}
          </ScrollView>
          <View style={[ui.footer, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[typography.reading.sm, { color: colors.textMuted, textAlign: 'center' }]}>{step === 'preview' ? 'Confirm the reviewed set, then publish the assignment.' : 'Review before publishing'}</Text>
            <View style={ui.row}>
              <View style={{ flex: 1 }}><QuizAction label="Back" onPress={() => { if (step === 'passage') setOpen(false); else setStep(step === 'preview' ? 'questions' : 'passage'); }} disabled={blocked} /></View>
              <View style={{ flex: 2 }}><QuizAction label={step === 'passage' ? 'Continue to questions' : step === 'questions' ? 'Preview questions' : 'Use this reviewed quiz'} primary disabled={blocked || (step === 'questions' && method === 'sets')}
                onPress={() => {
                  if (step === 'passage') setStep('questions');
                  else if (step === 'questions') inspect();
                  else { onChange({ passage: { ...passage }, quiz: { questions, passageAccess: access } }); setReady(true); setOpen(false); }
                }} /></View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  shell: { flex: 1, padding: 16 }, steps: { flexDirection: 'row', gap: 8 }, step: { flex: 1, alignItems: 'center', gap: 6, minHeight: 72 },
  stepNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  editor: { gap: 8 }, questionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
});
