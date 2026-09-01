// components/Button.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, typography } from '../theme/tokens';

type Variant = 'primary' | 'secondary';

interface ButtonProps {
  label: string;
  variant?: Variant;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

const SHADOW_OFFSET = 5;

export function Button({
  label,
  variant = 'primary',
  onPress,
  disabled,
  loading = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const pressed = useSharedValue(0);
  const isDisabled = disabled || loading;

  const isPrimary = variant === 'primary';
  const fill = isPrimary ? colors.primary : colors.secondary;
  const shadowColor = isPrimary ? colors.primaryShadow : colors.secondaryShadow;
  const textColor = isPrimary ? colors.primaryText : colors.secondaryText;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * SHADOW_OFFSET }],
  }));

  const shadowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(pressed.value ? 0 : 1, { duration: 80 }),
  }));

  const handlePressIn = () => {
    pressed.value = withTiming(1, { duration: 80 });
  };

  const handlePressOut = () => {
    pressed.value = withTiming(0, { duration: 80 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[{ opacity: disabled ? 0.5 : 1 }, style]}
    >
      {/* offset shadow block — creates the "sticker" look */}
      <Animated.View
        style={[
          styles.shadowBlock,
          { backgroundColor: shadowColor, top: SHADOW_OFFSET },
          shadowAnimatedStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: fill, borderColor: shadowColor },
          animatedStyle,
        ]}
      >
        <Text style={[typography.display.md, styles.label, { color: textColor }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.lg,
    borderWidth: 3,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -SHADOW_OFFSET,
    borderRadius: radius.lg,
  },
  label: {
    textAlign: 'center',
  },
});