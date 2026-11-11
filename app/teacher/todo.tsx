import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../components/Screen';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/tokens';
import { ProgressAction, ProgressBadge, ProgressCard, progressStyles as s } from '../../components/progress/ProgressUI';
import { submissionDate } from '../../components/progress/data';
import { getToCheck } from '../../components/workflow/api';
import { workDestination, workLabel, type ToCheckItem } from '../../components/workflow/data';
export default function ToCheckScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<ToCheckItem[]>([]), [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const request = String(revision);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setError('');
    getToCheck().then(data => { if (active) setItems(data.items); }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load To-check.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // The revision intentionally reloads the same endpoint on manual refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]));
  const visible = items.filter(item => filter === 'All' || (filter === 'Reading' ? item.kind === 'reading' || item.kind === 'comprehension' : filter === 'Activities' ? item.kind === 'activity' : item.kind === 'quiz'));
  return <Screen>
    <View style={[s.row, { justifyContent: 'space-between', paddingBottom: 12 }]}><Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>To-check</Text><ProgressAction label="Refresh" onPress={() => setRevision(v => v + 1)} /></View>
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => setRevision(v => v + 1)} />} contentContainerStyle={[s.stack, { paddingBottom: 28 }]}>
      <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Submitted work waiting for your review.</Text>
      <ProgressBadge>{items.length} pending</ProgressBadge>
      <View style={s.row}>{['All', 'Reading', 'Activities', 'Quizzes'].map(value => <ProgressAction key={value} label={value} selected={filter === value} onPress={() => setFilter(value)} />)}</View>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>Oldest pending first</Text>
      {loading && <ActivityIndicator color={colors.primary} />}
      {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>}
      {!loading && !error && !visible.length && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{items.length ? 'No pending submissions in this category.' : 'All caught up. No submitted work is waiting for review.'}</Text>}
      {!error && visible.map(item => <ProgressCard key={item._id}>
        <Text style={[typography.display.md, { color: colors.text }]}>{item.learnerName}</Text>
        <Text style={[typography.display.md, { color: colors.text }]}>{item.title}</Text>
        <View style={s.row}><ProgressBadge tone={item.kind === 'activity' ? 'green' : 'blue'}>{workLabel(item.kind)}</ProgressBadge><ProgressBadge tone="orange">{item.status}</ProgressBadge></View>
        <Text style={{ color: colors.textMuted }}>{item.classTitle}</Text>
        <Text style={{ color: colors.textMuted }}>Submitted {submissionDate(item.submittedAt)}</Text>
        <ProgressAction label="Open submission" onPress={() => router.push(workDestination(item))} />
      </ProgressCard>)}
      <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Reviewed work leaves this list.</Text>
    </ScrollView>
  </Screen>;
}
