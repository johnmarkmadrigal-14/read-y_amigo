import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ApiEnrollment, ClassroomPerson } from '../../app/lib/api';
import { useTheme } from '../../app/theme/ThemeProvider';
import { typography } from '../../app/theme/tokens';
import { UserAvatar } from '../UserAvatar';
import { ProgressAction, ProgressBadge, ProgressCard, progressStyles as s } from '../progress/ProgressUI';
export function personName(person: ClassroomPerson) {
  return person.fullName || [person.firstName, person.middleInitial, person.secondName].filter(Boolean).join(' ') || person.displayName;
}
export function ClassroomPeople({ role, learners, teacher }: { role: 'teacher' | 'learner'; learners: ApiEnrollment[]; teacher?: ClassroomPerson | null }) {
  const { colors } = useTheme(); const [query, setQuery] = useState(''), [selected, setSelected] = useState<ClassroomPerson | null>(null);
  const people = learners.filter(row => !!row.learner);
  const visible = people.filter(row => `${personName(row.learner)} ${row.learner.displayName}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <View style={s.stack}>
    <Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>{role === 'teacher' ? 'Learners' : 'People'}</Text>
    {role === 'learner' && <ProgressCard><Text style={[typography.display.md, { color: colors.text }]}>Teacher</Text>{teacher ? <View style={s.row}><UserAvatar name={personName(teacher)} photo={teacher.profilePhoto} size={48} /><View style={{ flex: 1, gap: 4 }}><Text style={[typography.display.md, { color: colors.text }]}>{teacher.displayName || personName(teacher)}</Text><ProgressBadge>Teacher</ProgressBadge></View></View> : <Text style={{ color: colors.textMuted }}>Teacher details are unavailable.</Text>}</ProgressCard>}
    <Text style={[typography.display.md, { color: colors.text }]}>{role === 'teacher' ? `${people.length} enrolled` : `Classmates · ${people.length}`}</Text>
    <TextInput accessibilityLabel={role === 'teacher' ? 'Search learner' : 'Search classmate'} placeholder={role === 'teacher' ? 'Search learner' : 'Search classmate'} placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} style={[s.input, typography.reading.sm, { color: colors.text, borderColor: colors.border }]} />
    {!visible.length && <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{people.length ? 'No matching class members.' : 'No learners have joined yet.'}</Text>}
    {visible.map(row => <Pressable key={row._id} accessibilityRole="button" accessibilityLabel={`View ${personName(row.learner)}`} onPress={() => setSelected(row.learner)} style={[s.card, s.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <UserAvatar name={personName(row.learner)} photo={row.learner.profilePhoto} size={46} /><Text style={[typography.display.md, { color: colors.text, flex: 1 }]}>{row.learner.displayName || personName(row.learner)}</Text><Ionicons name="chevron-forward" size={22} color={colors.primary} />
    </Pressable>)}
    <Modal visible={selected !== null} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' }}>
        <View accessibilityViewIsModal style={{ padding: 24, paddingBottom: 36, maxHeight: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.surface, gap: 18 }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.textMuted, alignSelf: 'center', borderRadius: 2 }} />
          <View style={[s.row, { justifyContent: 'space-between' }]}><Text accessibilityRole="header" style={[typography.display.md, { color: colors.text }]}>{role === 'teacher' ? 'Learner details' : 'Classmate details'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close preview" onPress={() => setSelected(null)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View>
          {selected && <ScrollView contentContainerStyle={s.stack}><View style={s.row}><UserAvatar name={personName(selected)} photo={selected.profilePhoto} size={88} /><View style={{ flex: 1, gap: 8 }}><Text style={[typography.display.lg, { color: colors.text }]}>{personName(selected)}</Text><ProgressBadge>Learner</ProgressBadge></View></View><Text style={[typography.reading.md, { color: colors.text }]}>Age {typeof selected.age === 'number' ? `${selected.age} years old` : 'not available'}</Text></ScrollView>}
          <ProgressAction label="Close" onPress={() => setSelected(null)} />
        </View>
      </View>
    </Modal>
  </View>;
}
