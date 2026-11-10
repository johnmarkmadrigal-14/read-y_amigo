import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../app/theme/ThemeProvider';
import { typography } from '../../app/theme/tokens';
import { metricText, type ReadingSummary } from './data';

export function ProgressCard({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[progressStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>;
}
export function ProgressBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'blue' | 'green' | 'orange' | 'neutral' }) {
  const { colors } = useTheme();
  const color = tone === 'blue' ? colors.accentBlue : tone === 'green' ? colors.successText : tone === 'orange' ? colors.retryText : colors.text;
  return <View style={[progressStyles.badge, { borderColor: color, backgroundColor: colors.background }]}><Text style={[typography.display.sm, { color, flexShrink: 1 }]}>{children}</Text></View>;
}
export function ProgressAction({ label, onPress, selected = false }: { label: string; onPress: () => void; selected?: boolean }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={[progressStyles.action, { borderColor: colors.primary, backgroundColor: selected ? colors.primary : colors.background }]}>
    <Text style={[typography.display.sm, { color: selected ? colors.primaryText : colors.primary }]}>{label}</Text>
  </Pressable>;
}
export function MetricsRow({ summary }: { summary?: ReadingSummary }) {
  const { colors } = useTheme();
  return <View style={progressStyles.row}>{([
    ['Speed', summary?.speed, 'WPM', colors.accentBlue],
    ['Accuracy', summary?.accuracy, '%', colors.accentGreen],
    ['Comprehension', summary?.comprehension, '%', colors.accentOrange],
  ] as const).map(([label, metric, unit, color]) => <View key={label} style={progressStyles.metric}>
    <Text style={[typography.display.sm, { color: colors.text }]}>{label}</Text>
    <Text style={[typography.display.md, { color }]}>{metricText(metric, unit)}</Text>
    {metric?.status === 'provisional' && <Text style={{ color: colors.textMuted, fontSize: 12 }}>Provisional</Text>}
    {metric?.status === 'pending-review' && <Text style={{ color: colors.textMuted, fontSize: 12 }}>Pending review</Text>}
  </View>)}</View>;
}
export const progressStyles = StyleSheet.create({
  stack: { gap: 14 }, row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  badge: { borderWidth: 1, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 8, alignSelf: 'flex-start', maxWidth: '100%' },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 14 },
  metric: { flex: 1, minWidth: 80, gap: 2 },
  input: { borderWidth: 1, borderRadius: 14, minHeight: 48, paddingHorizontal: 14 },
});
