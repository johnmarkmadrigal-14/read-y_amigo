import { ConfirmationOverlay, useConfirmationController } from './ConfirmationDialog';
import { useReadingPreferences } from "./ReadingPreferences";
import { HeadingLabel, TextAction } from "../app/components/InterfaceChrome";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { ExpoSpeechRecognitionModule as Speech, useSpeechRecognitionEvent } from "expo-speech-recognition";
import type { ReadAloudRecorderProps } from "../app/components/ReadAloudRecorder";
import { AudioPlayerBar, formatTime } from "../app/components/AudioPlayerBar";
import { Button } from "../app/components/Button";
import { useTheme } from "../app/theme/ThemeProvider";
import { radius, spacing, typography } from "../app/theme/tokens";
import { Screen } from "../app/components/Screen";
import { FileViewer } from "../app/components/FileViewer";
import { readingPosition, readingSentences, readingWords } from "./readingProgress";

import { ReadingMeasurement as MeasurementPreview } from "./ReadingMeasurement";
import { validateReadingMeasurement } from "./readingRate";
import type { ReadingMeasurement } from "./readingRate";

type Phase = "idle" | "countdown" | "starting" | "recording" | "finishing";

// Speech recognition owns the microphone AND saves the audio; running a second
// expo-audio recorder alongside it can interrupt either recording on native devices.
export function LiveReadAloudRecorder({ onSubmit, onUseAudioOnly, readingTitle, readingText, readingAttachment, readingPassage }: ReadAloudRecorderProps & { onUseAudioOnly: () => void }) {
  const { request, confirm, close } = useConfirmationController();
  const { colors } = useTheme();
  const reading = useReadingPreferences();
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(3);
  const [locale, setLocale] = useState("en-US");
  const [onDevice, setOnDevice] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [uri, setUri] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [measurement, setMeasurement] = useState<ReadingMeasurement>();
  const [interrupted, setInterrupted] = useState(false);
  const [take, setTake] = useState(0);
  const takeRef = useRef(0);
  const [metadataError, setMetadataError] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [following, setFollowing] = useState(true);
  const [passageHeight, setPassageHeight] = useState(0);
  const [sentenceOffsets, setSentenceOffsets] = useState<Record<number, number>>({});
  const [followTranscript, setFollowTranscript] = useState(true);
  const passageScroll = useRef<ScrollView>(null);
  const closeAfterStop = useRef(false);
  const finalized = useRef("");
  const startedAt = useRef(0);
  const active = useRef(false);
  const awaitingAudio = useRef(false);
  const stopRequested = useRef(false);
  const mounted = useRef(true);
  const permissionPending = useRef(false);
  const generation = useRef(0);
  const scroll = useRef<ScrollView>(null);
  const words = useMemo(() => readingWords(readingText ?? ""), [readingText]);
  const sentences = useMemo(() => readingSentences(readingText ?? ""), [readingText]);
  const position = useMemo(() => readingPosition(words, transcript), [words, transcript]);
  const sentenceIndex = sentences.findIndex((sentence) =>
    position >= sentence.wordStart && position < sentence.wordEnd);

  useEffect(() => {
    if (!readerOpen || !following || transcriptExpanded || sentenceIndex < 0) return;
    const y = sentenceOffsets[sentenceIndex];
    if (y !== undefined) passageScroll.current?.scrollTo({
      y: Math.max(0, y - passageHeight * 0.25), animated: true,
    });
  }, [readerOpen, following, transcriptExpanded, sentenceIndex, sentenceOffsets, passageHeight]);

  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active" && !permissionPending.current) {
        generation.current += 1;
        if (active.current) { setInterrupted(true); setPhase("finishing"); stopRequested.current = true; Speech.stop(); }
        else setPhase("idle");
      }
    });
    return () => {
      mounted.current = false;
      generation.current += 1;
      listener.remove();
      if (active.current) Speech.abort();
    };
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt.current), 200);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "finishing") return;
    const timer = setTimeout(() => {
      if (!active.current && awaitingAudio.current) {
        awaitingAudio.current = false;
        setPhase("idle");
        setError("No saved audio was returned. Please read again.");
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [phase]);

  useSpeechRecognitionEvent("start", () => {
    if (!mounted.current || !active.current) return;
    startedAt.current = Date.now();
    setPhase("recording");
  });
  useSpeechRecognitionEvent("result", (event) => {
    if (!active.current) return;
    const text = event.results[0]?.transcript ?? "";
    if (event.isFinal) finalized.current = [finalized.current, text].filter(Boolean).join(" ");
    setTranscript(event.isFinal ? finalized.current : [finalized.current, text].filter(Boolean).join(" "));
  });
  useSpeechRecognitionEvent("audioend", (event) => {
    if (!mounted.current || !awaitingAudio.current) return;
    awaitingAudio.current = false;
    // Speech owns the only microphone. Load the finished file in a playback player.
    if (event.uri) setUri(event.uri);
    else setError("No usable audio was saved. Please read again.");
    if (!active.current) {
      setPhase(awaitingAudio.current ? "finishing" : "idle");
      if (!awaitingAudio.current && closeAfterStop.current) { closeAfterStop.current = false; setReaderOpen(false); }
    }
  });
  useSpeechRecognitionEvent("end", () => {
    if (active.current && !stopRequested.current) setInterrupted(true);
    setTranscript(finalized.current); // Compare only final recognition results, never a leftover interim hypothesis.
    active.current = false;
    if (mounted.current) {
      setPhase(awaitingAudio.current ? "finishing" : "idle");
      if (!awaitingAudio.current && closeAfterStop.current) { closeAfterStop.current = false; setReaderOpen(false); }
    }
  });
  useSpeechRecognitionEvent("error", (event) => {
    if (mounted.current && event.error !== "aborted") {
      setInterrupted(true);
      setError(`${event.message || "Speech recognition stopped."} You can replay any saved audio or read again.`);
    }
  });

  async function start() {
    setReaderOpen(true);
    setTranscriptExpanded(false);
    setFollowing(reading.preferences.followReading);
    setFollowTranscript(true);
    const attempt = ++generation.current;
    takeRef.current += 1;
    setTake(takeRef.current);
    setUri(null);
    setDurationMs(0);
    setMeasurement(undefined);
    setInterrupted(false);
    setMetadataError(false);
    stopRequested.current = false;
    setPhase("starting");
    setError("");
    try {
      permissionPending.current = true;
      let permission;
      try { permission = await Speech.requestPermissionsAsync(); }
      finally { permissionPending.current = false; }
      if (!mounted.current || generation.current !== attempt) return;
      if (!permission.granted) throw new Error("Allow microphone and speech recognition access in Settings to show your reading words.");
      if (onDevice) {
        if (!Speech.supportsOnDeviceRecognition()) throw new Error("On-device recognition is unavailable on this phone. Use standard recognition or audio-only recording.");
        const supported = await Speech.getSupportedLocales({});
        if (!mounted.current || generation.current !== attempt) return;
        const canonical = (value: string) => value.toLowerCase().replace(/_/g, '-');
        if (!supported.installedLocales.some(value => canonical(value) === canonical(locale)))
          throw new Error("The selected language could not be verified as installed for on-device recognition. Install its speech model in device settings, use standard recognition, or record audio only.");
      }
      setPhase("countdown");
      for (let n = 3; n > 0; n--) {
        setCount(n);
        await new Promise(resolve => setTimeout(resolve, 800));
        if (!mounted.current || generation.current !== attempt) return;
      }
      setUri(null);
      setTranscript("");
      passageScroll.current?.scrollTo({ y: 0, animated: false });
      finalized.current = "";
      startedAt.current = 0;
      setElapsed(0);
      active.current = true;
      awaitingAudio.current = true;
      setPhase("starting");
      Speech.start({ lang: locale, requiresOnDeviceRecognition: onDevice, interimResults: true, continuous: true,
        recordingOptions: { persist: true, outputSampleRate: 16000, outputEncoding: "pcmFormatInt16" } });
    } catch (err) {
      active.current = false;
      awaitingAudio.current = false;
      if (mounted.current) { setPhase("idle"); setError(err instanceof Error ? err.message : "Couldn't start speech recognition."); }
    }
  }

  function submit() {
    if (!uri || submitting || phase !== "idle") return;
    const savedUri = uri;
    confirm({
      title: "Submit your reading?",
      message: transcript.trim()
        ? "Your teacher will receive your recording and transcript for review."
        : "Your teacher will receive your recording for review.",
      icon: "paper-plane-outline",
      confirmLabel: "Submit",
      onConfirm: async () => {
        setSubmitting(true);
        try {
          await onSubmit({ uri: savedUri, durationMs, transcript, transcriptLocale: locale, recordingInterrupted: interrupted,
            readingMeasurement: measurement && readingPassage && !validateReadingMeasurement(readingPassage, { ...measurement, interrupted: false }, durationMs)
              ? { ...measurement, interrupted } : undefined });
          if (mounted.current) setSubmitted(true);
        } catch (err) {
          if (mounted.current) setError(err instanceof Error ? err.message : "Couldn't submit. Your recording is still available.");
        } finally { if (mounted.current) setSubmitting(false); }
      },
    });
  }

  function closeReader() {
    if (submitting || phase === "finishing") return;
    if (active.current) {
      confirm({
        title: "Stop reading?",
        message: "Your recording will be kept for review.",
        icon: "stop-circle-outline",
        cancelLabel: "Keep reading",
        confirmLabel: "Stop reading",
        onConfirm: () => {
          closeAfterStop.current = true;
          setPhase("finishing");
          stopRequested.current = true; Speech.stop();
        },
      });
      return;
    }
    generation.current += 1;
    setPhase("idle");
    setReaderOpen(false);
  }

  if (submitted) return <Text style={{ color: colors.text }}>Great reading! Your teacher can listen now.</Text>;
  return <View style={{ gap: spacing.md }}>
    <Text style={{ color: colors.textMuted }}>Words appear as you read. Automatic transcription may make mistakes.</Text>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <Switch accessibilityLabel="Require on-device speech recognition" value={onDevice} onValueChange={setOnDevice} disabled={phase !== 'idle' || submitting || !!uri} />
      <Text style={{ color: colors.text, flex: 1 }}>Require on-device recognition (installed language required)</Text>
    </View>
    <Text style={{ color: colors.textMuted }}>Standard recognition may use online speech services. On-device mode stops if an installed language cannot be verified; it does not silently switch online.</Text>
    <View style={{ flexDirection: "row", gap: 12 }}>
      {[["en-US", "English"], ["fil-PH", "Filipino"]].map(([code, label]) =>
        <Pressable key={code} disabled={phase !== "idle" || submitting} onPress={() => setLocale(code)}
          accessibilityRole="radio" accessibilityState={{ checked: locale === code }}
          style={{ padding: 12, borderWidth: 2, borderRadius: 12, borderColor: locale === code ? colors.primary : colors.border }}>
          <Text style={{ color: colors.text }}>{label}</Text>
        </Pressable>)}
    </View>
    <Button label={uri ? "Review your reading" : "Read now"} onPress={() => uri ? setReaderOpen(true) : start()} disabled={submitting || phase !== "idle"} />
    {!uri && <Button label="Use audio recording only" variant="secondary" onPress={onUseAudioOnly} disabled={submitting || phase !== "idle"} />}
    <Modal visible={readerOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => request ? close(false) : closeReader()}>
      <Screen>
        <View style={styles.reader} accessibilityElementsHidden={!!request}
          importantForAccessibility={request ? "no-hide-descendants" : "auto"}>
          <View style={styles.heading}>
            <HeadingLabel icon="book-outline" style={[typography.display.md, styles.title, { color: colors.text }]} numberOfLines={1}>
              {readingTitle || "Read aloud"}
            </HeadingLabel>
            <TextAction icon="close" tone="close" onPress={closeReader} disabled={submitting || phase === "finishing"}
              accessibilityRole="button" accessibilityLabel="Close reading view" hitSlop={8}>
              <Text style={[typography.reading.sm, { color: colors.primary }]}>Close</Text>
            </TextAction>
          </View>

          {!transcriptExpanded && <View style={[styles.passage, styles.passageCard,
            { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.heading, styles.sectionHeader, { borderColor: colors.border }]}>
              <HeadingLabel icon={readingText ? "book-outline" : "attach-outline"} embedded style={[typography.reading.sm, { color: colors.text, fontWeight: "700" }]}>
                {readingText ? "Reading passage" : "Attached file"}
              </HeadingLabel>
              {!!readingText && <TextAction icon="arrow-down" onPress={() => setFollowing(value => !value)} accessibilityRole="button"
                accessibilityState={{ selected: following }}>
                <Text style={[typography.reading.sm, { color: colors.primary }]}>{following ? "Auto-scroll on" : "Follow reading"}</Text>
              </TextAction>}
            </View>
            {!!readingText ? <ScrollView ref={passageScroll}
              style={styles.flex}
              onScrollBeginDrag={() => setFollowing(false)}
              onLayout={event => setPassageHeight(event.nativeEvent.layout.height)}
              contentContainerStyle={styles.passageContent}>
              {sentences.map((sentence, index) => <Text key={index} selectable
                onLayout={event => {
                  const y = event.nativeEvent.layout.y;
                  setSentenceOffsets(previous => previous[index] === y ? previous : { ...previous, [index]: y });
                }}
                style={[typography.reading.md, reading.textStyle, {
                  color: index === sentenceIndex ? colors.secondaryText : colors.text,
                  backgroundColor: index === sentenceIndex ? colors.highlight : "transparent",
                }]}>{sentence.text}</Text>)}
            </ScrollView> : readingAttachment ? <View style={styles.flex}
              onLayout={event => setPassageHeight(event.nativeEvent.layout.height)}>
              <FileViewer {...readingAttachment} height={Math.max(1, passageHeight)} />
            </View> : <ScrollView style={styles.flex}>
              <Text style={[typography.reading.sm, { color: colors.textMuted }]}>No passage was provided. You can still record your reading.</Text>
            </ScrollView>}
          </View>}

          <View style={[styles.transcript, transcriptExpanded && styles.flex,
            { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.heading, styles.sectionHeader, { borderColor: colors.border }]}>
              <HeadingLabel icon="mic-outline" embedded style={[typography.display.md, { color: colors.text }]}>{uri && phase === "idle" ? "Transcript" : "Live transcript"}</HeadingLabel>
              <TextAction icon="expand-outline" onPress={() => setTranscriptExpanded(value => !value)} accessibilityRole="button"
                accessibilityState={{ expanded: transcriptExpanded }}>
                <Text style={[typography.reading.sm, { color: colors.primary }]}>{transcriptExpanded ? "Collapse" : "Expand"}</Text>
              </TextAction>
            </View>
            <ScrollView ref={scroll} style={transcriptExpanded ? styles.flex : styles.transcriptPreview}
              onScrollBeginDrag={() => setFollowTranscript(false)}
              onContentSizeChange={() => { if (followTranscript) scroll.current?.scrollToEnd({ animated: true }); }}>
              <Text selectable style={[typography.reading.md, reading.textStyle, { color: colors.text }]}>
                {transcript || "Your words will appear here…"}
              </Text>
            </ScrollView>
            {!followTranscript && <TextAction icon="arrow-down" accessibilityRole="button" onPress={() => {
              setFollowTranscript(true); scroll.current?.scrollToEnd({ animated: true });
            }}><Text style={[typography.reading.sm, { color: colors.primary }]}>Follow latest words</Text></TextAction>}
          </View>

          {phase === "idle" && !!uri && <ScrollView style={{ flex: 1, minHeight: 100 }} keyboardShouldPersistTaps="handled">
            {metadataError && <Text style={{ color: colors.textMuted }}>Duration could not be verified. You can still submit without WPM.</Text>}
            {readingPassage && <MeasurementPreview key={take} passage={readingPassage} durationMs={durationMs}
              interrupted={interrupted} value={measurement} onChange={setMeasurement} disabled={submitting} />}
          </ScrollView>}
          <View style={styles.controls}>
            {!!error && <ScrollView style={styles.error}><Text accessibilityRole="alert"
              style={[typography.reading.sm, { color: colors.text }]}>{error}</Text></ScrollView>}
            {phase === "countdown" && <Text style={[typography.display.lg, { color: colors.primary }]}>Get ready… {count}</Text>}
            {phase === "starting" && <Text style={[typography.reading.sm, { color: colors.text }]}>Starting microphone…</Text>}
            {phase === "recording" && <>
              <Text style={[typography.display.md, { color: colors.text }]}>Reading · {formatTime(elapsed)}</Text>
              <Button label="Stop reading" onPress={() => { setPhase("finishing"); stopRequested.current = true; Speech.stop(); }} />
            </>}
            {phase === "finishing" && <Text style={[typography.reading.sm, { color: colors.text }]}>Finishing your recording…</Text>}
            {phase === "idle" && !!uri && <AudioPlayerBar key={take} source={uri} title="Your reading"
              subtitle={durationMs > 0 ? formatTime(durationMs) : "Duration not verified"}
              onDurationLoaded={ms => { if (mounted.current && takeRef.current === take) { setDurationMs(ms); setMetadataError(false); } }}
              onLoadError={() => { if (mounted.current && takeRef.current === take) { setDurationMs(0); setMetadataError(true); } }} />}
            {phase === "idle" && <View style={styles.heading}>
              <View style={styles.flex}><Button label={uri ? "Read again" : "Read now"} onPress={start} disabled={submitting} variant={uri ? "secondary" : "primary"} /></View>
              {!!uri && <View style={styles.flex}><Button label="Submit" onPress={submit} loading={submitting} disabled={submitting} /></View>}
            </View>}
            <Text style={[typography.reading.sm, styles.hint, { color: colors.textMuted }]}>
              {readingText ? "Highlight follows recognized words; it does not grade pronunciation." : "Automatic transcription may make mistakes."}
            </Text>
          </View>
        </View>
      </Screen>
      {request && <ConfirmationOverlay request={request} close={close} />}
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  reader: { flex: 1, gap: spacing.sm },
  flex: { flex: 1, minHeight: 0 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  sectionHeader: { borderBottomWidth: 1, paddingBottom: spacing.sm, flexWrap: "wrap" },
  title: { flex: 1 },
  passage: { flex: 1, minHeight: 0, gap: spacing.sm },
  passageCard: { borderWidth: 3, borderRadius: radius.lg, padding: spacing.sm },
  passageContent: { paddingBottom: spacing.md },
  transcript: { flexShrink: 0, borderWidth: 3, borderRadius: radius.lg, padding: spacing.sm, gap: spacing.sm },
  transcriptPreview: { height: 96, flexGrow: 0 },
  controls: { flexShrink: 0, gap: spacing.sm },
  error: { maxHeight: 60 },
  hint: { fontSize: 12, lineHeight: 16 },
});


