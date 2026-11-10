import { useState, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../app/theme/ThemeProvider';
import { typography } from '../../app/theme/tokens';

// Native shapes keep the book crisp at every screen size and need no new asset or module.
export function BookMark({ size = 52, progress }: { size?: number; progress?: Animated.Value }) {
  const [open] = useState(() => new Animated.Value(1));
  const value = progress || open;
  const width = 200, half = 96;
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size * 0.65 }}>
    <Animated.View style={{ width, height: 130, transform: [{ scale: size / width }, { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [-48, 0] }) }], transformOrigin: ['0%', '0%', 0] }}>
      <View style={{ position: 'absolute', left: 100, top: 14, width: half, height: 111, borderRadius: 7, backgroundColor: '#D71920' }} />
      <View style={{ position: 'absolute', left: 100, top: 10, width: 91, height: 108, borderRadius: 5, borderWidth: 1, borderColor: '#DECDA8', backgroundColor: '#FFF8E6' }} />
      <Animated.View style={{ position: 'absolute', left: 4, top: 10, width: half, height: 115, borderRadius: 6, backgroundColor: '#D71920', opacity: value }}>
        <View style={{ flex: 1, marginLeft: 5, marginTop: 0, marginBottom: 7, borderRadius: 4, borderWidth: 1, borderColor: '#DECDA8', backgroundColor: '#FFF8E6' }} />
      </Animated.View>
      {[32, 48, 64, 80, 96].map(top => <Animated.View key={top} style={{ position: 'absolute', left: 16, top, width: 70, height: 1, backgroundColor: '#DECDA8', opacity: value }} />)}
      {[32, 48, 64, 80, 96].map(top => <View key={top} style={{ position: 'absolute', left: 112, top, width: 65, height: 1, backgroundColor: '#DECDA8' }} />)}
      <View style={{ position: 'absolute', left: 151, top: 100, width: 15, height: 29, borderBottomLeftRadius: 2, backgroundColor: '#FFC72C' }} />
      <Animated.View style={{ position: 'absolute', left: 100, top: 8, width: half, height: 112, borderRadius: 6, backgroundColor: '#D71920', backfaceVisibility: 'hidden', transform: [{ perspective: 700 }, { translateX: -half / 2 }, { rotateY: value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-178deg'] }) }, { translateX: half / 2 }] }} />
      <Animated.View style={{ position: 'absolute', left: 99, top: 13, width: 2, height: 104, backgroundColor: '#C5AF86', opacity: value }} />
    </Animated.View>
  </View>;
}
export function AuthCanvas({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  const { colors } = useTheme();
  return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.surface }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 24 }}><View style={{ flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center' }}>{children}</View></ScrollView> : <View style={{ flex: 1, width: '100%', maxWidth: 478, alignSelf: 'center', padding: 24 }}>{children}</View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function AuthHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const { colors } = useTheme();
  return <View style={{ gap: 28, marginBottom: 28 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}><Ionicons name="arrow-back" size={23} color={colors.primary} /></Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}><BookMark /></View><View style={{ width: 44 }} />
    </View>
    <Text accessibilityRole="header" style={[typography.display.lg, { textAlign: 'center', color: colors.text }]}>{title}</Text>
  </View>;
}
export function AuthButton({ label, onPress, outline = false, disabled = false, busy = false }: { label: string; onPress: () => void; outline?: boolean; disabled?: boolean; busy?: boolean }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={{ minHeight: 50, borderWidth: 1.2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderColor: colors.primary, backgroundColor: outline ? colors.surface : colors.primary, opacity: disabled || busy ? 0.5 : 1 }}><Text style={[typography.display.md, { color: outline ? colors.primary : colors.primaryText }]}>{busy ? 'Please wait…' : label}</Text></Pressable>;
}
export function AuthInput({ label, password = false, ...props }: TextInputProps & { label: string; password?: boolean }) {
  const { colors } = useTheme(); const [hidden, setHidden] = useState(password);
  return <View style={{ gap: 7, marginBottom: 20 }}><Text style={[typography.reading.sm, { color: colors.text }]}>{label}</Text><View style={[authStyles.input, { flexDirection: 'row', alignItems: 'center', borderColor: colors.border }]}>
    <TextInput {...props} accessibilityLabel={label} secureTextEntry={hidden} autoCapitalize="none" placeholderTextColor={colors.textMuted} style={[typography.reading.sm, { flex: 1, minHeight: 48, color: colors.text, padding: 0 }]} />
    {password && <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} onPress={() => setHidden(value => !value)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} /></Pressable>}
  </View></View>;
}
export const authStyles = StyleSheet.create({ input: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 }, link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' } });
