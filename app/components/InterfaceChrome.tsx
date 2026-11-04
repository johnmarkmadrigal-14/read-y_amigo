import { Ionicons } from "@expo/vector-icons";
import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import {
  Pressable, StyleSheet, Text, View,
  type PressableProps, type PressableStateCallbackType, type TextProps, type TextStyle, type ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

type TextActionProps = PressableProps & {
  icon?: IconName;
  tone?: "default" | "close";
};

// A compact secondary action. Keep event handlers, disabled state, and caller
// layout intact while sharing the app's cream/gold outlined treatment.
export function TextAction({
  children, style, icon, tone = "default", disabled, accessibilityRole = "button", ...props
}: TextActionProps) {
  const { colors } = useTheme();
  const selected = !!(props.accessibilityState?.selected || props.accessibilityState?.checked);
  const content = (state: PressableStateCallbackType) => {
    const rendered = typeof children === "function" ? children(state) : children;
    return selected ? Children.map(rendered, child =>
      isValidElement<TextProps>(child) && child.type === Text
        ? cloneElement(child, { style: [child.props.style, { color: colors.secondaryText }] })
        : child) : rendered;
  };
  return (
    <Pressable
      {...props}
      accessibilityRole={accessibilityRole}
      disabled={disabled}
      style={(state) => [
        styles.action,
        {
          backgroundColor: tone === "close" ? colors.background
            : selected ? colors.secondary : colors.surface,
          borderColor: tone === "close" ? colors.primary : colors.secondaryShadow,
        },
        typeof style === "function" ? style(state) : style,
        { opacity: disabled ? 0.45 : state.pressed ? 0.75 : 1 },
      ]}
    >
      {(state) => (
        <View style={styles.actionContent}>
          {icon && <Ionicons name={icon} size={18}
            color={tone === "close" ? colors.primary : selected ? colors.secondaryText : colors.text}
            accessible={false} />}
          {content(state)}
        </View>
      )}
    </Pressable>
  );
}

type HeadingLabelProps = TextProps & {
  icon?: IconName | null;
  embedded?: boolean;
  children?: ReactNode;
};

// Move outer layout properties off Text so adding an icon does not lose the
// original heading's margins, row flex, alignment, or size.
const outerKeys = new Set([
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight",
  "marginVertical", "marginHorizontal", "marginStart", "marginEnd",
  "flex", "flexGrow", "flexShrink", "flexBasis", "alignSelf",
  "width", "minWidth", "maxWidth",
]);

export function HeadingLabel({
  children, style, icon = "bookmark-outline", embedded = false, ...props
}: HeadingLabelProps) {
  const { colors } = useTheme();
  const flattened = StyleSheet.flatten(style) ?? {};
  const outer: Record<string, unknown> = {};
  const text: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flattened)) {
    (outerKeys.has(key) ? outer : text)[key] = value;
  }
  return (
    <View style={[
      styles.heading,
      !embedded && {
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderWidth: 2,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderColor: colors.border,
      },
      flattened.textAlign === "center" && { alignSelf: "center" },
      outer as ViewStyle,
    ]}>
      {icon && <Ionicons name={icon} size={18} color={colors.text} accessible={false} />}
      <Text {...props} accessibilityRole={props.accessibilityRole ?? "header"}
        style={[styles.headingText, { color: colors.text }, text as TextStyle]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: 40,
    minWidth: 40,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderRadius: radius.sm,
    flexShrink: 1,
    maxWidth: "100%",
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    gap: 6,
  },
  headingText: { flexShrink: 1, minWidth: 0 },
});

