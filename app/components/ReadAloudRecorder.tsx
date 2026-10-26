import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";
import { AudioPlayerBar, formatTime, useAuthorizedAudioSource } from "./AudioPlayerBar";
import { Button } from "./Button";

interface ReadAloudRecorderProps {
  // Uploads the recording. Should throw if the upload fails.
  onSubmit: (recording: { uri: string; durationMs: number }) => Promise<void>;
  // Set when the learner has already submitted this classwork.
  submitted?: {
    audioPath: string;
    durationMs?: number;
    submittedAt: string;
  } | null;
}

const MIN_DURATION_MS = 1000;

export function ReadAloudRecorder({ onSubmit, submitted }: ReadAloudRecorderProps) {
  const { colors } = useTheme();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submittedSource = useAuthorizedAudioSource(submitted?.audioPath);

  const durationRef = useRef(0);
  durationRef.current = recorderState.durationMillis;

  const isRecording = recorderState.isRecording;

  const startRecording = async () => {
    setBusy(true);
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Microphone needed",
          "Please allow microphone access so the app can hear you read."
        );
        return;
      }

      setRecordingUri(null);

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      Alert.alert(
        "Couldn't start recording",
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  };

  const stopRecording = async () => {
    setBusy(true);
    try {
      const elapsed = durationRef.current;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

      const uri = recorder.uri;

      if (!uri || elapsed < MIN_DURATION_MS) {
        Alert.alert("That was too short", "Tap Read now and read the passage out loud.");
        return;
      }

      setRecordingUri(uri);
      setDurationMs(elapsed);
    } catch (err) {
      Alert.alert(
        "Couldn't stop recording",
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleMainPress = async () => {
    if (submitting) return;
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleSubmit = () => {
    if (!recordingUri || submitting) return;

    Alert.alert(
      "Submit your reading?",
      "Your teacher will be able to listen to it. You can't change it after you submit.",
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            setSubmitting(true);
            try {
              await onSubmit({ uri: recordingUri, durationMs });
            } catch (err) {
              Alert.alert(
                "Couldn't submit",
                err instanceof Error ? err.message : "Something went wrong."
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // ── Already submitted ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <View>
        <View style={[styles.submittedBadge, { backgroundColor: colors.success }]}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={[typography.display.md, { color: "#fff" }]}>Submitted</Text>
        </View>

        <AudioPlayerBar
          source={submittedSource}
          title="Your submitted reading"
          subtitle={`${
            submitted.durationMs ? `Reading time: ${formatTime(submitted.durationMs)}  •  ` : ""
          }${new Date(submitted.submittedAt).toLocaleDateString()}`}
        />
      </View>
    );
  }

  const hasRecording = !!recordingUri && !isRecording;

  return (
    <View>
      <Button
        label={isRecording ? "Stop reading" : hasRecording ? "Read again" : "Read now"}
        variant={isRecording ? "secondary" : "primary"}
        onPress={handleMainPress}
        loading={busy}
        disabled={submitting}
      />

      {isRecording && (
        <View
          style={[
            styles.recordingCard,
            { backgroundColor: colors.surface, borderColor: colors.retry },
          ]}
        >
          <View style={[styles.recDot, { backgroundColor: colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.display.md, { color: colors.text }]}>Recording...</Text>
            <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
              Read the passage out loud. Tap "Stop reading" when you're done.
            </Text>
          </View>
          <Text style={[typography.display.md, { color: colors.primary }]}>
            {formatTime(recorderState.durationMillis)}
          </Text>
        </View>
      )}

      {hasRecording && (
        <>
          <View style={{ marginTop: spacing.lg }}>
            <AudioPlayerBar
              source={recordingUri}
              title="Your reading"
              subtitle={`Reading time: ${formatTime(durationMs)}`}
            />
          </View>

          <Button
            label={submitting ? "Submitting..." : "Submit"}
            variant="primary"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            style={{ marginTop: spacing.lg }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  recordingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 3,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  recDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  submittedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
});