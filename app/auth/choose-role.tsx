import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AuthButton, AuthCanvas, AuthHeader, authStyles } from '../../components/auth/AuthUI';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/tokens';
export default function ChooseRole() {
  const { colors } = useTheme(); const [role, setRole] = useState<'learner' | 'teacher'>('learner');
  return <AuthCanvas scroll><View style={{ flex: 1, justifyContent: 'center', paddingVertical: 24 }}>
    <AuthHeader title="Sign up" onBack={() => router.back()} />
    <Text style={[typography.reading.sm, { color: colors.text, marginBottom: 12 }]}>Choose your role</Text>
    <View accessibilityRole="radiogroup" style={{ gap: 12, marginBottom: 32 }}>{(['learner', 'teacher'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: role === value }} onPress={() => setRole(value)} style={[authStyles.input, { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: role === value ? colors.primary : colors.border }]}>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: role === value ? colors.primary : colors.textMuted, alignItems: 'center', justifyContent: 'center' }}>{role === value && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />}</View>
      <Text style={[typography.display.md, { color: colors.text }]}>{value === 'learner' ? 'Learner' : 'Teacher'}</Text>
    </Pressable>)}</View>
    <AuthButton label="Continue" onPress={() => router.push(role === 'learner' ? '/auth/learner-signup' : '/auth/teacher-signup')} />
    <Pressable accessibilityRole="button" onPress={() => router.replace('/auth/login')} style={[authStyles.link, { marginTop: 20 }]}><Text style={[typography.reading.sm, { color: colors.primary }]}>Already have an account? Log in</Text></Pressable>
  </View></AuthCanvas>;
}
