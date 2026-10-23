import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

const SHADOW_OFFSET = 5;

interface RoleCardProps {
  title: string;
  fill: string;
  shadowColor: string;
  onPress: () => void;
}

function RoleCard({ title, fill, shadowColor, onPress }: RoleCardProps) {
  const pressed = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * SHADOW_OFFSET }],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: withTiming(pressed.value ? 0 : 1, { duration: 80 }),
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (pressed.value = withTiming(1, { duration: 80 }))}
      onPressOut={() => (pressed.value = withTiming(0, { duration: 80 }))}
      style={styles.cardWrapper}
    >
      <Animated.View
        style={[styles.shadowBlock, { backgroundColor: shadowColor }, shadowStyle]}
      />
      <Animated.View style={[styles.card, { backgroundColor: fill, borderColor: shadowColor }, cardStyle]}>
        <Text style={[typography.display.lg, { textAlign: "center" }]}>{title}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function ChooseRole() {
  const { colors } = useTheme();

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[typography.display.xl, { color: colors.primary, textAlign: "center", marginBottom: spacing.xs }]}>
          Who are you?
        </Text>

        <Text
          style={[
            typography.reading.sm,
            { color: colors.textMuted, textAlign: "center", marginBottom: spacing.xl },
          ]}
        >
          Choose how you will use READ-Y AMIGO.
        </Text>

        <RoleCard
          title="Teacher"
          fill={colors.surface}
          shadowColor={colors.border}
          onPress={() => router.push("/auth/teacher-signup")}
        />

        <RoleCard
          title="Learner"
          fill={colors.surface}
          shadowColor={colors.border}
          onPress={() => router.push("/auth/learner-signup")}
        />

        <Button
          label="← Back"
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginTop: spacing.md, width: "80%" }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  cardWrapper: {
    width: "80%",
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 3,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  shadowBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    top: SHADOW_OFFSET,
    bottom: -SHADOW_OFFSET,
    borderRadius: radius.lg,
  },
});