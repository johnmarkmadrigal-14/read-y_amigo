import { Pressable, StyleSheet, Text, View } from "react-native";
import { radius, spacing, typography } from "../theme/tokens";

interface SegmentedControlProps {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
  colors: {
    surface: string;
    primary: string;
    primaryText: string;
    textMuted: string;
    border: string;
  };
}

export function SegmentedControl({
  options,
  selected,
  onSelect,
  colors,
}: SegmentedControlProps) {
  return (
    <View style={[styles.track, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {options.map((option) => {
        const isActive = option === selected;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.segment,
              isActive && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                typography.reading.sm,
                {
                  color: isActive ? colors.primaryText : colors.textMuted,
                  fontWeight: "600",
                  textAlign: "center",
                },
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.xs ?? 8,
    borderRadius: radius.sm ?? 6,
  },
});