import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../app/theme/ThemeProvider';
import { radius, typography } from '../../app/theme/tokens';

export function QuizAction({ label, onPress, disabled = false, primary = false, selected = false, compact = false }: {
  label: string; onPress: () => void; disabled?: boolean; primary?: boolean; selected?: boolean; compact?: boolean;
}) {
  const { colors } = useTheme();
  const filled = primary || selected;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
    accessibilityState={{ disabled, selected }} aria-disabled={disabled} aria-pressed={selected} onPress={onPress}
    style={[ui.action, compact && ui.compact, { borderColor: colors.primary, backgroundColor: filled ? colors.primary : colors.background, opacity: disabled ? 0.45 : 1 }]}>
    <Text style={[typography.reading.sm, { color: filled ? colors.primaryText : colors.primary, textAlign: 'center', flexShrink: 1 }]}>{label}</Text>
  </Pressable>;
}
export function QuizDisclosure({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return <View style={[ui.disclosure, { borderColor: colors.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} aria-expanded={open}
      onPress={() => setOpen(value => !value)} style={[ui.disclosureHeader, { backgroundColor: colors.surface }]}>
      <Text style={[typography.reading.sm, ui.flex, { color: colors.text }]}>{title}</Text>
      <Text style={{ color: colors.primary }}>{open ? '⌃' : '⌄'}</Text>
    </Pressable>
    {open && <View style={ui.disclosureBody}>{children}</View>}
  </View>;
}
export const ui = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 }, flex: { flex: 1, minWidth: 0 }, stack: { gap: 16 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 12 },
  titleCard: { borderRadius: radius.sm, padding: 14, gap: 4 },
  action: { minHeight: 48, borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' },
  compact: { borderWidth: 0, paddingHorizontal: 4 },
  input: { borderWidth: 1, borderRadius: radius.sm, minHeight: 48, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12 },
  footer: { borderTopWidth: 1, paddingTop: 12, paddingBottom: 8, gap: 8 },
  scroll: { gap: 16, paddingBottom: 24 },
  tabs: { flexDirection: 'row', gap: 4, borderWidth: 1, padding: 4, borderRadius: radius.sm },
  tab: { flex: 1, minWidth: 0, minHeight: 48, borderRadius: radius.sm, padding: 8, justifyContent: 'center', alignItems: 'center' },
  disclosure: { borderWidth: 1, borderRadius: radius.sm, overflow: 'hidden' },
  disclosureHeader: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  disclosureBody: { padding: 12, gap: 8 },
});
