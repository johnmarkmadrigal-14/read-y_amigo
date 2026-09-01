import { router } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { Button } from "./components/Button";
import { Screen } from "./components/Screen";
import { useTheme } from "./theme/ThemeProvider";
import { spacing, typography } from "./theme/tokens";

export default function Index() {
  const { colors } = useTheme();

  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(16);
  const titleOpacity = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 7, stiffness: 140 });
    logoOpacity.value = withSpring(1, { damping: 12 });
    titleTranslateY.value = withDelay(120, withSpring(0, { damping: 10, stiffness: 120 }));
    titleOpacity.value = withDelay(120, withSpring(1, { damping: 12 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleTranslateY.value }],
    opacity: titleOpacity.value,
  }));

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Animated.Image
          source={require("../assets/images/logo.png")}
          style={[
            {
              width: 180,
              height: 180,
              marginBottom: spacing.xs,
            },
            logoStyle,
          ]}
          resizeMode="contain"
        />

        <Animated.Text
          style={[
            typography.display.xl,
            {
              color: colors.primary,
              textAlign: "center",
              marginBottom: spacing.xs,
            },
            titleStyle,
          ]}
        >
          READ-Y AMIGO
        </Animated.Text>

        <Text
          style={{
            ...typography.reading.sm,
            color: colors.textMuted,
            textAlign: "center",
            marginBottom: spacing.xxl,
            paddingHorizontal: spacing.lg,
          }}
        >
          Learn, read, and improve together.
        </Text>

        <View style={{ width: "85%", gap: spacing.md }}>
          <Button
            label="Create account"
            variant="primary"
            onPress={() => router.push("/auth/choose-role")}
          />
          <Button
            label="Log in"
            variant="secondary"
            onPress={() => router.push("/auth/login")}
          />
        </View>
      </View>
    </Screen>
  );
}