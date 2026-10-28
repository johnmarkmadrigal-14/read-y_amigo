import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, StyleSheet, Text, View } from "react-native";
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

type Phase = "idle" | "countdown" | "recording" | "paused";

const MIN_DURATION_MS = 1000;
const COUNTDOWN_FROM = 3;
const BAR_COUNT = 28;
const METER_FLOOR_DB = -60; // anything quieter than this shows as silence

const ENCOURAGEMENTS = [
  "Read the passage out loud. Take your time!",
  "Great start! Keep going!",
  "You're doing awesome!",
  "Nice and clear. Keep reading!",
  "Almost there, you've got this!",
  "Wonderful reading!",
];

const recorderOptions = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Haptics can fail on some devices/simulators — never let that break recording.
const tap = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
  Haptics.impactAsync(style).catch(() => {});
};
const success = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

// Turns the recorder's dB reading (about -160..0) into a 0..1 bar height.
function levelFromDb(db?: number | null) {
  if (typeof db !== "number" || !isFinite(db)) return 0;
  const clamped = Math.max(METER_FLOOR_DB, Math.min(0, db));
  return (clamped - METER_FLOOR_DB) / -METER_FLOOR_DB;
}

// ── Small animated pieces ────────────────────────────────────────────────────

function CountdownNumber({ value, color }: { value: number; color: string }) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.setValue(0.4);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [value, scale, opacity]);

  return (
    <Animated.Text
      style={[
        typography.display.md,
        { fontSize: 72, lineHeight: 84, color, transform: [{ scale }], opacity },
      ]}
    >
      {value}
    </Animated.Text>
  );
}

function Waveform({ levels, color, dim }: { levels: number[]; color: string; dim: boolean }) {
  return (
    <View style={styles.waveform}>
      {levels.map((level, i) => (
        <View
          key={i}
          style={[
            styles.waveBar,
            {
              backgroundColor: color,
              opacity: dim ? 0.35 : 1,
              height: 4 + level * 44,
            },
          ]}
        />
      ))}
    </View>
  );
}

function RadioWaveform({ color }: { color: string }) {
  const bars = [8, 15, 23, 12, 30, 19, 38, 24, 14, 32, 42, 21, 11, 28, 36, 17, 25, 10, 33, 20, 40, 15, 27, 12, 35, 22, 14, 29, 18, 8];

  return (
    <View style={styles.radioWaveform} accessibilityLabel="Audio waveform">
      {bars.map((height, index) => (
        <View
          key={index}
          style={[
            styles.radioWaveBar,
            {
              height,
              backgroundColor: color,
              opacity: 0.55 + (height / 100),
            },
          ]}
        />
      ))}
    </View>
  );
}

