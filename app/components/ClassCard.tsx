import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { radius, spacing, typography } from "../theme/tokens";

const SHADOW_OFFSET = 5;

// Google Classroom's cards keep a fixed banner height regardless of title
// length, and a fixed body height regardless of description length, so a
// row/grid of cards always lines up evenly. BANNER_HEIGHT is intentionally
// shorter than the flat variant's inline title - Classroom's banner is a
// compact colored strip, not a big hero area.
const BANNER_HEIGHT = 88;
const BANNER_BODY_MIN_HEIGHT = 76;

interface ClassCardProps {
  title: string;
  subtitle: string;
  fill: string;
  shadowColor: string;
  textColor: string;
  onPress: () => void;
  // Optional: when provided, swaps the static book icon for a tappable
  // overflow ("...") button. Used by the class-management screen to open
  // an edit/archive menu without disturbing existing callers that don't
  // pass this prop (e.g. plain usages elsewhere), which keep the icon.
  onMenuPress?: () => void;
  // Optional: extra content rendered below the subtitle, e.g. a join-code
  // badge and learner count on the management screen.
  footer?: React.ReactNode;
  // "flat" (default) is the original look: title inline with the icon,
  // over the fill color. "banner" adds a Classroom-style colored header
  // strip with the title in it (in shadowColor, with white text) above a
  // fill-colored body for the subtitle/footer - same sticker/shadow-block
  // frame either way, just restructured content. Opt-in so existing
  // "flat" usages render identically to before.
  variant?: "flat" | "banner";
}

export function ClassCard({
  title,
  subtitle,
  fill,
  shadowColor,
  textColor,
  onPress,
  onMenuPress,
  footer,
  variant = "flat",
}: ClassCardProps) {
  const pressed = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * SHADOW_OFFSET }],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: withTiming(pressed.value ? 0 : 1, { duration: 80 }),
  }));

  const menuButton = onMenuPress ? (
    // Own Pressable, so tapping the menu doesn't also trigger the card's
    // onPress (RN's responder system resolves this to the innermost
    // handler).
    <Pressable onPress={onMenuPress} hitSlop={10} style={styles.menuButton}>
      <Ionicons
        name="ellipsis-vertical"
        size={20}
        color={variant === "banner" ? "#FFFFFF" : shadowColor}
      />
    </Pressable>
  ) : (
    <Ionicons
      name="book-outline"
      size={20}
      color={variant === "banner" ? "#FFFFFF" : shadowColor}
    />
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (pressed.value = withTiming(1, { duration: 80 }))}
      onPressOut={() => (pressed.value = withTiming(0, { duration: 80 }))}
      style={styles.wrapper}
    >
      <Animated.View
        style={[styles.shadowBlock, { backgroundColor: shadowColor }, shadowStyle]}
      />
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: fill, borderColor: shadowColor },
          variant === "banner" && styles.cardNoPadding,
          cardStyle,
        ]}
      >
        {variant === "banner" ? (
          <>
            <View style={[styles.banner, { backgroundColor: shadowColor }]}>
              <Text
                style={[styles.bannerTitle, { color: "#FFFFFF" }]}
                numberOfLines={2}
              >
                {title}
              </Text>
              {menuButton}
            </View>
            <View style={styles.bannerBody}>
              <Text style={[typography.reading.sm, { color: textColor }]} numberOfLines={2}>
                {subtitle}
              </Text>
              <View style={styles.bannerFooterSlot}>{footer}</View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.row}>
              <Text style={[typography.display.md, { color: textColor }]}>{title}</Text>
              {menuButton}
            </View>
            <Text style={[typography.reading.sm, { color: shadowColor, marginTop: 6 }]}>
              {subtitle}
            </Text>
            {footer}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 3,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  // Banner variant removes the card's own padding since the banner strip
  // and body below it each manage their own spacing (the banner needs to
  // reach the card's rounded edges flush, which outer padding would break).
  cardNoPadding: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: "hidden",
  },
  banner: {
    height: BANNER_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  // Classroom's banner title runs noticeably larger than the body copy and
  // wraps to a second line rather than shrinking - matched here instead of
  // reusing typography.display.md (sized for the flat variant's smaller
  // header row).
  bannerTitle: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
    flex: 1,
    flexShrink: 1,
    paddingRight: spacing.sm,
  },
  bannerBody: {
    minHeight: BANNER_BODY_MIN_HEIGHT,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    justifyContent: "space-between",
  },
  // Keeps the footer (code badge / learner count / restore button) pinned
  // toward the bottom of the fixed-height body, so a one-line vs. two-line
  // subtitle doesn't shift it up and down between cards.
  bannerFooterSlot: {
    marginTop: spacing.sm,
  },
  shadowBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    top: SHADOW_OFFSET,
    bottom: -SHADOW_OFFSET,
    borderRadius: radius.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuButton: {
    padding: 2,
  },
});