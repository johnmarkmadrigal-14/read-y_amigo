import { useState } from "react";
import { Alert, Pressable, Switch, Text, TextInput, View } from "react-native";
import { HeadingLabel } from "../app/components/InterfaceChrome";
import { Button } from "../app/components/Button";
import { ApiSubmission, reviewReadingRate } from "../app/lib/api";
import { useTheme } from "../app/theme/ThemeProvider";
import { radius, spacing, typography } from "../app/theme/tokens";

// Timing is reviewed against the saved recording; silence within the reading
// interval is retained. The server validates bounds and calculates the result.
export function ReadingRateReview({ submission, onSaved }: {
  submission: ApiSubmission;
  onSaved: (submission: ApiSubmission) => void;
}) {
  const { colors } = useTheme();
  const passage = submission.readingPassage;
  const measurement = submission.readingMeasurement;
  const [completed, setCompleted] = useState(measurement?.completed ?? false);
  const [words, setWords] = useState(String(measurement?.wordsRead ?? ""));
  const [start, setStart] = useState(String((measurement?.startMs ?? 0) / 1000));
  const [end, setEnd] = useState(String((measurement?.endMs ?? submission.audio.durationMs ?? 0) / 1000));
  const [saving, setSaving] = useState(false);
  const [showPassage, setShowPassage] = useState(false);
  const [error, setError] = useState("");
  const inputStyle = {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    color: colors.text, padding: spacing.sm, minHeight: 44,
  };
  const input = (label: string, value: string, onChangeText: (text: string) => void) => (
    <View style={{ flex: 1, minWidth: 100, gap: spacing.xs }}>
      <Text style={[typography.reading.sm, { color: colors.text }]}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText}
        keyboardType="decimal-pad" editable={!saving} style={inputStyle} />
    </View>
  );
  async function save() {
    if (!passage) return;
    const startSeconds = start.trim() ? Number(start) : NaN;
    const endSeconds = end.trim() ? Number(end) : NaN;
    const wordsRead = completed ? passage.wordCount : words.trim() ? Number(words) : NaN;
    const audioMs = submission.audio.durationMs ?? 0;
    if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || startSeconds < 0 ||
        endSeconds <= startSeconds || Math.round(endSeconds * 1000) > audioMs ||
        !Number.isInteger(wordsRead) || wordsRead < 1 || wordsRead > passage.wordCount ||
        (!completed && wordsRead >= passage.wordCount)) {
      setError("Enter a valid reading interval within the recording and the number of passage words read. A partial reading must be shorter than the full passage.");
      return;
    }
    setSaving(true); setError("");
    try {
      const updated = await reviewReadingRate(submission._id, {
        completed, wordsRead, startMs: Math.round(startSeconds * 1000),
        endMs: Math.round(endSeconds * 1000), interrupted: submission.recordingInterrupted || measurement?.interrupted || false,
      });
      onSaved(updated);
      Alert.alert("Reading speed reviewed", "The reading time and word count have been saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the reading speed."); }
    finally { setSaving(false); }
  }
  return (
    <View style={{ gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginTop: spacing.sm }}>
      <HeadingLabel icon="speedometer-outline" style={{ color: colors.text, fontWeight: "700" }}>Reading speed review</HeadingLabel>
      {submission.readingRate && <Text style={[typography.display.md, { color: colors.primary }]}>
        {submission.readingRate.wpm.toFixed(1)} WPM · {submission.readingRate.status === "reviewed" ? "Teacher reviewed" : "Provisional"}
      </Text>}
      {!passage?.confirmed ? <Text style={[typography.reading.sm, { color: colors.textMuted }]}>This recording has no confirmed passage snapshot. Reading speed is unavailable for this older submission.</Text>
        : !submission.audio.durationVerified ? <Text style={[typography.reading.sm, { color: colors.textMuted }]}>The saved audio duration could not be verified. Reading speed is unavailable; you can still listen to the recording.</Text>
        : (submission.recordingInterrupted || measurement?.interrupted) ? <Text style={[typography.reading.sm, { color: colors.textMuted }]}>This recording was paused or interrupted. Ask for a continuous reading to measure speed; the audio remains available for review.</Text>
        : <>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showPassage }} onPress={() => setShowPassage(v => !v)}>
            <Text style={[typography.reading.sm, { color: colors.primary }]}>{showPassage ? "Hide" : "View"} confirmed passage · {passage.wordCount} words</Text>
          </Pressable>
          {showPassage && <Text selectable style={[typography.reading.md, { color: colors.text }]}>{passage.text}</Text>}
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Listen before confirming. Adjust only the start and end of the reading, keeping hesitations inside the interval. Count passage words covered, including misread words; do not use transcript length.</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Switch accessibilityLabel="Learner completed the passage" value={completed} onValueChange={setCompleted} disabled={saving} />
            <Text style={[typography.reading.sm, { color: colors.text, flex: 1 }]}>Completed the full passage</Text>
          </View>
          {!completed && input("Passage words read", words, setWords)}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {input("Start (seconds)", start, setStart)}
            {input("End (seconds)", end, setEnd)}
          </View>
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>Recording: {((submission.audio.durationMs ?? 0) / 1000).toFixed(3)} seconds. WPM = words read ÷ reading seconds × 60.</Text>
          {!!error && <Text accessibilityRole="alert" style={[typography.reading.sm, { color: colors.retryText }]}>{error}</Text>}
          <Button label="Confirm and save reading speed" onPress={save} loading={saving} disabled={saving} />
        </>}
    </View>
  );
}
