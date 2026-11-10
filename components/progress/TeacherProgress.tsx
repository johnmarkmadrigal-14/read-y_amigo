import { learnerReadingProgress } from './api';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { type ApiEnrollment } from '../../app/lib/api';
import { Screen } from '../../app/components/Screen';
import { useTheme } from '../../app/theme/ThemeProvider';
import { typography } from '../../app/theme/tokens';
import { comprehensionLevel, historyInRange, latestMetrics, metricNumber, submissionDate, type LearnerReadingProgress, type ReadingSummary } from './data';
import { MetricsRow, ProgressAction, ProgressBadge, ProgressCard, progressStyles as s } from './ProgressUI';
import { MetricChart } from './MetricChart';

export type ProgressEnrollment = ApiEnrollment & { readingSummary?: ReadingSummary; latestReadingAt?: string };
export function TeacherProgress({ classId, progress }: { classId: string; progress: ProgressEnrollment[] }) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ProgressEnrollment | null>(null);
  const filtered = progress.filter(row => row.learner.displayName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <View style={s.stack}>
    <Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>Learner progress</Text>
    <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Tap a learner to view trends and reading history.</Text>
    <TextInput accessibilityLabel="Search learner" placeholder="Search learner" placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} style={[s.input, typography.reading.sm, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
    <ProgressBadge>{progress.length} {progress.length === 1 ? 'learner' : 'learners'}</ProgressBadge>
    {!filtered.length && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{progress.length ? 'No learners match your search.' : 'No learners have joined yet.'}</Text>}
    {filtered.map(enrollment => <Pressable key={enrollment._id} accessibilityRole="button" accessibilityLabel={`View progress for ${enrollment.learner.displayName}`} onPress={() => setSelected(enrollment)}>
      <ProgressCard>
        <View style={s.row}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={[typography.display.md, { color: colors.primaryText }]}>{enrollment.learner.displayName.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</Text></View>
          <View style={{ flex: 1 }}><Text style={[typography.display.md, { color: colors.text }]}>{enrollment.learner.displayName}</Text><Text style={{ color: colors.textMuted, fontSize: 12 }}>{enrollment.latestReadingAt ? `Latest reading · ${submissionDate(enrollment.latestReadingAt)}` : 'Open learner history'}</Text></View>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </View>
        <MetricsRow summary={enrollment.readingSummary} />
      </ProgressCard>
    </Pressable>)}
    <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Blue: reading speed · Green: word accuracy · Orange: comprehension. A dash means no available result.</Text>
    <Modal visible={selected !== null} animationType="slide" onRequestClose={() => setSelected(null)}>
      {selected && <LearnerAnalytics key={`${classId}:${selected.learner._id}`} classId={classId} learner={selected.learner} onClose={() => setSelected(null)} />}
    </Modal>
  </View>;
}
function LearnerAnalytics({ classId, learner, onClose }: { classId: string; learner: ApiEnrollment['learner']; onClose: () => void }) {
  const { colors } = useTheme();
  const [data, setData] = useState<LearnerReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [range, setRange] = useState<'All time' | 'This month'>('All time');
  const [visibleCount, setVisibleCount] = useState(10);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError('');
    learnerReadingProgress(classId, learner._id).then(response => { if (active) setData(response); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load reading history.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // revision deliberately retries this read-only request while the screen stays focused.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, learner._id, revision]));
  const rows = useMemo(() => historyInRange(data?.history ?? [], range), [data, range]);
  const summary = latestMetrics(rows);
  const level = comprehensionLevel(metricNumber(summary.comprehension, true));
  const openHistory = (submissionId: string | undefined, classworkId: string) => {
    onClose();
    if (submissionId) router.push({ pathname: '/teacher/classwork/submission/[id]', params: { id: submissionId, classworkId } });
    else router.push({ pathname: '/teacher/classwork/comprehension/[id]', params: { id: classworkId } });
  };
  return <Screen>
    <View style={[s.row, { paddingVertical: 8 }]}><ProgressAction label="‹ Back" onPress={onClose} /><Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text, flex: 1 }]}>Learner progress</Text></View>
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => setRevision(v => v + 1)} />} contentContainerStyle={[s.stack, { paddingBottom: 30 }]}>
      <Text style={[typography.display.lg, { color: colors.text }]}>{learner.displayName}</Text>
      <View style={s.row}>{(['All time', 'This month'] as const).map(value => <ProgressAction key={value} label={value} selected={range === value} onPress={() => { setRange(value); setVisibleCount(10); }} />)}</View>
      {loading && <ActivityIndicator accessibilityLabel="Loading reading history" color={colors.primary} />}
      {!!error && <ProgressCard><Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text><ProgressAction label="Retry" onPress={() => setRevision(v => v + 1)} /></ProgressCard>}
      {!error && data && <>
        <MetricsRow summary={summary} />
        <MetricChart key={`speed:${range}`} title="Reading speed" metric="speed" rows={rows} />
        <MetricChart key={`accuracy:${range}`} title="Word accuracy" metric="accuracy" rows={rows} />
        <MetricChart key={`comprehension:${range}`} title="Comprehension" metric="comprehension" rows={rows} />
        {!!level && <View style={s.row}><Text style={[typography.reading.sm, { color: colors.text }]}>Latest comprehension level</Text><ProgressBadge tone={level === 'Independent' ? 'green' : 'orange'}>{level}</ProgressBadge></View>}
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Comprehension uses finalized passage quizzes. Pending and unavailable results are excluded. Word accuracy comes from saved assessment results.</Text>
        <View style={[s.row, { justifyContent: 'space-between' }]}><Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>Reading history</Text><Text style={{ color: colors.textMuted }}>{rows.length} submissions · Newest first</Text></View>
        {!rows.length && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>No submitted reading activities in this period.</Text>}
        {rows.slice(0, visibleCount).map(row => <ProgressCard key={row.id}>
          <Text style={[typography.display.md, { color: colors.text }]}>{row.title}</Text>
          <View style={s.row}>
            {row.activities.includes('read-aloud') && <ProgressBadge tone="blue">{row.activities.includes('comprehension') ? 'Read-aloud' : 'Read-aloud only'}</ProgressBadge>}
            {row.activities.includes('comprehension') && <ProgressBadge tone="green">{row.activities.includes('read-aloud') ? '+ Comprehension' : 'Comprehension only'}</ProgressBadge>}
          </View>
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Submitted {submissionDate(row.submittedAt)}</Text>
          <MetricsRow summary={row} />
          {row.readingUnavailable && <Text style={{ color: colors.textMuted }}>Earlier recording is no longer available. Quiz result retained.</Text>}
          {row.comprehension.status === 'pending-review' && <ProgressBadge tone="orange">Comprehension pending review</ProgressBadge>}
          {!!row.comprehensionScore && metricNumber(row.comprehension, true) !== null && <Text style={[typography.reading.sm, { color: colors.text }]}>Comprehension: {row.comprehensionScore.correctAnswers} / {row.comprehensionScore.totalQuestions} correct</Text>}
          <ProgressAction label="View submission" onPress={() => openHistory(row.readingSubmissionId, row.classworkId)} />
        </ProgressCard>)}
        {rows.length > visibleCount && <ProgressAction label={`Show more (${rows.length - visibleCount} remaining)`} onPress={() => setVisibleCount(count => count + 10)} />}
      </>}
    </ScrollView>
  </Screen>;
}