function Celebration({ color, textColor }: { color: string; textColor: string }) {
  const stars = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      120,
      stars.map((v) =>
        Animated.spring(v, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true })
      )
    ).start();
  }, [stars]);

  return (
    <View style={styles.celebration}>
      <View style={styles.starRow}>
        {stars.map((v, i) => (
          <Animated.View
            key={i}
            style={{
              transform: [
                { scale: v },
                { translateY: i === 2 ? -10 : i === 1 || i === 3 ? -4 : 0 },
              ],
            }}
          >
            <Ionicons name="star" size={i === 2 ? 44 : 34} color={color} />
          </Animated.View>
        ))}
      </View>
      <Text style={[typography.display.md, { color: textColor, textAlign: "center" }]}>
        Great reading! Your teacher can listen now.
      </Text>
    </View>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function ReadAloudRecorder({ onSubmit, submitted }: ReadAloudRecorderProps) {
  const { colors } = useTheme();

  const recorder = useAudioRecorder(recorderOptions);
  // Poll faster than the default so the volume meter feels live.
  const recorderState = useAudioRecorderState(recorder, 100);

  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0));
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const submittedSource = useAuthorizedAudioSource(submitted?.audioPath);

  const durationRef = useRef(0);
  durationRef.current = recorderState.durationMillis;

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isActive = phase === "recording" || phase === "paused";

  // Pulsing record dot — only pulses while actually recording.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (phase !== "recording") {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  // Live volume meter: push the newest level, drop the oldest.
  useEffect(() => {
    if (phase !== "recording") return;
    const level = levelFromDb(recorderState.metering);
    setLevels((prev) => [...prev.slice(1), level]);
  }, [recorderState.metering, phase]);

  // Auto-hide the celebration after a few seconds.
  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(false), 6000);
    return () => clearTimeout(t);
  }, [celebrate]);

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
      setLevels(Array(BAR_COUNT).fill(0));

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();

      // 3... 2... 1... so the learner is ready before we start listening.
      setPhase("countdown");
      for (let n = COUNTDOWN_FROM; n >= 1; n--) {
        if (!mountedRef.current) return;
        setCountdown(n);
        tap(Haptics.ImpactFeedbackStyle.Light);
        await sleep(800);
      }
      if (!mountedRef.current) return;

      recorder.record();
      setPhase("recording");
      tap(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err) {
      setPhase("idle");
      Alert.alert(
        "Couldn't start recording",
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  };

  const pauseRecording = () => {
    try {
      recorder.pause();
      setPhase("paused");
      tap(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      Alert.alert(
        "Couldn't pause",
        err instanceof Error ? err.message : "Something went wrong."
      );
    }
  };

  const resumeRecording = () => {
    try {
      recorder.record();
      setPhase("recording");
      tap(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      Alert.alert(
        "Couldn't resume",
        err instanceof Error ? err.message : "Something went wrong."
      );
    }
  };

  const stopRecording = async () => {
    setBusy(true);
    try {
      const elapsed = durationRef.current;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      tap(Haptics.ImpactFeedbackStyle.Medium);

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
      setPhase("idle");
      setBusy(false);
    }
  };

  const handleMainPress = async () => {
    if (submitting || busy) return;
    await startRecording();
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
              success();
              setCelebrate(true);
            } catch (err) {
              Alert.alert(
                "Couldn't submit",
                err instanceof Error ? err.message : "Something went wrong."
              );
            } finally {
              if (mountedRef.current) setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // ── Already submitted ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <View style={styles.submittedContainer}>
        {celebrate && <Celebration color={colors.primary} textColor={colors.text} />}
        <View style={styles.submittedIntro}>
          <View style={[styles.submittedIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="checkmark-circle" size={22} color={colors.successText} />
          </View>
          <View style={styles.submittedIntroText}>
            <Text style={[typography.display.md, { color: colors.text }]}>Reading submitted</Text>
            <Text style={[typography.reading.sm, { color: colors.textMuted, lineHeight: 20 }]}>Your recording is saved and ready to play.</Text>
          </View>
        </View>
        <View style={styles.submittedDetails}>
          {typeof submitted.durationMs === "number" && (
            <View style={[styles.submittedDetail, { backgroundColor: colors.surface }]}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <View style={styles.submittedDetailText}>
                <Text style={[styles.submittedDetailLabel, { color: colors.textMuted }]}>READING TIME</Text>
                <Text style={[styles.submittedDetailValue, { color: colors.text }]}>{formatTime(submitted.durationMs)}</Text>
              </View>
            </View>
          )}
          <View style={[styles.submittedDetail, { backgroundColor: colors.surface }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <View style={styles.submittedDetailText}>
              <Text style={[styles.submittedDetailLabel, { color: colors.textMuted }]}>SUBMITTED ON</Text>
              <Text style={[styles.submittedDetailValue, { color: colors.text }]} numberOfLines={1}>{new Date(submitted.submittedAt).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.playbackSection,
            {
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: spacing.md,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <View style={styles.waveformPlayerAlignment}>
            <RadioWaveform color={colors.primary} />
          </View>
          <AudioPlayerBar
            source={submittedSource}
            title=" "
            subtitle=" "
          />
        </View>
      </View>
    );
  }

  // Submit succeeded but the parent hasn't swapped to the "submitted" view yet.
  if (celebrate) {
    return <Celebration color={colors.primary} textColor={colors.text} />;
  }

  const hasRecording = !!recordingUri && phase === "idle";

  const seconds = Math.floor(recorderState.durationMillis / 1000);
  const message =
    phase === "paused"
      ? "Paused. Tap Resume when you're ready."
      : ENCOURAGEMENTS[Math.floor(seconds / 6) % ENCOURAGEMENTS.length];

  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] });

  return (
    <View>
      {phase === "idle" && (
        <Button
          label={hasRecording ? "Read again" : "Read now"}
          variant="primary"
          onPress={handleMainPress}
          loading={busy}
          disabled={submitting}
        />
      )}

      {phase === "countdown" && (
        <View
          style={[
            styles.countdownCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
            Get ready to read...
          </Text>
          <CountdownNumber value={countdown} color={colors.primary} />
        </View>
      )}

      {isActive && (
        <>
          <View
            style={[
              styles.recordingCard,
              {
                backgroundColor: colors.surface,
                borderColor: phase === "paused" ? colors.border : colors.retry,
              },
            ]}
          >
            <View style={styles.recDotWrap}>
              <Animated.View
                style={[
                  styles.recDot,
                  {
                    backgroundColor: colors.primary,
                    opacity: phase === "paused" ? 0.4 : dotOpacity,
                    transform: [{ scale: phase === "paused" ? 1 : dotScale }],
                  },
                ]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.display.md, { color: colors.text }]}>
                {phase === "paused" ? "Paused" : "Recording..."}
              </Text>
              <Text style={[typography.reading.sm, { color: colors.textMuted }]}>{message}</Text>
            </View>
            <Text style={[typography.display.md, { color: colors.primary }]}>
              {formatTime(recorderState.durationMillis)}
            </Text>
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Waveform levels={levels} color={colors.primary} dim={phase === "paused"} />
          </View>

          <View style={styles.controlsRow}>
            <View style={{ flex: 1 }}>
              <Button
                label={phase === "paused" ? "Resume" : "Pause"}
                variant="secondary"
                onPress={phase === "paused" ? resumeRecording : pauseRecording}
                disabled={busy}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Stop reading"
                variant="primary"
                onPress={stopRecording}
                loading={busy}
              />
            </View>
          </View>
        </>
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
  countdownCard: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  recordingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 3,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  recDotWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  recDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  waveform: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  waveBar: {
    width: 5,
    borderRadius: 3,
  },
  controlsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  celebration: {
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  submittedContainer: { gap: spacing.md },
  submittedIntro: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  submittedIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  submittedIntroText: { flex: 1, gap: 3 },
  submittedDetails: { flexDirection: "row", gap: spacing.sm },
  submittedDetail: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.md, padding: spacing.sm },
  submittedDetailText: { flex: 1, minWidth: 0, gap: 2 },
  submittedDetailLabel: { fontSize: 10, lineHeight: 14, fontWeight: "700", letterSpacing: 0.4 },
  submittedDetailValue: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  playbackSection: { marginTop: spacing.xs, justifyContent: "center", gap: spacing.sm },
  waveformPlayerAlignment: { width: "100%", paddingHorizontal: spacing.xs, justifyContent: "center" },
  radioWaveform: { width: "100%", height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 2 },
  radioWaveBar: { flex: 1, maxWidth: 5, borderRadius: 3 },
});