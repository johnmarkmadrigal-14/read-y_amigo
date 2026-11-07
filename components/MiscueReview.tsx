import { useState } from 'react';
import { Alert, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '../app/components/Button';
import { HeadingLabel } from '../app/components/InterfaceChrome';
import { ApiSubmission, saveMiscueReview } from '../app/lib/api';
import { useTheme } from '../app/theme/ThemeProvider';
import { radius, spacing, typography } from '../app/theme/tokens';
import { compareTranscript, comparisonWords, miscueKinds, type MiscueEvent } from './miscueComparison';

export function MiscueReview({ submission, onSaved }: { submission: ApiSubmission; onSaved: (s: ApiSubmission) => void }) {
  const { colors } = useTheme();
  const [events, setEvents] = useState<MiscueEvent[]>(submission.miscueReview?.events ?? []);
  const [generated, setGenerated] = useState(!!submission.miscueReview);
  const [listened, setListened] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [coverage, setCoverage] = useState('');
  const [comparedThrough, setComparedThrough] = useState<number | undefined>(submission.miscueReview?.comparedThrough);
  const [manualStart, setManualStart] = useState('1');
  const [manualEnd, setManualEnd] = useState('1');
  const p = comparisonWords(submission.readingPassage?.text ?? '');
  const t = comparisonWords(submission.transcript ?? '');
  const textStyle = [typography.reading.sm, { color: colors.text }];
  const card = { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm };
  const inputStyle = { borderWidth: 1, borderColor: colors.border, color: colors.text, borderRadius: radius.md, padding: spacing.sm, minHeight: 44 };
  const update = (id: string, patch: Partial<MiscueEvent>) => setEvents(old => old.map(e => e.id === id ? { ...e, ...patch } : e));
  const choice = (label: string, selected: boolean, action: () => void) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected, disabled: saving }} disabled={saving} onPress={action}
    style={{ borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primary : colors.border, borderRadius: radius.md, padding: spacing.sm, minHeight: 44 }}>
    <Text style={[typography.reading.sm, { color: selected ? colors.primary : colors.text }]}>{label.replace(/-/g, ' ')}</Text>
  </Pressable>;
  function generate() {
    try {
      // Coverage refers to token positions, independent of a manually authored word count.
      const n = Number(coverage);
      if (!Number.isSafeInteger(n) || n < 1 || n > p.length) throw new Error('Enter the last passage word reached (1 to ' + p.length + '). Use the full count only for a completed reading.');
      const next = compareTranscript(submission.readingPassage!.text, submission.transcript ?? '', n);
      setComparedThrough(n); setEvents(next); setGenerated(true); setListened(false); setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Comparison unavailable.'); }
  }
  function addManual() {
    const start = Number(manualStart), end = Number(manualEnd);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start || end > p.length) { setError('Enter a valid passage word range.'); return; }
    setEvents(old => [...old, { id: `teacher-${Date.now()}-${old.length}`, kind: 'mispronunciation', status: 'pending', passageStart: start - 1, passageEnd: end,
      transcriptStart: 0, transcriptEnd: 0, source: 'teacher', note: '' }]);
    setGenerated(true); setError('');
  }
  async function save() {
    setSaving(true); setError('');
    try {
      const updated = await saveMiscueReview(submission._id, { algorithmVersion: 'v1', listened, events, comparedThrough }, submission.miscueReview?.reviewedAt ?? null);
      onSaved(updated); Alert.alert('Miscue review saved', 'Your observations and review decisions have been saved.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save review.'); }
    finally { setSaving(false); }
  }
  return <View style={{ ...card, marginTop: spacing.sm }}>
    <HeadingLabel icon="reader-outline" style={{ color: colors.text, fontWeight: '700' }}>Transcript and miscue review</HeadingLabel>
    <Text style={textStyle}>Suggestions need listening and teacher review. Recognition can miss or change words. These events are not a Phil-IRI miscue count or accuracy score.</Text>
    {!submission.readingPassage?.confirmed ? <Text style={textStyle}>This older submission has no confirmed passage snapshot. Comparison is unavailable.</Text> : <>
      <Text style={textStyle}>Listen with the audio player above. Mispronunciation and hesitation require audio evidence. Mark self-corrections and dialect variations separately; they are excluded from errors. Repetition also needs the applicable scoring rule.</Text>
      {submission.miscueReview?.reviewedAt && <Text style={textStyle}>Last saved: {new Date(submission.miscueReview.reviewedAt).toLocaleString()}</Text>}
      {choice(expanded ? 'Hide passage and transcript' : 'Show passage and transcript', expanded, () => setExpanded(v => !v))}
      {expanded && <>
        <Text selectable style={textStyle}>Confirmed passage (numbered for review): {p.map((w, i) => `${i + 1}. ${w}`).join('  ')}</Text>
        <Text selectable style={textStyle}>Saved transcript: {submission.transcript || 'No transcript available. Listen and add observations manually.'}</Text>
      </>}
      {!generated && <>
        <Text style={textStyle}>Last passage word reached (1–{p.length}). Unread trailing words will not be suggested as omissions.</Text>
        <TextInput accessibilityLabel="Last passage word reached" value={coverage} onChangeText={setCoverage} keyboardType="number-pad" style={inputStyle} />
        <Button label="Compare saved transcript" disabled={saving || !t.length} onPress={generate} />
        {!t.length && <Text style={textStyle}>No transcript: use the recording and add observations manually.</Text>}
      </>}
      {comparedThrough !== undefined && <Text style={textStyle}>Transcript compared through passage word {comparedThrough} of {p.length}.</Text>}
      {generated && <Text style={textStyle}>{events.filter(e => e.status === 'pending').length} pending · {events.filter(e => e.status === 'confirmed').length} confirmed observations · {events.filter(e => e.status === 'dismissed').length} dismissed. Adjacent differences are grouped; these totals are not scored errors.</Text>}
      {generated && events.length === 0 && <Text style={textStyle}>No text differences found in the compared range. This does not establish correct pronunciation or a perfect reading.</Text>}
      {events.map(e => <View key={e.id} style={card}>
        <Text selectable style={textStyle}>{e.source === 'teacher' ? 'Teacher observation' : 'Suggested difference'} · Passage {e.passageStart === e.passageEnd ? `gap after word ${e.passageStart}` : `words ${e.passageStart + 1}–${e.passageEnd}`}: {p.slice(e.passageStart, e.passageEnd).join(' ') || '(none)'} → {t.slice(e.transcriptStart, e.transcriptEnd).join(' ') || '(none)'}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>{miscueKinds.map(kind => choice(kind, e.kind === kind, () => update(e.id, { kind })))}</View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>{(['pending', 'confirmed', 'dismissed'] as const).map(status => choice(status, e.status === status, () => update(e.id, { status })))}</View>
        <TextInput accessibilityLabel="Observation notes and audio time" placeholder="Notes / audio time (e.g. 00:12); explain grouping or correction" placeholderTextColor={colors.textMuted} value={e.note} onChangeText={note => update(e.id, { note })} editable={!saving} maxLength={2000} multiline style={inputStyle} />
      </View>)}
      <Text style={textStyle}>Add an audio-based observation using passage word positions. Use notes to explain an event that spans several words.</Text>
      <TextInput accessibilityLabel="First passage word" value={manualStart} onChangeText={setManualStart} keyboardType="number-pad" editable={!saving} style={inputStyle} />
      <TextInput accessibilityLabel="Last passage word" value={manualEnd} onChangeText={setManualEnd} keyboardType="number-pad" editable={!saving} style={inputStyle} />
      <Button label="Add teacher observation" onPress={addManual} disabled={saving || events.length >= 1000} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Switch accessibilityLabel="I listened to the saved recording" value={listened} onValueChange={setListened} disabled={saving} />
        <Text style={[...textStyle, { flex: 1 }]}>I listened to the saved recording and reviewed these observations.</Text>
      </View>
      <Button label="Save miscue review" onPress={save} loading={saving} disabled={saving || !listened || !generated} />
    </>}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.retryText }}>{error}</Text>}
  </View>;
}
