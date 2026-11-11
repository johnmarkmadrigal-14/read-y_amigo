import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { getFileUrl, getStoredToken, submitActivity } from '../../app/lib/api';
import { FileViewer } from '../../app/components/FileViewer';
import { useTheme } from '../../app/theme/ThemeProvider';
import { typography } from '../../app/theme/tokens';
import { ProgressAction, ProgressBadge, ProgressCard, progressStyles as s } from '../progress/ProgressUI';
import { submissionDate } from '../progress/data';
import { myActivities } from './api';
import type { ActivitySubmission } from './data';

export function ActivityFile({ file }: { file: NonNullable<ActivitySubmission['attachment']> }) {
  const { colors } = useTheme(); const [headers, setHeaders] = useState<Record<string, string> | null>(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getStoredToken().then(token => { if (!active) return; if (!token) setError('Sign in again to open this attachment.'); else setHeaders({ Authorization: `Bearer ${token}` }); }).catch(() => { if (active) setError('Could not authorize the file preview.'); });
    return () => { active = false; };
  }, []);
  // Activity attachments are server-authored, same-origin private files. Never
  // attach the session token to an arbitrary external URL.
  if (!file.url.startsWith('/api/files/')) return <Text style={{ color: colors.retryText }}>This attachment link is unavailable.</Text>;
  if (error) return <Text accessibilityRole="alert" style={{ color: colors.retryText }}>{error}</Text>;
  return headers ? <FileViewer url={getFileUrl(file.url)} name={file.name} mimeType={file.mimeType} headers={headers} /> : <ActivityIndicator color={colors.primary} />;
}
export function LearnerActivity({ classId, classworkId, deadlinePassed }: { classId: string; classworkId: string; deadlinePassed: boolean }) {
  const { colors } = useTheme();
  const [submission, setSubmission] = useState<ActivitySubmission | null>(null), [text, setText] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const request = `${classId}:${classworkId}:${retry}`;
  useFocusEffect(useCallback(() => {
    const [classKey, workKey] = request.split(':'); let active = true; setLoading(true); setError(''); setLoaded(false);
    myActivities(classKey).then(data => { if (active) { setSubmission(data.submissions.find(row => row.classwork === workKey) || null); setLoaded(true); } }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load your submission.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [request]));
  async function pick() {
    try { const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/*'] }); if (!result.canceled) setFile(result.assets[0]); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not select the file.'); }
  }
  async function submit() {
    if (busy || deadlinePassed || (!text.trim() && !file)) return;
    setBusy(true); setError('');
    try { setSubmission(await submitActivity(classworkId, text, file ? { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream', blob: file.file } : undefined)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not submit this activity.'); }
    finally { setBusy(false); }
  }
  return <ProgressCard>
    <Text accessibilityRole="header" style={[typography.display.md, { color: colors.text }]}>Your activity submission</Text>
    {loading && <ActivityIndicator color={colors.primary} />}
    {!!error && <><Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text><ProgressAction label="Refresh activity" onPress={() => setRetry(value => value + 1)} /></>}
    {!loading && submission ? <>
      <ProgressBadge tone={submission.checkedAt ? 'green' : 'orange'}>{submission.checkedAt ? 'Checked' : 'Submitted · Awaiting review'}</ProgressBadge>
      <Text style={{ color: colors.textMuted }}>Submitted {submissionDate(submission.submittedAt)}</Text>
      {!!submission.text && <Text selectable style={[typography.reading.sm, { color: colors.text }]}>{submission.text}</Text>}
      {submission.attachment && <ActivityFile file={submission.attachment} />}
      {!!submission.feedback && <Text style={[typography.reading.sm, { color: colors.text }]}>Teacher feedback: {submission.feedback}</Text>}
    </> : !loading && loaded ? <View style={s.stack}>
      <TextInput accessibilityLabel="Activity answer" value={text} onChangeText={setText} editable={!busy && !deadlinePassed} multiline maxLength={20000} placeholder="Write your answer…" placeholderTextColor={colors.textMuted} style={[s.input, typography.reading.sm, { minHeight: 140, paddingVertical: 12, textAlignVertical: 'top', borderColor: colors.border, color: colors.text }]} />
      {file && <View style={s.stack}><Text style={{ color: colors.text }}>{file.name}</Text><ProgressAction label="Remove attachment" onPress={() => { if (!busy) setFile(null); }} /></View>}
      {!busy && !deadlinePassed && <ProgressAction label="Attach file" onPress={() => { void pick(); }} />}
      {deadlinePassed ? <Text style={{ color: colors.retryText }}>The deadline has passed.</Text> : busy ? <ActivityIndicator color={colors.primary} /> : <ProgressAction label="Submit activity" onPress={() => {
        if (!text.trim() && !file) { setError('Write an answer or attach a file first.'); return; }
        Alert.alert('Submit activity?', 'Your submitted answer will be locked for review.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Submit', onPress: () => { void submit(); } }]);
      }} />}
    </View> : null}
  </ProgressCard>;
}
