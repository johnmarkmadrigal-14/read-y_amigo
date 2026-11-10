import { standaloneQuizResults } from '../comprehension/api';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { ApiClasswork } from '../../app/lib/api';
import { useTheme } from '../../app/theme/ThemeProvider';
import { typography } from '../../app/theme/tokens';
import type { QuizResultSummary } from './data';
import { learnerQuizResults } from './api';
import { comprehensionLevel, finalPercentage, submissionDate } from './data';
import { ProgressAction, ProgressBadge, ProgressCard, progressStyles as s } from './ProgressUI';

export function LearnerQuizList({ classId, items, onOpenStandalone }: {
  classId: string; items: ApiClasswork[]; onOpenStandalone: (item: ApiClasswork) => void;
}) {
  const { colors } = useTheme();
  const [attempts, setAttempts] = useState<QuizResultSummary[]>([]);
  const [classroomAttempts, setClassroomAttempts] = useState<QuizResultSummary[]>([]);
  const [source, setSource] = useState('All sources');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError(''); setAttempts([]); setClassroomAttempts([]);
    Promise.all([learnerQuizResults(classId), standaloneQuizResults(classId)]).then(([data, quizzes]) => { if (active) { setAttempts(data); setClassroomAttempts(quizzes.attempts); } })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load your quiz results.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // revision deliberately retries this read-only request while the screen stays focused.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, revision]));
  // The server returns the current attempt for each assigned passage. Historical
  // attempts stay in reading history, preventing duplicate classroom quiz cards.
  const passages = items.filter(item => item.type === 'reading' && item.readingActivities?.includes('comprehension'));
  const standalone = items.filter(item => item.type === 'quiz');
  const openPassage = (id: string) => router.push({ pathname: '/learner/comprehension/[id]', params: { id, classId } });
  return <View style={s.stack}>
    <Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>My quizzes</Text>
    <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Passage quizzes and classroom quizzes.</Text>
    <View style={s.row}>{['All sources', 'From passages', 'Standalone'].map(label => <ProgressAction key={label} label={label} selected={source === label} onPress={() => setSource(label)} />)}</View>
    {loading && <ActivityIndicator accessibilityLabel="Loading quiz results" color={colors.primary} />}
    {!!error && <ProgressCard><Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text><ProgressAction label="Refresh results" onPress={() => setRevision(v => v + 1)} /></ProgressCard>}
    {source !== 'Standalone' && passages.map(item => {
      const attempt = attempts.find(a => a.classwork === item._id);
      const percentage = attempt ? finalPercentage(attempt) : null;
      const level = comprehensionLevel(percentage);
      const status = attempt?.status === 'pending-review' ? 'Pending teacher review' : attempt?.status === 'graded' ? 'Completed' : attempt ? 'In progress' : loading || error ? 'Result unavailable' : 'Not started';
      return <ProgressCard key={item._id}>
        <Text style={[typography.display.md, { color: colors.text }]}>{item.title}</Text>
        <View style={s.row}><ProgressBadge tone="blue">Passage quiz</ProgressBadge><ProgressBadge tone={attempt?.status === 'graded' ? 'green' : 'neutral'}>{status}</ProgressBadge></View>
        {attempt && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{attempt.attemptLabel}</Text>}
        {percentage !== null && attempt?.result && <>
          <Text style={[typography.display.lg, { color: colors.primary }]}>{attempt.result.correctAnswers} / {attempt.result.totalQuestions} correct · {Number(percentage.toFixed(1))}%</Text>
          <View style={s.row}><Text style={[typography.reading.sm, { color: colors.text }]}>Comprehension level</Text><ProgressBadge tone={level === 'Independent' ? 'green' : 'orange'}>{level}</ProgressBadge></View>
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Quiz points: {attempt.result.earnedPoints} / {attempt.result.maxPoints}</Text>
        </>}
        {attempt?.status === 'pending-review' && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Your final score and level will appear after teacher review.</Text>}
        {!!attempt?.submittedAt && <Text style={{ color: colors.textMuted }}>{submissionDate(attempt.submittedAt)}</Text>}
        <ProgressAction label={attempt?.status === 'graded' || attempt?.status === 'pending-review' ? 'View result' : 'Open reading activity'} onPress={() => attempt?.status === 'graded' || attempt?.status === 'pending-review' ? openPassage(item._id) : router.push({ pathname: '/learner/classwork/[id]', params: { id: item._id, classId } })} />
      </ProgressCard>;
    })}
    {source !== 'From passages' && standalone.map(item => {
      const attempt = classroomAttempts.find(attempt => attempt.classwork === item._id);
      const percentage = attempt ? finalPercentage(attempt) : null;
      return <ProgressCard key={item._id}>
        <Text style={[typography.display.md, { color: colors.text }]}>{item.title}</Text>
        <ProgressBadge>Standalone quiz</ProgressBadge>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{attempt?.status === 'pending-review' ? 'Pending teacher review' : attempt?.status === 'graded' ? 'Completed' : attempt ? 'In progress' : 'Classroom assessment'}</Text>
        {percentage !== null && attempt?.result && <Text style={[typography.display.md, { color: colors.primary }]}>{attempt.result.earnedPoints} / {attempt.result.maxPoints} points · {Number(percentage.toFixed(1))}% correct</Text>}
        {!!attempt?.submittedAt && <Text style={{ color: colors.textMuted }}>{submissionDate(attempt.submittedAt)}</Text>}
        <ProgressAction label={attempt && attempt.status !== 'draft' ? 'View quiz result' : 'Open classroom quiz'} onPress={() => onOpenStandalone(item)} />
      </ProgressCard>;
    })}
    {!loading && !error && (source === 'Standalone' ? standalone.length === 0 : source === 'From passages' ? passages.length === 0 : passages.length + standalone.length === 0) && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>No quizzes in this category yet.</Text>}
    <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Your passage quiz results appear here automatically.</Text>
  </View>;
}
