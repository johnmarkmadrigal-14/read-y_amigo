import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../app/theme/ThemeProvider';
import { typography } from '../../app/theme/tokens';
import { metricNumber, metricText, submissionDate, type ReadingHistoryEntry, type ReadingSummary } from './data';
import { ProgressCard } from './ProgressUI';

type Metric = keyof ReadingSummary;
export function MetricChart({ title, metric, rows }: { title: string; metric: Metric; rows: ReadingHistoryEntry[] }) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [viewport, setViewport] = useState(260);
  const chronological = rows.slice().reverse();
  const percentage = metric !== 'speed';
  const color = metric === 'speed' ? colors.accentBlue : metric === 'accuracy' ? colors.accentGreen : colors.accentOrange;
  const values = chronological.map(row => metricNumber(row[metric], percentage));
  const validValues = values.filter((value): value is number => value !== null);
  const maximum = percentage ? 100 : Math.max(20, Math.ceil(Math.max(0, ...validValues) / 20) * 20);
  const width = Math.max(viewport, chronological.length * 66);
  const height = 122, top = 16, left = 25, right = 25;
  const x = (index: number) => chronological.length === 1 ? width / 2 : left + index * (width - left - right) / Math.max(1, chronological.length - 1);
  const y = (value: number) => top + height * (1 - value / maximum);
  const chosen = chronological.find(row => row.id === selected);
  const latest = rows.find(row => metricNumber(row[metric], percentage) !== null);
  return <ProgressCard>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
      <Text accessibilityRole="header" style={[typography.display.md, { color: colors.text }]}>{title}</Text>
      <Text style={[typography.display.md, { color }]}>{metricText(latest?.[metric], percentage ? '%' : 'WPM')}</Text>
    </View>
    {latest && <Text style={{ color: colors.textMuted, fontSize: 12 }}>Latest available · {submissionDate(latest.submittedAt)}{latest[metric].status === 'provisional' ? ' · Provisional' : ''}</Text>}
    {!validValues.length ? <Text style={[typography.reading.sm, { color: colors.textMuted }]}>No {title.toLowerCase()} results in this period.</Text> : <>
      <View onLayout={event => setViewport(Math.max(120, event.nativeEvent.layout.width - 42))} style={{ flexDirection: 'row' }}>
        <View style={{ width: 42, height: height + top + 36, justifyContent: 'space-between', paddingTop: top - 7, paddingBottom: 29 }}>
          {[maximum, maximum / 2, 0].map(value => <Text key={value} style={{ color: colors.textMuted, fontSize: 11 }}>{value}{percentage ? '%' : ''}</Text>)}
        </View>
        <ScrollView horizontal style={{ flex: 1 }} showsHorizontalScrollIndicator>
          <View style={{ width, height: height + top + 36 }}>
            {[0, maximum / 2, maximum].map(value => <View key={value} style={{ position: 'absolute', left: 0, right: 0, top: y(value), height: 1, backgroundColor: colors.border }} />)}
            {chronological.map((row, index) => {
              const value = values[index];
              const previous = index > 0 ? values[index - 1] : null;
              const dx = index > 0 ? x(index) - x(index - 1) : 0;
              const dy = value !== null && previous !== null ? y(value) - y(previous) : 0;
              return <View key={row.id} style={{ position: 'absolute', left: 0, top: 0 }}>
                {value !== null && previous !== null && index > 0 && <View pointerEvents="none" style={{ position: 'absolute', left: (x(index) + x(index - 1)) / 2 - Math.hypot(dx, dy) / 2, top: (y(value) + y(previous)) / 2 - 1.5, width: Math.hypot(dx, dy), height: 3, backgroundColor: color, transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }] }} />}
                {value !== null && <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}, ${submissionDate(row.submittedAt)}, ${metricText(row[metric], percentage ? '%' : 'WPM')}${row[metric].status === 'provisional' ? ', provisional' : ''}`} accessibilityState={{ selected: selected === row.id }} onPress={() => setSelected(row.id)}
                  style={{ position: 'absolute', left: x(index) - 22, top: y(value) - 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: selected === row.id ? 14 : 10, height: selected === row.id ? 14 : 10, borderRadius: 8, backgroundColor: colors.background, borderWidth: 3, borderColor: color }} />
                </Pressable>}
                <Text style={{ position: 'absolute', left: x(index) - 30, top: top + height + 8, width: 60, textAlign: 'center', color: colors.textMuted, fontSize: 10 }}>{new Date(row.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
              </View>;
            })}
          </View>
        </ScrollView>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>Submissions in order · Tap a point for details{chronological.length > 4 ? ' · Swipe to see more' : ''}</Text>
      {chosen && <Text style={[typography.reading.sm, { color }]}>{chosen.title} · {submissionDate(chosen.submittedAt)} · {metricText(chosen[metric], percentage ? '%' : 'WPM')}{chosen[metric].status === 'provisional' ? ' · Provisional' : ''}</Text>}
    </>}
  </ProgressCard>;
}
