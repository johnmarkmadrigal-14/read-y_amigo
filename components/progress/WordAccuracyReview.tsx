import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { type ApiSubmission, reviewWordAccuracy } from '../../app/lib/api';
import { useTheme } from '../../app/theme/ThemeProvider';
import { typography } from '../../app/theme/tokens';
import { ProgressBadge, progressStyles as s } from './ProgressUI';

export function WordAccuracyReview({ submission, onSaved }: { submission: ApiSubmission; onSaved: (submission: ApiSubmission) => void }) {
  const { colors } = useTheme();
  const saved = submission.wordAccuracy;
  const [words, setWords] = useState(String(saved?.wordsAssessed ?? submission.readingMeasurement?.wordsRead ?? submission.readingPassage?.wordCount ?? ''));
  const [errors, setErrors] = useState(saved ? String(saved.errorCount) : '');
  const [listened, setListened] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const wordCount = /^\d+$/.test(words) ? Number(words) : NaN;
  const errorCount = /^\d+$/.test(errors) ? Number(errors) : NaN;
  const valid = Number.isSafeInteger(wordCount) && wordCount > 0 && wordCount <= (submission.readingPassage?.wordCount ?? 0) && Number.isSafeInteger(errorCount) && errorCount >= 0 && errorCount <= wordCount;
  const canSave = valid && listened && !busy;
  async function save() {
    if (!canSave) return;
    setBusy(true); setError('');
    try { onSaved(await reviewWordAccuracy(submission._id, { wordsAssessed: wordCount, errorCount, listened, previousReviewedAt: saved?.reviewedAt ?? null })); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save accuracy review.'); }
    finally { setBusy(false); }
  }
  if (!submission.readingPassage?.confirmed) return <Text style={[typography.reading.sm, { color: colors.textMuted }]}>A confirmed passage snapshot is needed to review word accuracy.</Text>;
  return <View style={s.stack}>
    {saved && <ProgressBadge tone="green">Saved accuracy: {Number(saved.percentage.toFixed(1))}%</ProgressBadge>}
    <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Listen and confirm the assessed words and scored errors using your assessment rules. Transcript suggestions and observation counts are not automatically scored.</Text>
    <Text style={[typography.reading.sm, { color: colors.text }]}>Words assessed (up to {submission.readingPassage.wordCount})</Text>
    <TextInput accessibilityLabel="Words assessed" editable={!busy} value={words} onChangeText={setWords} keyboardType="number-pad" maxLength={6} style={[s.input, typography.reading.sm, { color: colors.text, borderColor: colors.border }]} />
    <Text style={[typography.reading.sm, { color: colors.text }]}>Confirmed scored errors</Text>
    <TextInput accessibilityLabel="Confirmed scored errors" editable={!busy} value={errors} onChangeText={setErrors} keyboardType="number-pad" maxLength={6} style={[s.input, typography.reading.sm, { color: colors.text, borderColor: colors.border }]} />
    {valid && <Text style={[typography.display.md, { color: colors.accentGreen }]}>Preview: {Number(((wordCount - errorCount) / wordCount * 100).toFixed(1))}%</Text>}
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: listened, disabled: busy }} disabled={busy} onPress={() => setListened(value => !value)} style={[s.action, { borderColor: listened ? colors.accentGreen : colors.border }]}><Text style={[typography.reading.sm, { color: colors.text }]}>{listened ? '☑' : '☐'} I listened and confirmed these counts.</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSave }} disabled={!canSave} onPress={() => { void save(); }} style={[s.action, { backgroundColor: colors.primary, borderColor: colors.primary, opacity: canSave ? 1 : 0.45 }]}><Text style={[typography.display.md, { color: colors.primaryText }]}>{busy ? 'Saving…' : 'Save word accuracy'}</Text></Pressable>
    {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>}
  </View>;
}
