import { useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { type ApiSubmission, verifyReading } from '../../app/lib/api';
import { useTheme } from '../../app/theme/ThemeProvider';
import { typography } from '../../app/theme/tokens';
import { ProgressAction, ProgressBadge, ProgressCard } from '../progress/ProgressUI';
import { readingReviewed } from './data';
export function ReadingVerification({ submission, onSaved }: { submission: ApiSubmission; onSaved: (submission: ApiSubmission) => void }) {
  const { colors } = useTheme(); const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function save() {
    if (busy) return; setBusy(true); setError('');
    try { onSaved((await verifyReading(submission)).submission); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not verify this submission.'); }
    finally { setBusy(false); }
  }
  return <ProgressCard><Text style={[typography.display.md, { color: colors.text }]}>Submission verification</Text>
    {readingReviewed(submission) ? <ProgressBadge tone="green">Reviewed</ProgressBadge> : <><Text style={[typography.reading.sm, { color: colors.textMuted }]}>When you have finished reviewing this recording, mark it as verified to clear it from To-check. Save metric reviews separately.</Text>{busy ? <ActivityIndicator color={colors.primary} /> : <ProgressAction label="Mark as verified" onPress={() => { void save(); }} />}</>}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.retryText }}>{error}</Text>}
  </ProgressCard>;
}
