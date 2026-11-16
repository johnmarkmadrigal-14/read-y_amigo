import { useState } from 'react';
import { ActivityIndicator, Text, TextInput } from 'react-native';
import { type ApiSubmission, verifyReading } from '../../app/lib/api';
import { useTheme } from '../../app/theme/ThemeProvider';
import { typography } from '../../app/theme/tokens';
import { ProgressAction, ProgressBadge, ProgressCard, progressStyles } from '../progress/ProgressUI';

export function ReadingVerification({ submission, onSaved }: { submission: ApiSubmission; onSaved: (submission: ApiSubmission) => void }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [feedback, setFeedback] = useState(submission.verification?.feedback ?? '');
  const verified = !!submission.verification?.verifiedAt;
  const changed = (submission.verification?.feedback ?? '') !== feedback.trim();

  async function save() {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { submission: updated } = await verifyReading(submission, feedback.trim());
      onSaved(updated);
      setFeedback(updated.verification?.feedback ?? '');
      setNotice(updated.verification?.feedback ? 'Feedback shared with the learner.' : 'Submission verified.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this review.');
    } finally {
      setBusy(false);
    }
  }

  return <ProgressCard>
    <Text accessibilityRole="header" style={[typography.display.md, { color: colors.text }]}>Feedback for learner</Text>
    <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Share what went well and what to practise next. Your feedback is optional.</Text>
    <TextInput
      accessibilityLabel="Feedback for learner"
      value={feedback}
      onChangeText={value => { setFeedback(value); setNotice(''); }}
      editable={!busy}
      multiline
      maxLength={6000}
      placeholder="Write a brief note to the learner."
      placeholderTextColor={colors.textMuted}
      style={[progressStyles.input, typography.reading.sm, { minHeight: 112, paddingVertical: 10, textAlignVertical: 'top', color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
    />
    {verified ? <ProgressBadge tone="green">Verified</ProgressBadge> : <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
      The learner can see your feedback after you verify the submission.
    </Text>}
    {busy ? <ActivityIndicator accessibilityLabel="Saving review" color={colors.primary} /> : (!verified || changed) &&
      <ProgressAction label={verified ? 'Save feedback' : 'Mark as verified'} onPress={() => { void save(); }} />}
    {!!notice && <Text accessibilityLiveRegion="polite" style={[typography.reading.sm, { color: colors.successText }]}>{notice}</Text>}
    {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>}
  </ProgressCard>;
}
