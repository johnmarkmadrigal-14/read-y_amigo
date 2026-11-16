import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { AuthButton, AuthCanvas, AuthHeader, AuthInput } from '../../components/auth/AuthUI';
import { requestPasswordCode, resetPassword, verifyPasswordCode } from '../lib/api';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/tokens';

type Step = 'account' | 'device' | 'backup' | 'password' | 'done';
const titles: Record<Step, string> = {
  account: 'Forgot password?',
  device: 'Enter verification code',
  backup: 'Use a backup recovery code',
  password: 'Create a new password',
  done: 'Password updated',
};

export default function ForgotPassword() {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('account');
  const [role, setRole] = useState<'teacher' | 'learner' | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);

  function show(next: Step) {
    Keyboard.dismiss();
    setError('');
    setCode('');
    setStep(next);
    if (next !== 'password') {
      setResetToken('');
      setPassword('');
      setConfirmation('');
    }
  }

  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError('');
    try { await action(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Try again.'); }
    finally { pending.current = false; setLoading(false); }
  }

  function login() {
    if (router.canGoBack()) router.back();
    else router.replace('/auth/login');
  }

  const onBack = () => {
    if (pending.current) return;
    if (step === 'account' || step === 'done') login();
    else show('account');
  };
  const message = (text: string) =>
    <Text style={[typography.reading.sm, { color: colors.textMuted, marginBottom: 16 }]}>{text}</Text>;

  return <AuthCanvas scroll>
    <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 24 }}>
      <AuthHeader title={titles[step]} onBack={onBack} />
      {step === 'account' && <>
        {message('Choose your account type to request a code in Read-y Amigo on a device where you’re already signed in.')}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['teacher', 'learner'] as const).map(option => <View key={option} style={{ flex: 1 }}>
            <AuthButton label={option === 'teacher' ? 'Teacher' : 'Learner'} outline={role !== option}
              disabled={loading} onPress={() => setRole(option)} />
          </View>)}
        </View>
        <AuthInput label={role === 'teacher' ? 'Email' : role === 'learner' ? 'Username' : 'Email or username'}
          value={identifier} keyboardType={role === 'teacher' ? 'email-address' : 'default'}
          autoComplete="username" maxLength={254} editable={!loading} onChangeText={setIdentifier} />
      </>}
      {step === 'device' && <>
        {message('Open Read-y Amigo on your signed-in device to see the 6-digit code.')}
        <AuthInput label="Verification code" placeholder="Enter 6-digit code" value={code} keyboardType="number-pad"
          maxLength={6} editable={!loading} onChangeText={value => setCode(value.replace(/[^0-9]/g, ''))} />
      </>}
      {step === 'backup' && <>
        {message('Enter the backup recovery code you saved from Settings. Each code works once.')}
        <AuthInput label="Backup recovery code" placeholder="Enter your saved code" value={code} maxLength={64}
          autoCorrect={false} editable={!loading} onChangeText={setCode} />
      </>}
      {step === 'password' && <>
        {message('Code verified. Use at least 8 characters for your new password.')}
        <AuthInput key="new" label="New password" password value={password} autoComplete="new-password"
          maxLength={72} editable={!loading} onChangeText={setPassword} />
        <AuthInput key="confirm" label="Re-type new password" password value={confirmation} autoComplete="new-password"
          maxLength={72} editable={!loading} onChangeText={setConfirmation} />
      </>}
      {step === 'done' && message('You can now log in using your new password.')}
      {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText, marginBottom: 16 }]}>{error}</Text>}
      {step === 'account' && <View style={{ gap: 10 }}>
        <AuthButton label="Request code" disabled={!role || !identifier.trim()} busy={loading}
          onPress={() => void run(async () => {
            if (!role) return;
            await requestPasswordCode(identifier.trim(), role);
            show('device');
          })} />
        <AuthButton label="Use a backup code" outline disabled={loading || !role || !identifier.trim()} onPress={() => show('backup')} />
      </View>}
      {(step === 'device' || step === 'backup') && <View style={{ gap: 10 }}>
        <AuthButton label="Verify code" disabled={step === 'device' ? code.length !== 6 : !code.trim()} busy={loading}
          onPress={() => void run(async () => {
            if (!role) return;
            const result = await verifyPasswordCode(identifier.trim(), role, code.trim(), step);
            show('password');
            setResetToken(result.resetToken);
          })} />
        <AuthButton label={step === 'device' ? 'Use a backup code' : 'Back to account'} outline
          disabled={loading} onPress={() => show(step === 'device' ? 'backup' : 'account')} />
      </View>}
      {step === 'password' && <AuthButton label="Save new password" busy={loading} disabled={!password || !confirmation}
        onPress={() => void run(async () => {
          if (password !== confirmation) throw new Error('The passwords must match.');
          if ([...password].length < 8) throw new Error('Use at least 8 characters for your new password.');
          await resetPassword(resetToken, password, confirmation);
          show('done');
        })} />}
      {step === 'done' && <AuthButton label="Back to log in" onPress={login} />}
    </View>
  </AuthCanvas>;
}
