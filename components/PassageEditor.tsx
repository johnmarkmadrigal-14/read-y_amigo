import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useTheme } from '../app/theme/ThemeProvider';
import { spacing, typography } from '../app/theme/tokens';
import { countPassageWords, ReadingPassage } from './readingRate';
import { DocumentExtractor } from './documentExtraction/DocumentExtractor';
import { DocumentSource } from './documentExtraction/source';

type Props = {
  initialText: string;
  source?: DocumentSource;
  value: ReadingPassage | null;
  onChange: (passage: ReadingPassage) => void;
};
export function PassageEditor({ initialText, source, value, onChange }: Props) {
  const { colors } = useTheme();
  const [text, setText] = useState(initialText);
  const [manual, setManual] = useState(false);
  const [override, setOverride] = useState('');
  const [status, setStatus] = useState(source ? 'Extracting text on this device… You can also paste the passage below.' : '');
  const [extracting, setExtracting] = useState(!!source);
  const edited = useRef(false);
  const automaticCount = countPassageWords(text);
  const count = manual ? Number(override) : automaticCount;
  const valid = !!text.trim() && text.length <= 100000 && automaticCount > 0 && automaticCount <= 100000 && Number.isSafeInteger(count) && count > 0 && count <= 100000 && (!manual || /^\d+$/.test(override));
  const update = (nextText: string, nextManual = manual, nextOverride = override, confirmed = false) => {
    onChange({ text: nextText, wordCount: nextManual ? Number(nextOverride) : countPassageWords(nextText),
      countMethod: nextManual ? 'manual' : 'automatic', confirmed, tokenizerVersion: 'v1' });
  };
  return <View style={{ gap: spacing.sm, marginVertical: spacing.md }}>
    <Text style={[typography.reading.md, { color: colors.text, fontWeight: '700' }]}>Review passage and word count</Text>
    <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Keep only the words learners will read aloud. Remove headings, instructions, page numbers, and comprehension questions before confirming.</Text>
    {!!status && <Text accessibilityLiveRegion="polite" style={[typography.reading.sm, { color: colors.textMuted }]}>{status}</Text>}
    {source && extracting && <DocumentExtractor source={source} onText={result => {
      setExtracting(false);
      if (edited.current) return;
      if (result.length > 100000 || countPassageWords(result) > 100000) {
        setStatus('This document exceeds the 100,000-character or 100,000-word limit. Paste a shorter passage below, then review and confirm it.');
        return;
      }
      setText(result); update(result);
      setStatus(result.trim() ? 'Text extracted. Review and edit it before confirming.'
        : 'No selectable text was found. This may be a scanned PDF. Paste or type the passage below; OCR is not required.');
    }} onError={message => { setExtracting(false); setStatus(message); }} />}
    <TextInput accessibilityLabel="Canonical reading passage" multiline textAlignVertical="top" maxLength={100000}
      value={text} placeholder="Type or paste only the passage learners will read…" placeholderTextColor={colors.textMuted}
      onChangeText={next => {
        edited.current = true; setExtracting(false); setStatus(''); setText(next); update(next);
      }} style={[styles.input, typography.reading.md, { minHeight: 180, color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]} />
    <Text accessibilityLiveRegion="polite" style={[typography.reading.md, { color: colors.text }]}>{automaticCount} words (automatic preview)</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={[typography.reading.sm, { color: colors.text }]}>Override word count manually</Text>
      <Switch accessibilityLabel="Override word count manually" value={manual} onValueChange={next => {
        edited.current = true; setExtracting(false); setStatus(''); setManual(next);
        const nextOverride = override || String(automaticCount);
        setOverride(nextOverride); update(text, next, nextOverride);
      }} trackColor={{ true: colors.primary }} />
    </View>
    {manual && <TextInput accessibilityLabel="Manual passage word count" value={override} keyboardType="number-pad"
      placeholder="Positive whole number" placeholderTextColor={colors.textMuted}
      onChangeText={next => { setOverride(next); update(text, true, next); }}
      style={[styles.input, typography.reading.sm, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />}
    {manual && !valid && <Text style={[typography.reading.sm, { color: colors.retry }]}>Enter passage text and a whole-number count from 1 to 100,000.</Text>}
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!value?.confirmed, disabled: !valid }}
      disabled={!valid} onPress={() => update(text, manual, override, !value?.confirmed)}
      style={{ padding: spacing.md, borderRadius: 12, borderWidth: 2, borderColor: colors.primary, opacity: valid ? 1 : 0.5,
        backgroundColor: value?.confirmed ? colors.primary : colors.background }}>
      <Text style={[typography.reading.sm, { color: value?.confirmed ? colors.primaryText : colors.text }]}>
        {value?.confirmed ? `Confirmed: ${count} words` : `Confirm passage and ${valid ? count : 'word'} count`}
      </Text>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({ input: { borderWidth: 1, borderRadius: 12, padding: spacing.md } });
