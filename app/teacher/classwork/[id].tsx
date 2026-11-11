import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { learnerInitials, matchesLearnerSearch, submissionDate, submissionLearnerName } from '../../../components/submissionPresentation';
import { formatTime } from '../../components/AudioPlayerBar';
import { HeadingLabel, TextAction } from '../../components/InterfaceChrome';
import { Screen } from '../../components/Screen';
import { type ApiClassworkSubmissions, type ApiSubmission, getClassworkSubmissions } from '../../lib/api';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, typography } from '../../theme/tokens';

type LearnerRow = { key: string; name: string; submission?: ApiSubmission };

export default function TeacherClassworkSubmissions() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ApiClassworkSubmissions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const focused = useIsFocused();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'submitted' | 'pending'>('submitted');

  useEffect(() => {
    if (!focused || !id) return;
    let active = true;
    getClassworkSubmissions(id).then(result => {
      if (active) { setData(result); setError(null); }
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : "Couldn't load submissions.");
    });
    return () => { active = false; };
  }, [id, retry, focused]);

  const rows = useMemo<LearnerRow[]>(() => {
    if (!data) return [];
    const source = filter === 'submitted'
      ? data.submissions.map(submission => ({ key: submission._id, name: submissionLearnerName(submission), submission }))
      : data.notSubmitted.map(learner => ({ key: learner._id, name: learner.displayName || 'Learner' }));
    return source.filter(row => matchesLearnerSearch(row.name, query));
  }, [data, filter, query]);

  const loadError = !id ? 'This classwork could not be found.' : error;
  if (!data || loadError) return <Screen back>
    <View style={styles.centered}>
      {loadError ? <>
        <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.textMuted, textAlign: 'center' }]}>{loadError}</Text>
        <TextAction icon="refresh" onPress={() => { setError(null); setRetry(value => value + 1); }}>
          <Text style={[typography.reading.sm, { color: colors.primary }]}>Try again</Text>
        </TextAction>
      </> : <ActivityIndicator accessibilityLabel="Loading submissions" color={colors.primary} />}
    </View>
  </Screen>;

  const header = <View style={styles.header}>
    <HeadingLabel icon="bookmark-outline" style={[typography.display.lg, { color: colors.text }]}>Submissions</HeadingLabel>
    <Text style={[typography.display.md, { color: colors.text }]}>{data.classwork.title}</Text>
    <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Reading assignment</Text>
    <View style={styles.row}>
      {[{ title: 'Submitted', count: data.submissions.length }, { title: 'Not yet', count: data.notSubmitted.length }].map(item => (
        <View key={item.title} style={[styles.summaryTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.display.lg, { color: colors.primary }]}>{item.count}</Text>
          <Text style={[typography.reading.sm, { color: colors.text }]}>{item.title}</Text>
        </View>
      ))}
    </View>
    <View style={[styles.search, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Ionicons name="search-outline" size={20} color={colors.textMuted} accessible={false} />
      <TextInput accessibilityLabel="Search learner" placeholder="Search learner…" placeholderTextColor={colors.textMuted}
        value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search"
        style={[typography.reading.sm, styles.flex, { color: colors.text, minHeight: 44 }]} />
      {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear learner search" onPress={() => setQuery('')} style={styles.clear}>
        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
      </Pressable>}
    </View>
    <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {([{ key: 'submitted', title: 'Submitted' }, { key: 'pending', title: 'Not yet' }] as const).map(item => (
        <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: filter === item.key }} aria-selected={filter === item.key}
          onPress={() => setFilter(item.key)} style={[styles.tab, { backgroundColor: filter === item.key ? colors.primary : 'transparent' }]}>
          <Text style={[typography.reading.sm, { color: filter === item.key ? colors.primaryText : colors.text, textAlign: 'center' }]}>{item.title}</Text>
        </Pressable>
      ))}
    </View>
    <Text accessibilityRole="header" style={[typography.display.md, { color: colors.text }]}>{filter === 'submitted' ? 'Learner recordings' : 'Not submitted yet'}</Text>
    {!!query.trim() && <Text accessibilityLiveRegion="polite" style={[typography.reading.sm, { color: colors.textMuted }]}>{rows.length} {rows.length === 1 ? 'learner' : 'learners'} found</Text>}
  </View>;

  return <Screen back>
    <FlatList<LearnerRow>
      data={rows} keyExtractor={item => item.key} ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled" contentContainerStyle={styles.listContent}
      ListEmptyComponent={<Text style={[typography.reading.sm, styles.empty, { color: colors.textMuted }]}>
        {query.trim() ? 'No learners match your search.' : filter === 'submitted' ? 'No recordings have been submitted yet.' : 'Everyone has submitted their recording.'}
      </Text>}
      renderItem={({ item }) => <View style={[styles.learnerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
            <Text style={[typography.display.md, { color: colors.secondaryText }]}>{learnerInitials(item.name)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[typography.display.md, { color: colors.text }]}>{item.name}</Text>
            <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
              {item.submission ? `Submitted ${submissionDate(item.submission.submittedAt)}` : 'No recording submitted'}
            </Text>
          </View>
        </View>
        {item.submission && <>
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            <Ionicons name="headset-outline" size={18} color={colors.textMuted} accessible={false} />
            <Text style={[typography.reading.sm, styles.flex, { color: colors.textMuted }]}>Recording available</Text>
            {!!item.submission.audio.durationMs && <Text style={[typography.reading.sm, styles.duration, { color: colors.secondaryText, backgroundColor: colors.secondary }]}>
              {formatTime(item.submission.audio.durationMs)}
            </Text>}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open submission for ${item.name}`}
            onPress={() => router.push({ pathname: '/teacher/classwork/submission/[id]', params: { id: item.submission!._id, classworkId: id } })}
            style={[styles.openButton, { borderColor: colors.primary, backgroundColor: colors.background }]}>
            <Text style={[typography.reading.sm, styles.flex, { color: colors.primary, textAlign: 'center' }]}>Open submission</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.primary} accessible={false} />
          </Pressable>
        </>}
      </View>}
    />
  </Screen>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  flex: { flex: 1, minWidth: 0 },
  header: { gap: 12, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryTile: { flex: 1, minWidth: 0, borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: 12 },
  clear: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', padding: 4, gap: 4, borderWidth: 1, borderRadius: radius.md },
  tab: { flex: 1, minHeight: 48, padding: 10, borderRadius: radius.sm, justifyContent: 'center' },
  listContent: { paddingBottom: spacing.xl },
  learnerCard: { padding: 16, gap: 12, borderWidth: 1.5, borderRadius: radius.md, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  duration: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: radius.sm, overflow: 'hidden' },
  openButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.sm, padding: 10, minHeight: 48 },
  empty: { paddingVertical: 24, textAlign: 'center' },
});
