import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/tokens';
import { ProgressAction, progressStyles as s } from '../../../components/progress/ProgressUI';
import { submissionDate } from '../../../components/progress/data';
import { getNotifications, readNotification } from '../../../components/workflow/api';
import { workDestination, workLabel, type TeacherNotification } from '../../../components/workflow/data';
export default function NotificationsScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<TeacherNotification[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const request = String(revision);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setError('');
    getNotifications().then(data => { if (active) setItems(data.notifications); }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load notifications.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // The revision intentionally reloads the same endpoint on manual refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]));
  function open(item: TeacherNotification) {
    void readNotification(item._id).then(() => setItems(rows => rows.map(row => row._id === item._id ? { ...row, readAt: new Date().toISOString() } : row))).catch(() => {});
    router.push(workDestination(item));
  }
  return <Screen>
    <View style={[s.row, { justifyContent: 'space-between', paddingBottom: 12 }]}><Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>Notifications</Text><ProgressAction label="Refresh" onPress={() => setRevision(value => value + 1)} /></View>
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => setRevision(value => value + 1)} />} contentContainerStyle={[s.stack, { paddingBottom: 28 }]}>
      <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={{ color: colors.textMuted }}>Latest 10 notifications</Text><Text style={{ color: colors.textMuted }}>Newest first</Text></View>
      {loading && <ActivityIndicator color={colors.primary} />}
      {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>}
      {!loading && !error && !items.length && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>You&apos;re all caught up. New submissions and learners joining your classes will appear here.</Text>}
      {!error && items.map(item => <Pressable key={item._id} accessibilityRole="button" accessibilityLabel={`${item.actorName} ${item.kind === 'joined' ? 'joined your class' : `submitted ${item.title}`}`} onPress={() => open(item)} style={[s.card, { flexDirection: 'row', alignItems: 'center', borderColor: colors.border, backgroundColor: item.readAt ? colors.background : colors.surface }]}>
        <View style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={item.kind === 'joined' ? 'person-add-outline' : item.kind === 'reading' ? 'mic-outline' : 'document-text-outline'} size={27} color={item.kind === 'joined' || item.kind === 'activity' ? colors.accentGreen : item.kind === 'reading' ? colors.accentBlue : colors.accentOrange} />{!item.readAt && <View accessibilityLabel="Unread" style={{ position: 'absolute', right: 0, top: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />}</View>
        <View style={{ flex: 1, gap: 4 }}><Text style={[typography.reading.sm, { color: colors.text }]}><Text style={{ fontWeight: '700' }}>{item.actorName}</Text> {item.kind === 'joined' ? 'joined your class' : `submitted ${item.title}`}</Text><Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.kind !== 'joined' ? `${workLabel(item.kind)} · ` : ''}{item.classTitle}</Text><Text style={{ color: colors.textMuted, fontSize: 12 }}>{submissionDate(item.createdAt)}</Text></View>
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </Pressable>)}
      <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Only the 10 latest notifications are kept.</Text>
    </ScrollView>
  </Screen>;
}
