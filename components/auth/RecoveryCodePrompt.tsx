import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getDeviceRecoveryCode, type RecoveryChallenge } from '../../app/lib/api';
import { useTheme } from '../../app/theme/ThemeProvider';
import { radius, spacing, typography } from '../../app/theme/tokens';
import { AuthButton } from './AuthUI';
import { useSession } from './SessionProvider';

export function RecoveryCodePrompt() {
  const { colors } = useTheme();
  const userId = useSession().user?._id;
  const [pending, setPending] = useState<{ userId: string; challenge: RecoveryChallenge } | null>(null);
  const dismissed = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    let checking = false;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      clearTimeout(expiry);
      setPending(null);
    };
    const check = async () => {
      if (checking || AppState.currentState !== 'active') return;
      checking = true;
      try {
        const { challenge } = await getDeviceRecoveryCode();
        if (!alive || AppState.currentState !== 'active') return;
        const remaining = challenge ? Date.parse(challenge.expiresAt) - Date.now() : 0;
        clearTimeout(expiry);
        if (!challenge || remaining <= 0 || dismissed.current === challenge.id) {
          clear();
          return;
        }
        setPending({ userId, challenge });
        expiry = setTimeout(clear, remaining);
      } catch {
        if (alive) clear();
      } finally {
        checking = false;
      }
    };
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void check();
      else clear();
    });
    void check();
    const interval = setInterval(() => { void check(); }, 20_000);
    return () => {
      alive = false;
      clearTimeout(expiry);
      clearInterval(interval);
      subscription.remove();
    };
  }, [userId]);

  const challenge = pending?.userId === userId ? pending?.challenge : null;
  const close = () => {
    dismissed.current = challenge?.id;
    setPending(null);
  };
  if (!challenge) return null;
  return <Modal transparent visible onRequestClose={close}>
    <View style={styles.overlay}>
      <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <Text accessibilityRole="header" style={[typography.display.lg, { color: colors.text }]}>Password reset request</Text>
          <Text style={[typography.reading.sm, { color: colors.text }]}>
            If you requested this reset, enter the code on the device where you started. Keep this code private.
          </Text>
          <Text accessibilityLiveRegion="polite" style={[typography.display.xl, { color: colors.primary, textAlign: 'center', letterSpacing: 5 }]}>{challenge.code}</Text>
          <AuthButton label="Close" onPress={close} />
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md, backgroundColor: 'rgba(36,26,18,0.62)' },
  card: { width: '100%', maxWidth: 400, maxHeight: '85%', borderWidth: 1, borderRadius: radius.lg },
  content: { padding: spacing.lg, gap: spacing.md },
});
