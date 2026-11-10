import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authRequest, getFileUrl } from '../../app/lib/api';
import { FileViewer } from '../../app/components/FileViewer';
import { Screen } from '../../app/components/Screen';
import { useTheme } from '../../app/theme/ThemeProvider';
import { typography } from '../../app/theme/tokens';
import { ProgressAction, progressStyles as s } from '../progress/ProgressUI';
import { submissionDate } from '../progress/data';
export type LibraryFile = { key: string; name: string; url: string; mimeType?: string; uploadedAt?: string; activities: { _id: string; title: string }[] };
export function ClassroomLibrary({ classId, role }: { classId: string; role: 'teacher' | 'learner' }) {
  const { colors } = useTheme();
  const [files, setFiles] = useState<LibraryFile[]>([]), [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LibraryFile | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [newest, setNewest] = useState(true), [revision, setRevision] = useState(0);
  const request = `${role}:${classId}:${revision}`;
  useFocusEffect(useCallback(() => {
    const [requestedRole, requestedClass] = request.split(':');
    let active = true; setLoading(true); setError(''); setFiles([]);
    authRequest<{ files: LibraryFile[] }>(`/${requestedRole === 'teacher' ? 'classes' : 'learner/classes'}/${requestedClass}/library`)
      .then(data => { if (active) setFiles(data.files); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load the library.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [request]));
  const groups = useMemo(() => {
    const text = query.trim().toLocaleLowerCase();
    const visible = files.filter(file => `${file.name} ${file.activities.map(activity => activity.title).join(' ')}`.toLocaleLowerCase().includes(text))
      .slice().sort((a, b) => ((Date.parse(b.uploadedAt || '') || 0) - (Date.parse(a.uploadedAt || '') || 0)) * (newest ? 1 : -1) || a.name.localeCompare(b.name));
    const dates = new Map<string, LibraryFile[]>();
    for (const file of visible) {
      const date = file.uploadedAt && Number.isFinite(Date.parse(file.uploadedAt)) ? new Date(file.uploadedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Earlier uploads';
      dates.set(date, [...(dates.get(date) || []), file]);
    }
    return [...dates];
  }, [files, query, newest]);
  return <View style={s.stack}>
    <Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>Library</Text>
    <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Files from reading activities appear here.</Text>
    <TextInput accessibilityLabel="Search reading files" value={query} onChangeText={setQuery} placeholder="Search reading files" placeholderTextColor={colors.textMuted} style={[s.input, typography.reading.sm, { borderColor: colors.border, color: colors.text }]} />
    <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={{ color: colors.text }}>{groups.reduce((sum, [, entries]) => sum + entries.length, 0)} files</Text><ProgressAction label={newest ? 'Newest first ↓' : 'Oldest first ↑'} onPress={() => setNewest(value => !value)} /></View>
    {loading && <ActivityIndicator color={colors.primary} />}
    {!!error && <><Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text><ProgressAction label="Retry library" onPress={() => setRevision(value => value + 1)} /></>}
    {!loading && !error && !groups.length && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{files.length ? 'No matching files.' : 'Reading attachments will appear here when your teacher publishes them.'}</Text>}
    {groups.map(([date, entries]) => <View key={date} style={s.stack}>
      <Text style={[typography.display.md, { color: colors.text, backgroundColor: colors.surface, padding: 8, borderRadius: 10 }]}>{date}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {entries.map(file => {
          const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE';
          const tint = extension === 'PDF' ? colors.primary : extension === 'DOCX' ? colors.accentBlue : colors.accentGreen;
          return <View key={file.key} style={[s.card, { flexGrow: 1, flexBasis: '44%', minWidth: 130, maxWidth: '49%', backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ alignItems: 'center', paddingVertical: 10 }}><Ionicons name="document-text-outline" size={48} color={tint} /><Text style={[typography.display.sm, { color: tint }]}>{extension}</Text></View>
            <Text style={[typography.display.md, { color: colors.text }]} numberOfLines={2}>{file.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={2}>From {file.activities.map(activity => activity.title).join(', ')}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{submissionDate(file.uploadedAt)}</Text>
            <ProgressAction label={`Open ${file.name}`} onPress={() => setSelected(file)} />
          </View>;
        })}
      </View>
    </View>)}
    <Modal visible={selected !== null} animationType="slide" onRequestClose={() => setSelected(null)}>
      {selected && <Screen><View style={[s.stack, { flex: 1 }]}><ProgressAction label="‹ Back to Library" onPress={() => setSelected(null)} /><Text style={[typography.display.md, { color: colors.text }]}>{selected.name}</Text><ScrollView><FileViewer url={getFileUrl(selected.url)} name={selected.name} mimeType={selected.mimeType} /></ScrollView></View></Screen>}
    </Modal>
  </View>;
}
