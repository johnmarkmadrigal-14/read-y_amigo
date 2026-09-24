import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { ApiReports, getReports } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

// Same palette used in classes.tsx/dashboard, kept in sync so a class's
// color is consistent everywhere it appears in the app.
const CARD_PALETTE = [
  { fill: "#E1F5EE", shadow: "#0F6E56", text: "#04342C" },
  { fill: "#FAECE7", shadow: "#993C1D", text: "#4A1B0C" },
  { fill: "#EEEDFE", shadow: "#534AB7", text: "#26215C" },
];

// Static border-and-offset-shadow block styled to match ClassCard's look
// (radius.lg, 3px border, offset shadow rectangle behind it). Not
// animated/pressable since these rows aren't tappable - just the same
// visual language as ClassCard applied to a non-interactive block.
function StatCard({
  fill,
  shadowColor,
  children,
}: {
  fill: string;
  shadowColor: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.statCardWrapper}>
      <View style={[styles.statCardShadow, { backgroundColor: shadowColor }]} />
      <View style={[styles.statCard, { backgroundColor: fill, borderColor: shadowColor }]}>
        {children}
      </View>
    </View>
  );
}

export default function ReportsScreen() {
  const { colors } = useTheme();

  const [reports, setReports] = useState<ApiReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setError(null);
    try {
      const data = await getReports();
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  if (loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={[typography.reading.sm, { color: colors.text, textAlign: "center" }]}>
            {error}
          </Text>
          <Pressable
            onPress={loadReports}
            style={[styles.retryButton, { borderColor: colors.retry }]}
          >
            <Text style={[typography.reading.sm, { color: colors.retryText, fontWeight: "600" }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const { totals, classes } = reports!;
  // Comprehension bars are scaled against 100 (it's already 0-100).
  // Streak bars are scaled against the highest streak currently in the
  // list, since "days" has no fixed ceiling the way a percentage does.
  const maxStreak = Math.max(1, ...classes.map((c) => c.avgStreakDays));

  return (
    <Screen scroll>
      <Text style={[typography.display.lg, { color: colors.text, marginBottom: spacing.lg }]}>
        Reports
      </Text>

      {classes.length === 0 ? (
        <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
          Once you have classes with enrolled learners, their reading progress will show up
          here.
        </Text>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <SummaryTile label="Classes" value={String(totals.classCount)} colors={colors} />
            <SummaryTile
              label="Total learners"
              value={String(totals.totalLearners)}
              colors={colors}
            />
            <SummaryTile
              label="Avg comprehension"
              value={`${totals.avgComprehension}%`}
              colors={colors}
            />
            <SummaryTile label="Avg streak" value={`${totals.avgStreakDays}d`} colors={colors} />
          </View>

          <Text
            style={[
              typography.display.sm,
              { color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
            ]}
          >
            By class
          </Text>

          {classes.map((classItem, index) => {
            const palette = CARD_PALETTE[index % CARD_PALETTE.length];
            const comprehensionPct = Math.min(100, classItem.avgComprehension);
            const streakPct = Math.min(100, (classItem.avgStreakDays / maxStreak) * 100);

            return (
              <StatCard key={classItem._id} fill={palette.fill} shadowColor={palette.shadow}>
                <View style={styles.statCardHeader}>
                  <Text style={[typography.display.md, { color: palette.text }]}>
                    {classItem.title}
                  </Text>
                  <Text style={[typography.reading.sm, { color: palette.shadow, opacity: 0.85 }]}>
                    {classItem.learnerCount} learner
                    {classItem.learnerCount === 1 ? "" : "s"}
                  </Text>
                </View>

                {classItem.learnerCount === 0 ? (
                  <Text
                    style={[
                      typography.reading.sm,
                      { color: palette.shadow, opacity: 0.7, marginTop: spacing.sm },
                    ]}
                  >
                    No learners enrolled yet.
                  </Text>
                ) : (
                  <>
                    <BarStat
                      label="Comprehension"
                      valueLabel={`${classItem.avgComprehension}%`}
                      percent={comprehensionPct}
                      trackColor={palette.shadow}
                      textColor={palette.text}
                    />
                    <BarStat
                      label="Reading streak"
                      valueLabel={`${classItem.avgStreakDays}d avg`}
                      percent={streakPct}
                      trackColor={palette.shadow}
                      textColor={palette.text}
                    />
                  </>
                )}
              </StatCard>
            );
          })}
        </>
      )}
    </Screen>
  );
}

function SummaryTile({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { text: string; textMuted: string; border: string };
}) {
  return (
    <View style={[styles.summaryTile, { borderColor: colors.border }]}>
      <Text style={[typography.display.md, { color: colors.text }]}>{value}</Text>
      <Text style={[typography.reading.sm, { color: colors.textMuted, marginTop: 2 }]}>
        {label}
      </Text>
    </View>
  );
}

function BarStat({
  label,
  valueLabel,
  percent,
  trackColor,
  textColor,
}: {
  label: string;
  valueLabel: string;
  percent: number;
  trackColor: string;
  textColor: string;
}) {
  return (
    <View style={styles.barStat}>
      <View style={styles.barStatLabelRow}>
        <Text style={[typography.reading.sm, { color: textColor, opacity: 0.8 }]}>{label}</Text>
        <Text style={[typography.reading.sm, { color: textColor, fontWeight: "700" }]}>
          {valueLabel}
        </Text>
      </View>
      <View style={[styles.barTrack, { borderColor: trackColor }]}>
        <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: trackColor }]} />
      </View>
    </View>
  );
}

const SHADOW_OFFSET = 5;

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  retryButton: {
    borderWidth: 2,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  summaryTile: {
    flexGrow: 1,
    flexBasis: "45%",
    borderWidth: 1.5,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  statCardWrapper: {
    marginBottom: spacing.md,
  },
  statCardShadow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: SHADOW_OFFSET,
    bottom: -SHADOW_OFFSET,
    borderRadius: radius.lg,
  },
  statCard: {
    borderRadius: radius.lg,
    borderWidth: 3,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  barStat: {
    marginTop: spacing.md,
  },
  barStatLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  barTrack: {
    height: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: radius.full,
  },
});