import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button } from '../app/components/Button';
import { useTheme } from '../app/theme/ThemeProvider';
import { calculateReadingRate, validateReadingMeasurement, type ReadingMeasurement as Measurement, type ReadingPassage } from './readingRate';

export type ReadingMeasurementProps = {
  passage: ReadingPassage;
  durationMs: number;
  interrupted: boolean;
  value?: Measurement;
  onChange: (measurement: Measurement | undefined) => void;
  disabled?: boolean;
};

/** Mount with a take key so choices and uncommitted input never carry to another take. */
export function ReadingMeasurement({ passage, durationMs, interrupted, value, onChange, disabled }: ReadingMeasurementProps) {
  const { colors } = useTheme();
  const [completed, setCompleted] = useState<boolean | null>(value?.completed ?? null);
  const [words, setWords] = useState(value && !value.completed ? String(value.wordsRead) : '');
  const [start, setStart] = useState(value ? String(value.startMs / 1000) : '0');
  const [end, setEnd] = useState(value && value.endMs !== durationMs ? String(value.endMs / 1000) : '');
  const number = (text: string) => text.trim() === '' ? NaN : Number(text);
  function measurement(done = completed, wordText = words, from = start, to = end): Measurement | undefined {
    return done === null ? undefined : { completed: done, wordsRead: done ? passage.wordCount : number(wordText),
      startMs: Math.round(number(from) * 1000), endMs: to.trim() ? Math.round(number(to) * 1000) : durationMs, interrupted };
  }
  // Re-emit the full interval when saved-media metadata arrives asynchronously.
  useEffect(() => {
    onChange(completed === null ? undefined : {
      completed, wordsRead: completed ? passage.wordCount : (words.trim() ? Number(words) : NaN),
      startMs: start.trim() ? Math.round(Number(start) * 1000) : NaN,
      endMs: end.trim() ? Math.round(Number(end) * 1000) : durationMs, interrupted,
    });
  }, [completed, words, start, end, durationMs, interrupted, passage.wordCount, onChange]);
  const current = measurement();
  const rate = current ? calculateReadingRate(passage, current, durationMs) : null;
  const message = interrupted ? 'Recording was interrupted. Read again continuously for a speed preview. You can still submit this recording.'
    : durationMs <= 0 ? 'Verifying saved audio… If verification fails, you can still submit without WPM.'
    : current ? validateReadingMeasurement(passage, current, durationMs) : 'Did you finish the whole passage?';
  const field = (label: string, value: string, update: (text: string) => void, placeholder?: string) => <View style={{ gap: 4 }}>
    <Text style={{ color: colors.text }}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={update} placeholder={placeholder}
      placeholderTextColor={colors.textMuted} editable={!disabled} keyboardType="decimal-pad"
      style={{ color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 44 }} />
  </View>;
  return <View style={{ gap: 10, paddingVertical: 12 }}>
    <Text style={{ color: colors.text, fontWeight: '700' }}>Reading speed preview</Text>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Button label={completed === true ? '✓ Complete passage' : 'Complete passage'} variant="secondary" disabled={disabled}
        onPress={() => { setCompleted(true); }} />
      <Button label={completed === false ? '✓ Part of passage' : 'Part of passage'} variant="secondary" disabled={disabled}
        onPress={() => { setCompleted(false); }} />
    </View>
    {completed === false && field('Passage words read', words, text => { setWords(text); })}
    {completed !== null && <>
      <Text style={{ color: colors.textMuted }}>Optional: trim only silence before and after reading. Keep every hesitation during reading.</Text>
      {field('Reading start (seconds)', start, text => { setStart(text); })}
      {field('Reading end (seconds)', end, text => { setEnd(text); }, durationMs > 0 ? String(durationMs / 1000) : 'Full saved audio')}
    </>}
    <Text accessibilityLiveRegion="polite" style={{ color: colors.text }}>
      {rate ? `${rate.wpm.toFixed(1)} WPM · ${rate.wordsRead} words / ${rate.readingSeconds.toFixed(2)} seconds · Provisional` : `WPM unavailable. ${message || ''}`}
    </Text>
    {rate && <Text style={{ color: colors.textMuted }}>Your teacher will review this preview.</Text>}
  </View>;
}
