import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MetricChart } from '../../../components/progress/MetricChart';
import { ProgressAction, ProgressCard } from '../../../components/progress/ProgressUI';
import { myReadingProgress, type MyReadingProgress } from '../../../components/progress/api';
import { metricNumber, metricText, type ReadingHistoryEntry } from '../../../components/progress/data';
import { HeadingLabel } from '../../components/InterfaceChrome';
import { Screen } from '../../components/Screen';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, typography } from '../../theme/tokens';

const shortDate = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function AccuracyCard({ row }: { row: ReadingHistoryEntry | null }) {
  const { colors } = useTheme();
  const value = metricNumber(row?.accuracy, true);
  return <ProgressCard>
    <View style={styles.accuracyRow}>
      <View style={styles.detail}>
        <Text accessibilityRole="header" style={[typography.display.md, { color: colors.text }]}>Word accuracy</Text>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
          {row && value !== null ? `Latest reviewed reading · ${shortDate(row.submittedAt)}` : 'No reviewed word accuracy yet.'}
        </Text>
      </View>
      {value !== null && <View style={[styles.ring, { backgroundColor: colors.border }]} accessible accessibilityLabel={`Word accuracy ${metricText(row?.accuracy, '%')}`}>
        {[0, 1].map(half => {
          const degrees = Math.min(180, Math.max(0, value * 3.6 - half * 180));
          return <View key={half} style={[styles.ringHalf, { left: half === 0 ? 42 : 0 }]}>
            <View style={[styles.ringFace, { left: half === 0 ? -42 : 0, transform: [{ rotate: `${degrees + half * 180}deg` }] }]}>
              <View style={[styles.ringFill, { backgroundColor: colors.accentGreen }]} />
            </View>
          </View>;
        })}
        <View style={[styles.ringCenter, { backgroundColor: colors.surface }]}>
          <Text style={[typography.display.md, { color: colors.text }]}>{metricText(row?.accuracy, '%')}</Text>
        </View>
      </View>}
    </View>
  </ProgressCard>;
}

function ComprehensionCard({ rows }: { rows: ReadingHistoryEntry[] }) {
  const { colors } = useTheme();
  return <ProgressCard>
    <Text accessibilityRole="header" style={[typography.display.md, { color: colors.text }]}>Comprehension</Text>
    <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
      {rows.length ? 'Last 10 graded reading quizzes' : 'No graded reading quizzes yet.'}
    </Text>
    {rows.slice().reverse().map(row => {
      const value = metricNumber(row.comprehension, true);
      if (value === null) return null;
      const score = metricText(row.comprehension, '%');
      return <View key={row.id} style={styles.barGroup} accessible accessibilityLabel={`${row.title}, ${shortDate(row.submittedAt)}, ${score}`}>
        <View style={styles.barLabel}>
          <Text style={[typography.reading.sm, styles.detail, { color: colors.text }]}>{row.title}</Text>
          <Text style={[typography.display.md, { color: colors.text }]}>{score}</Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View style={[styles.track, { width: `${value}%`, backgroundColor: colors.accentOrange }]} />
        </View>
        <Text style={[typography.display.sm, { color: colors.textMuted }]}>{shortDate(row.submittedAt)}</Text>
      </View>;
    })}
  </ProgressCard>;
}

export default function LearnerProgressScreen() {
  const { colors } = useTheme();
  const [data, setData] = useState<MyReadingProgress | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    void myReadingProgress().then(result => {
      if (active) { setData(result); setError(''); }
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : 'Could not load your reading progress.');
    });
    return () => { active = false; };
  }, [retry]));

  return <Screen scroll>
    <View style={styles.stack}>
      <HeadingLabel icon="stats-chart-outline" style={[typography.display.lg, { color: colors.text }]}>My reading progress</HeadingLabel>
      {!!error && <ProgressCard>
        <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>
        <ProgressAction label="Try again" onPress={() => { setError(''); setRetry(value => value + 1); }} />
      </ProgressCard>}
      {data ? <>
        <MetricChart title="Reading speed" metric="speed" rows={data.speed} axisLabel="Last 10 readings with a speed result" />
        <AccuracyCard row={data.accuracy} />
        <ComprehensionCard rows={data.comprehension} />
      </> : !error && <ActivityIndicator accessibilityLabel="Loading your reading progress" color={colors.primary} />}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  accuracyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detail: { flex: 1 },
  ring: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ringHalf: { width: 42, height: 84, position: 'absolute', top: 0, overflow: 'hidden' },
  ringFace: { width: 84, height: 84, position: 'absolute' },
  ringFill: { width: 42, height: 84, borderTopLeftRadius: 42, borderBottomLeftRadius: 42 },
  ringCenter: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  barGroup: { gap: 4 },
  barLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  track: { height: 8, borderRadius: 4 },
});
