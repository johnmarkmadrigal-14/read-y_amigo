import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../components/Screen';
import { authRequest } from '../lib/api';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/tokens';
import { MetricChart } from '../../components/progress/MetricChart';
import { ProgressAction, ProgressBadge, ProgressCard, progressStyles as s } from '../../components/progress/ProgressUI';
import { metricText, submissionDate } from '../../components/progress/data';
import { periodQuery, reportTrendRows, type ReportPeriod, type ReportsData, type ReportMetrics } from '../../components/reports/data';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const [classId, setClassId] = useState(''), [period, setPeriod] = useState<ReportPeriod>('This month');
  const [metric, setMetric] = useState<keyof ReportMetrics>('comprehension');
  const [picker, setPicker] = useState<'class' | 'period' | null>(null);
  const [response, setResponse] = useState<{ key: string; data: ReportsData } | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const request = JSON.stringify({ classId, period, revision });
  useFocusEffect(useCallback(() => {
    const filter = JSON.parse(request) as { classId: string; period: ReportPeriod };
    let active = true; setLoading(true); setError('');
    authRequest<ReportsData>(`/reports?classId=${encodeURIComponent(filter.classId)}${periodQuery(filter.period)}`)
      .then(data => { if (active) setResponse({ key: request, data }); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load reports.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [request]));
  const data = response?.key === request ? response.data : null;
  const classes = response?.data.availableClasses || [];
  const rows = useMemo(() => data ? reportTrendRows(data) : [], [data]);
  const label = metric === 'speed' ? 'Average reading speed trend' : metric === 'accuracy' ? 'Average word accuracy trend' : 'Average comprehension trend';
  return <Screen back>
    <View style={[s.row, { justifyContent: 'space-between', paddingBottom: 12 }]}><Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>Reports</Text><ProgressAction label="Refresh" onPress={() => setRevision(value => value + 1)} /></View>
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => setRevision(value => value + 1)} />} contentContainerStyle={[s.stack, { paddingBottom: 32 }]}>
      <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Overall learner progress</Text>
      <View style={s.row}><ProgressAction label={`${classId ? classes.find(cls => cls._id === classId)?.title || 'Selected class' : 'All classes'} ▾`} onPress={() => setPicker('class')} /><ProgressAction label={`${period} ▾`} onPress={() => setPicker('period')} /></View>
      {loading && <ActivityIndicator color={colors.primary} />}
      {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>}
      {data && <>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Updated {submissionDate(data.updatedAt)}</Text>
        <View style={s.row}><ProgressBadge>{data.totals.classCount} classes</ProgressBadge><ProgressBadge>{data.totals.totalLearners} learners</ProgressBadge><ProgressBadge>{data.totals.withSubmissions} with submissions</ProgressBadge></View>
        {(['speed', 'accuracy', 'comprehension'] as const).map(key => {
          const value = data.totals.metrics[key], color = key === 'speed' ? colors.accentBlue : key === 'accuracy' ? colors.accentGreen : colors.accentOrange;
          return <ProgressCard key={key}><View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={[typography.display.md, { color: colors.text }]}>{key === 'speed' ? 'Avg reading speed' : key === 'accuracy' ? 'Avg word accuracy' : 'Avg comprehension'}</Text>
            <Text style={[typography.display.lg, { color }]}>{metricText(value, key === 'speed' ? 'WPM' : '%')}</Text>
          </View><Text style={{ color: colors.textMuted }}>{value.learnerCount} {key === 'accuracy' ? 'assessed learners' : key === 'comprehension' ? 'graded learners' : 'learners'}{value.provisionalCount ? ` · ${value.provisionalCount} provisional` : ''}</Text></ProgressCard>;
        })}
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Each average uses one latest available result per learner in this period. Missing results are excluded. Learners in multiple classes are counted once overall.</Text>
        <View style={s.row}>{(['speed', 'accuracy', 'comprehension'] as const).map(key => <ProgressAction key={key} label={key === 'speed' ? 'Speed' : key === 'accuracy' ? 'Accuracy' : 'Comprehension'} selected={metric === key} onPress={() => setMetric(key)} />)}</View>
        <MetricChart key={`${request}:${metric}`} title={label} metric={metric} rows={rows} axisLabel="Submission days" />
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Trend shows the latest available learner averages by submission day within this period.</Text>
        <ProgressCard><Text style={[typography.display.md, { color: colors.text }]}>Passage comprehension levels · {data.totals.metrics.comprehension.learnerCount} graded learners</Text><View style={s.row}>{(['Independent', 'Instructional', 'Frustration'] as const).map(level => <ProgressBadge key={level} tone={level === 'Independent' ? 'green' : 'orange'}>{data.levels[level]} {level}</ProgressBadge>)}</View></ProgressCard>
        <Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>By class</Text>
        {!data.classes.length && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Create a class and add learners to begin tracking reading progress.</Text>}
        {data.classes.map(cls => <ProgressCard key={cls._id}>
          <Text style={[typography.display.md, { color: colors.text }]}>{cls.title}</Text>
          <Text style={{ color: colors.textMuted }}>{cls.learnerCount} learners · {cls.withSubmissions} with submissions</Text>
          <View style={s.row}><ProgressBadge tone="blue">Speed {metricText(cls.metrics.speed, 'WPM')}</ProgressBadge><ProgressBadge tone="green">Accuracy {metricText(cls.metrics.accuracy, '%')}</ProgressBadge><ProgressBadge tone="orange">Comprehension {metricText(cls.metrics.comprehension, '%')}</ProgressBadge></View>
          <ProgressAction label={`View learners in ${cls.title}`} onPress={() => router.push({ pathname: '/teacher/class/[id]', params: { id: cls._id, tab: 'Progress' } })} />
        </ProgressCard>)}
      </>}
    </ScrollView>
    <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
      <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 24 }}><View style={[s.card, { backgroundColor: colors.background, borderColor: colors.border, maxHeight: '80%' }]}>
        <Text style={[typography.display.md, { color: colors.text }]}>{picker === 'class' ? 'Choose class' : 'Choose period'}</Text>
        <ScrollView contentContainerStyle={s.stack}>{picker === 'class' ? [{ _id: '', title: 'All classes' }, ...classes].map(cls => <ProgressAction key={cls._id} label={cls.title} selected={classId === cls._id} onPress={() => { setClassId(cls._id); setPicker(null); }} />) : (['All time', 'This month', 'Last month'] as const).map(value => <ProgressAction key={value} label={value} selected={period === value} onPress={() => { setPeriod(value); setPicker(null); }} />)}</ScrollView>
        <ProgressAction label="Close" onPress={() => setPicker(null)} />
      </View></View>
    </Modal>
  </Screen>;
}
