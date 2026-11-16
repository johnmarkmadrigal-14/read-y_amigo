import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { HeadingLabel } from '../../app/components/InterfaceChrome';
import { Screen } from '../../app/components/Screen';
import { generateBackupRecoveryCode, getDeviceRecoveryCode } from '../../app/lib/api';
import { useTheme } from '../../app/theme/ThemeProvider';
import { spacing, typography } from '../../app/theme/tokens';
import { AuthButton, AuthInput } from './AuthUI';

export function RecoverySettings() {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [backup, setBackup] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const viewRevision = useRef(0);

  useFocusEffect(useCallback(() => {
    const clear = () => {
      viewRevision.current++;
      setPassword('');
      setBackup('');
      setNotice('');
      setError('');
    };
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') clear(); });
    return () => { subscription.remove(); clear(); };
  }, []));

  async function run(action: (isCurrent: () => boolean) => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const revision = viewRevision.current;
    const isCurrent = () => revision === viewRevision.current;
    try { await action(isCurrent); }
    catch (err) { if (isCurrent()) setError(err instanceof Error ? err.message : 'Try again.'); }
    finally { setBusy(false); }
  }

  return <Screen scroll back>
    <View style={{ gap: spacing.md }}>
      <HeadingLabel icon="key-outline" style={[typography.display.lg, { color: colors.text }]}>Password recovery</HeadingLabel>
      <AuthButton label="View pending verification code" outline disabled={busy} onPress={() => void run(async isCurrent => {
        const { challenge } = await getDeviceRecoveryCode();
        if (isCurrent()) {
          setNotice(challenge ? `Verification code: ${challenge.code}. It expires at ${new Date(challenge.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` : 'There is no pending password reset.');
        }
      })} />
      {!!notice && <Text accessibilityLiveRegion="polite" style={[typography.reading.sm, { color: colors.text }]}>{notice}</Text>}
      <Text accessibilityRole="header" style={[typography.display.md, { color: colors.text }]}>Backup recovery code</Text>
      <Text style={[typography.reading.sm, { color: colors.text }]}>
        Save a backup code to use if you’re signed out everywhere. Generating a new code replaces your previous one.
      </Text>
      {!backup && <>
        <AuthInput label="Current password" password autoComplete="current-password" value={password} editable={!busy} onChangeText={setPassword} />
        <AuthButton label="Generate backup code" busy={busy} disabled={!password} onPress={() => void run(async isCurrent => {
          const result = await generateBackupRecoveryCode(password);
          if (isCurrent()) { setPassword(''); setBackup(result.code); }
        })} />
      </>}
      {!!backup && <>
        <Text selectable accessibilityLiveRegion="polite" style={[typography.display.md, { color: colors.primary }]}>{backup}</Text>
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Keep this code somewhere private. You can use it once.</Text>
        <AuthButton label="Done" outline onPress={() => setBackup('')} />
      </>}
      {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>}
    </View>
  </Screen>;
}
