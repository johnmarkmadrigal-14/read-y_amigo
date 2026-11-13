import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { AuthButton, AuthCanvas, BookMark } from '../components/auth/AuthUI';
import { useTheme } from './theme/ThemeProvider';
import { typography } from './theme/tokens';

import { useSession } from '../components/auth/SessionProvider';

export default function Index() {
  const { user } = useSession();
  if (user) return <Redirect href={user.role === 'teacher' ? '/teacher/dashboard' : '/learner/dashboard'} />;
  return <Welcome />;
}

function Welcome() {
  const { colors } = useTheme();
  const [book] = useState(() => new Animated.Value(0));
  const [reveal] = useState(() => new Animated.Value(0));
  const [appear] = useState(() => new Animated.Value(0));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true; let animation: Animated.CompositeAnimation | undefined;
    const show = (reduced: boolean) => {
      if (!active) return;
      if (reduced) { book.setValue(1); appear.setValue(1); reveal.setValue(1); setReady(true); return; }
      animation = Animated.sequence([
        Animated.timing(appear, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(180),
        Animated.timing(book, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(reveal, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]);
      animation.start(({ finished }) => { if (active && finished) setReady(true); });
    };
    AccessibilityInfo.isReduceMotionEnabled().then(show).catch(() => show(false));
    return () => { active = false; animation?.stop(); };
  }, [book, reveal, appear]);
  return <AuthCanvas>
    <View style={{ flex: 1, justifyContent: 'center', gap: 30 }}>
      <Animated.View accessibilityLabel="Opening book" style={{ opacity: appear, alignItems: 'center', transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) }] }}><BookMark size={200} progress={book} /></Animated.View>
      <Animated.View aria-hidden={!ready} accessibilityElementsHidden={!ready} importantForAccessibility={ready ? 'auto' : 'no-hide-descendants'} pointerEvents={ready ? 'auto' : 'none'} style={{ opacity: reveal, gap: 42 }}>
        <Text accessibilityRole="header" style={[typography.display.lg, { color: colors.primary, textAlign: 'center' }]}>READ-Y AMIGO</Text>
        <View style={{ gap: 12 }}><AuthButton label="Log in" onPress={() => router.push('/auth/login')} /><AuthButton label="Sign up" outline onPress={() => router.push('/auth/choose-role')} /></View>
      </Animated.View>
    </View>
  </AuthCanvas>;
}
