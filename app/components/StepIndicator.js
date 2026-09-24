import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/tokens";

/**
 * Shows progress through a multi-step form as a row of connected segments,
 * plus a "Step X of Y" label with the current step's title.
 *
 * Usage:
 *   <StepIndicator currentStep={0} totalSteps={4} title="Your name" />
 */
export function StepIndicator({ currentStep, totalSteps, title }) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={styles.track}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isComplete = index < currentStep;
          const isActive = index === currentStep;

          return (
            <View
              key={index}
              style={[
                styles.segment,
                {
                  backgroundColor:
                    isComplete || isActive ? colors.primary : colors.border,
                  opacity: isActive ? 1 : isComplete ? 0.6 : 0.35,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.labelRow}>
        <Text style={[styles.stepCount, { color: colors.textMuted }]}>
          Step {currentStep + 1} of {totalSteps}
        </Text>
        {title ? (
          <Text style={[styles.stepTitle, { color: colors.text }]}>{title}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  track: {
    flexDirection: "row",
    gap: spacing.xs ?? 4,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  labelRow: {
    marginTop: spacing.sm,
  },
  stepCount: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 2,
  },
});