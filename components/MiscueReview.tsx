import { useMemo, useState } from 'react';
import { Alert, Pressable, Switch, Text, TextInput, View, StyleSheet } from 'react-native';
import { Button } from '../app/components/Button';
import { HeadingLabel } from '../app/components/InterfaceChrome';
import { ApiSubmission, saveMiscueReview } from '../app/lib/api';
import { useTheme } from '../app/theme/ThemeProvider';
import { radius, spacing, typography } from '../app/theme/tokens';
import { passageSection } from './miscueReviewLayout';
import { compareTranscript, comparisonWords, miscueKinds, type MiscueEvent } from './miscueComparison';

export function MiscueReview({ submission, onSaved, embedded = false }: { submission: ApiSubmission; onSaved: (s: ApiSubmission) => void; embedded?: boolean }) {
  const { colors } = useTheme();
  const [events, setEvents] = useState<MiscueEvent[]>(submission.miscueReview?.events ?? []);
  const [generated, setGenerated] = useState(!!submission.miscueReview);
  const [listened, setListened] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'Passage' | 'Transcript' | 'Review'>('Passage');
  const [section, setSection] = useState(0);
  const [showNumbers, setShowNumbers] = useState(false);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | MiscueEvent['status']>('all');
  const [activeId, setActiveId] = useState<string | null>(submission.miscueReview?.events[0]?.id ?? null);
  const [showKinds, setShowKinds] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [coverage, setCoverage] = useState('');
  const [comparedThrough, setComparedThrough] = useState<number | undefined>(submission.miscueReview?.comparedThrough);
  const [manualStart, setManualStart] = useState('1');
  const [manualEnd, setManualEnd] = useState('1');
  const passage = submission.readingPassage?.text ?? '';
  const p = useMemo(() => comparisonWords(passage), [passage]);
  const t = useMemo(() => comparisonWords(submission.transcript ?? ''), [submission.transcript]);
  const page = useMemo(() => passageSection(passage, section), [passage, section]);
  const visible = events.filter(e => filter === 'all' || e.status === filter);
  const active = visible.find(e => e.id === activeId) ?? visible[0];
  const activeIndex = active ? visible.findIndex(e => e.id === active.id) : -1;
  const textStyle = [typography.reading.sm, { color: colors.text }];
  const card = { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: 12, backgroundColor: colors.surface };
  const inputStyle = { borderWidth: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.background, borderRadius: radius.sm, padding: 12, minHeight: 48, ...typography.reading.sm };
  const update = (id: string, patch: Partial<MiscueEvent>) => {
    setEvents(old => old.map(e => e.id === id ? { ...e, ...patch } : e));
    setListened(false);
  };
  const label = (value: string) => value.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
  const choice = (title: string, selected: boolean, action: () => void, disabled = false) => (
    <Pressable key={title} accessibilityRole="button" accessibilityState={{ selected, disabled: saving || disabled }}
      disabled={saving || disabled} onPress={action}
      style={[styles.choice, { borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : colors.background, opacity: saving || disabled ? 0.45 : 1 }]}>
      <Text style={[typography.reading.sm, { color: selected ? colors.primaryText : colors.text, textAlign: 'center' }]}>{title}</Text>
    </Pressable>
  );
  function openManual() {
    if (selectedWord !== null) {
      setManualStart(String(selectedWord + 1)); setManualEnd(String(selectedWord + 1));
    }
    setShowManual(true); setTab('Review');
  }
  function decide(status: MiscueEvent['status']) {
    if (!active) return;
    // Retain the current card after a decision, including in a filtered queue, so notes remain editable.
    update(active.id, { status });
    setFilter('all'); setActiveId(active.id);
  }
  function generate() {
    try {
      // Coverage refers to token positions, independent of a manually authored word count.
      const n = Number(coverage);
      if (!Number.isSafeInteger(n) || n < 1 || n > p.length) throw new Error('Enter the last passage word reached (1 to ' + p.length + '). Use the full count only for a completed reading.');
      const next = compareTranscript(submission.readingPassage!.text, submission.transcript ?? '', n);
      setComparedThrough(n); setEvents(next); setGenerated(true); setListened(false); setError('');
      setFilter('all'); setActiveId(next[0]?.id ?? null); setTab('Review');
    } catch (err) { setError(err instanceof Error ? err.message : 'Comparison unavailable.'); }
  }
  function addManual() {
    const start = Number(manualStart), end = Number(manualEnd);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start || end > p.length) { setError('Enter a valid passage word range.'); return; }
    const id = `teacher-${Date.now()}-${events.length}`;
    setEvents(old => [...old, { id, kind: 'mispronunciation', status: 'pending', passageStart: start - 1, passageEnd: end,
      transcriptStart: 0, transcriptEnd: 0, source: 'teacher', note: '' }]);
    setGenerated(true); setListened(false); setError('');
    setFilter('all'); setActiveId(id); setShowManual(false); setTab('Review');
  }
  async function save() {
    setSaving(true); setError('');
    try {
      const updated = await saveMiscueReview(submission._id, { algorithmVersion: 'v1', listened, events, comparedThrough }, submission.miscueReview?.reviewedAt ?? null);
      onSaved(updated); Alert.alert('Miscue review saved', 'Your observations and review decisions have been saved.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save review.'); }
    finally { setSaving(false); }
  }
  return <View style={{ ...card, marginTop: embedded ? 0 : spacing.sm, borderWidth: embedded ? 0 : 1, padding: embedded ? 0 : spacing.md, backgroundColor: colors.background }}>
    {!embedded && <HeadingLabel icon="reader-outline" style={{ color: colors.text, fontWeight: '700' }}>Reading review</HeadingLabel>}
    <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Listen with the audio player above, then review the suggested differences.</Text>
    {submission.miscueReview?.reviewedAt && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Last saved: {new Date(submission.miscueReview.reviewedAt).toLocaleString()}</Text>}
    {!submission.readingPassage?.confirmed ? <Text style={textStyle}>This older submission has no confirmed passage snapshot. Comparison is unavailable.</Text> : <>
      <View accessibilityRole="tablist" style={[styles.tabs, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        {(['Passage', 'Transcript', 'Review'] as const).map(name => <Pressable key={name} accessibilityRole="tab"
          accessibilityState={{ selected: tab === name }} onPress={() => setTab(name)}
          style={[styles.tab, { backgroundColor: tab === name ? colors.primary : 'transparent' }]}>
          <Text style={[typography.reading.sm, { color: tab === name ? colors.primaryText : colors.text, textAlign: 'center' }]}>{name}</Text>
        </Pressable>)}
      </View>

      {tab === 'Passage' && <View style={card}>
        <Text style={[typography.display.md, { color: colors.text }]}>Confirmed passage</Text>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Original reading material · {p.length} words</Text>
        <View style={styles.row}>
          <Text style={[...textStyle, styles.flex]}>Show word numbers</Text>
          <Switch accessibilityLabel="Show word numbers" value={showNumbers} onValueChange={setShowNumbers}
            trackColor={{ true: colors.primary }} />
        </View>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Tap a word to see its position.</Text>
        <Text style={[typography.reading.md, { color: colors.text }]}>
          {page.words.map(w => <Text key={w.index}>
            {w.prefix}<Text onPress={() => setSelectedWord(w.index)} accessibilityRole="button"
              accessibilityLabel={`${w.word}, word ${w.index + 1}`} accessibilityState={{ selected: selectedWord === w.index }}
              style={selectedWord === w.index ? { backgroundColor: colors.highlight, color: '#3A2A1E' } : undefined}>
              {showNumbers && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{w.index + 1}· </Text>}{w.word}
            </Text>
          </Text>)}{page.suffix}
        </Text>
        {selectedWord !== null && <View style={[styles.selection, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Selected word · Word {selectedWord + 1}</Text>
          <Text style={[typography.display.md, { color: colors.text }]}>{p[selectedWord]}</Text>
          {choice('Add observation', false, openManual)}
          {!generated && choice('Set as last word reached', false, () => { setCoverage(String(selectedWord + 1)); setTab('Review'); })}
        </View>}
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          {choice('‹ Previous', false, () => setSection(page.page - 1), page.page === 0)}
          <Text style={[...textStyle, styles.pageLabel]}>Section {page.page + 1} of {page.count}</Text>
          {choice('Next ›', false, () => setSection(page.page + 1), page.page + 1 === page.count)}
        </View>
      </View>}

      {tab === 'Transcript' && <View style={card}>
        <Text style={[typography.display.md, { color: colors.text }]}>Saved transcript</Text>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Speech recognition may miss or change words. Check against the recording.</Text>
        <Text selectable style={[typography.reading.md, { color: colors.text }]}>{submission.transcript || 'No transcript available. Listen and add observations manually in Review.'}</Text>
      </View>}

      {tab === 'Review' && <>
        {!generated && <View style={card}>
          <Text style={[typography.display.md, { color: colors.text }]}>Reading coverage</Text>
          <Text style={textStyle}>Last passage word reached (1–{p.length})</Text>
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Unread trailing words will not be suggested as omissions. Select a word in Passage, or enter its number here.</Text>
          <TextInput accessibilityLabel="Last passage word reached" value={coverage} onChangeText={setCoverage}
            editable={!saving} keyboardType="number-pad" style={inputStyle} />
          <Button label="Compare saved transcript" disabled={saving || !t.length} onPress={generate} />
          {!t.length && <Text style={textStyle}>No transcript: use the recording and add observations manually.</Text>}
        </View>}
        {comparedThrough !== undefined && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Compared through word {comparedThrough} of {p.length}.</Text>}
        {generated && <>
          <View style={styles.filters}>
            {choice(`All (${events.length})`, filter === 'all', () => { setFilter('all'); setActiveId(null); })}
            {(['pending', 'confirmed', 'dismissed'] as const).map(status => choice(
              `${label(status)} (${events.filter(e => e.status === status).length})`, filter === status,
              () => { setFilter(status); setActiveId(null); }))}
          </View>
          {!events.length && <Text style={textStyle}>No text differences found in the compared range. This does not establish correct pronunciation or a perfect reading.</Text>}
          {!!events.length && !active && <Text style={textStyle}>No {filter} observations. Choose another filter to continue reviewing.</Text>}
          {active && <View style={card}>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              <Text style={[typography.reading.sm, { color: colors.textMuted, flex: 1 }]}>OBSERVATION {activeIndex + 1} OF {visible.length}</Text>
              <Text style={[typography.reading.sm, styles.badge, { backgroundColor: colors.secondary, color: colors.secondaryText }]}>{label(active.status)}</Text>
            </View>
            <Text style={[typography.display.md, { color: colors.text }]}>{active.source === 'teacher' ? 'Teacher observation' : 'Suggested difference'}</Text>
            <Text style={textStyle}>{active.passageStart === active.passageEnd
              ? active.passageStart === 0 ? 'Gap before word 1' : `Gap after word ${active.passageStart}`
              : `Passage words ${active.passageStart + 1}–${active.passageEnd}`}</Text>
            <View style={[styles.selection, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[typography.reading.sm, { color: colors.textMuted }]}>PASSAGE</Text>
              <Text selectable style={textStyle}>
                {p.slice(Math.max(0, active.passageStart - 3), active.passageStart).join(' ')}{' '}
                <Text style={{ backgroundColor: colors.highlight, color: '#3A2A1E' }}>{p.slice(active.passageStart, active.passageEnd).join(' ') || '[gap]'}</Text>{' '}
                {p.slice(active.passageEnd, active.passageEnd + 3).join(' ')}
              </Text>
            </View>
            <View style={[styles.selection, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Text style={[typography.reading.sm, { color: colors.textMuted }]}>SAVED TRANSCRIPT</Text>
              <Text selectable style={textStyle}>{active.source === 'teacher' ? 'Audio-based observation; no transcript range selected.' : <>
                {t.slice(Math.max(0, active.transcriptStart - 3), active.transcriptStart).join(' ')}{' '}
                <Text style={{ backgroundColor: colors.highlight, color: '#3A2A1E' }}>{t.slice(active.transcriptStart, active.transcriptEnd).join(' ') || '[no words]'}</Text>{' '}
                {t.slice(active.transcriptEnd, active.transcriptEnd + 3).join(' ')}
              </>}</Text>
            </View>
            <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Listen to the recording before deciding.</Text>
            <Text style={textStyle}>Observation type</Text>
            {choice(`${label(active.kind)} ${showKinds ? '▴' : '▾'}`, false, () => setShowKinds(v => !v))}
            {showKinds && <View style={styles.filters}>{miscueKinds.map(kind => choice(label(kind), active.kind === kind,
              () => { update(active.id, { kind }); setShowKinds(false); }))}</View>}
            <Text style={textStyle}>Notes / audio time</Text>
            <TextInput accessibilityLabel="Observation notes and audio time" placeholder="Add notes or audio time (e.g. 00:12)…"
              placeholderTextColor={colors.textMuted} value={active.note} onChangeText={note => update(active.id, { note })}
              editable={!saving} maxLength={2000} multiline style={[inputStyle, { minHeight: 80, textAlignVertical: 'top' }]} />
            <View style={styles.row}>
              <View style={styles.flex}>{choice('Dismiss', active.status === 'dismissed', () => decide('dismissed'))}</View>
              <View style={styles.flex}>{choice('Confirm', active.status === 'confirmed', () => decide('confirmed'))}</View>
            </View>
            {active.status !== 'pending' && choice('Mark pending', false, () => decide('pending'))}
          </View>}
          {active && <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
            {choice('‹ Previous', false, () => { setActiveId(visible[activeIndex - 1].id); setShowKinds(false); }, activeIndex <= 0)}
            {choice('Next observation ›', false, () => { setActiveId(visible[activeIndex + 1].id); setShowKinds(false); }, activeIndex + 1 >= visible.length)}
          </View>}
        </>}
        {choice(showManual ? 'Close teacher observation' : '+ Add teacher observation', false, () => setShowManual(v => !v))}
        {showManual && <View style={card}>
          <Text style={[typography.display.md, { color: colors.text }]}>Audio-based observation</Text>
          <Text style={textStyle}>Use passage word positions. Select a word in Passage to prefill the range.</Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={textStyle}>First word</Text>
              <TextInput accessibilityLabel="First passage word" value={manualStart} onChangeText={setManualStart} keyboardType="number-pad" editable={!saving} style={inputStyle} />
            </View>
            <View style={styles.flex}>
              <Text style={textStyle}>Last word</Text>
              <TextInput accessibilityLabel="Last passage word" value={manualEnd} onChangeText={setManualEnd} keyboardType="number-pad" editable={!saving} style={inputStyle} />
            </View>
          </View>
          <Button label="Add observation" onPress={addManual} disabled={saving || events.length >= 1000} />
        </View>}
        {generated && <>
          <View style={styles.row}>
            <Switch accessibilityLabel="I listened to the saved recording" value={listened} onValueChange={setListened} disabled={saving} trackColor={{ true: colors.primary }} />
            <Text style={[...textStyle, styles.flex]}>I listened to the saved recording and reviewed these observations.</Text>
          </View>
          <Button label={saving ? 'Saving review…' : 'Save review'} onPress={save} loading={saving} disabled={saving || !listened || !generated} />
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Observation counts are not a Phil-IRI miscue count or accuracy score.</Text>
        </>}
      </>}
      {choice(showHelp ? 'Hide review guide' : 'Review guide', false, () => setShowHelp(v => !v))}
      {showHelp && <Text style={textStyle}>Suggestions need listening and teacher review. Recognition can miss or change words. Mispronunciation and hesitation require audio evidence. Mark self-corrections and dialect variations separately; they are excluded from errors. Repetition also needs the applicable scoring rule. Adjacent differences are grouped; these totals are not scored errors.</Text>}
    </>}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.retryText }}>{error}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 48, paddingVertical: 10, paddingHorizontal: 4, borderRadius: radius.sm, justifyContent: 'center' },
  choice: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selection: { borderWidth: 1, borderRadius: radius.sm, padding: 12, gap: 8 },
  pageLabel: { flex: 1, minWidth: 64, textAlign: 'center', fontSize: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, overflow: 'hidden' },
});
