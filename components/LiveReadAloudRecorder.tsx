import { HeadingLabel, TextAction } from "../app/components/InterfaceChrome";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ExpoSpeechRecognitionModule as Speech, useSpeechRecognitionEvent } from "expo-speech-recognition";
import type { ReadAloudRecorderProps } from "../app/components/ReadAloudRecorder";
import { AudioPlayerBar, formatTime } from "../app/components/AudioPlayerBar";
import { Button } from "../app/components/Button";
import { useTheme } from "../app/theme/ThemeProvider";
import { radius, spacing, typography } from "../app/theme/tokens";
import { Screen } from "../app/components/Screen";
import { FileViewer } from "../app/components/FileViewer";
import { readingPosition, readingSentences, readingWords } from "./readingProgress";

type Phase = "idle" | "countdown" | "starting" | "recording" | "finishing";

// Speech recognition owns the microphone AND saves the audio; running a second
// expo-audio recorder alongside it can interrupt either recording on native devices.
export function LiveReadAloudRecorder({ onSubmit, onUseAudioOnly, readingTitle, readingText, readingAttachment }: ReadAloudRecorderProps & { onUseAudioOnly: () => void }) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(3);
  const [locale, setLocale] = useState("en-US");
  const [transcript, setTranscript] = useState("");
  const [uri, setUri] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
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
  const duration = useRef(0);
  const active = useRef(false);
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
        if (active.current) { setPhase("finishing"); Speech.stop(); }
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

  useSpeechRecognitionEvent("start", () => {
    if (!mounted.current) return;
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
    if (!mounted.current) return;
    duration.current = startedAt.current ? Date.now() - startedAt.current : 0;
    setElapsed(duration.current);
    // Only audioend guarantees the saved file is ready for playback/upload.
    if (event.uri && duration.current >= 1000) setUri(event.uri);
    else setError("No usable audio was saved. Please read again.");
  });
  useSpeechRecognitionEvent("end", () => {
    active.current = false;
    if (mounted.current) {
      setPhase("idle");
      if (closeAfterStop.current) { closeAfterStop.current = false; setReaderOpen(false); }
    }
  });
  useSpeechRecognitionEvent("error", (event) => {
    if (mounted.current && event.error !== "aborted") {
      setError(`${event.message || "Speech recognition stopped."} You can replay any saved audio or read again.`);
    }
  });

  async function start() {
    setReaderOpen(true);
    setTranscriptExpanded(false);
    setFollowing(true);
    setFollowTranscript(true);
    const attempt = ++generation.current;
    setPhase("starting");
    setError("");
    try {
      permissionPending.current = true;
      let permission;
      try { permission = await Speech.requestPermissionsAsync(); }
      finally { permissionPending.current = false; }
      if (!mounted.current || generation.current !== attempt) return;
      if (!permission.granted) throw new Error("Allow microphone and speech recognition access in Settings to show your reading words.");
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
      duration.current = 0;
      setElapsed(0);
      active.current = true;
      setPhase("starting");
      Speech.start({ lang: locale, interimResults: true, continuous: true,
        recordingOptions: { persist: true, outputSampleRate: 16000, outputEncoding: "pcmFormatInt16" } });
    } catch (err) {
      active.current = false;
      if (mounted.current) { setPhase("idle"); setError(err instanceof Error ? err.message : "Couldn't start speech recognition."); }
    }
  }

  function submit() {
    if (!uri || submitting) return;
    const savedUri = uri;
    Alert.alert("Submit your reading?", "Your teacher will be able to listen to it.", [
      { text: "Not yet", style: "cancel" },
      { text: "Submit", onPress: async () => {
        setSubmitting(true);
        try {
          await onSubmit({ uri: savedUri, durationMs: duration.current, transcript, transcriptLocale: locale });
          if (mounted.current) setSubmitted(true);
        } catch (err) {
          if (mounted.current) setError(err instanceof Error ? err.message : "Couldn't submit. Your recording is still available.");
        } finally { if (mounted.current) setSubmitting(false); }
      } },
    ]);
  }

  function closeReader() {
    if (submitting || phase === "finishing") return;
    if (active.current) {
      Alert.alert("Stop reading?", "Your recording will be kept for review.", [
        { text: "Keep reading", style: "cancel" },
        { text: "Stop reading", onPress: () => {
          closeAfterStop.current = true;
          setPhase("finishing");
          Speech.stop();
        } },
      ]);
      return;
    }
    generation.current += 1;
    setPhase("idle");
    setReaderOpen(false);
  }

  if (submitted) return <Text style={{ color: colors.text }}>Great reading! Your teacher can listen now.</Text>;
  return <View style={{ gap: spacing.md }}>
    <Text style={{ color: colors.textMuted }}>Words appear as you read. Automatic transcription may make mistakes.</Text>
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
    <Modal visible={readerOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeReader}>
      <Screen>
        <View style={styles.reader}>
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
                style={[typography.reading.md, {
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
              <Text selectable style={[typography.reading.md, { color: colors.text }]}>
                {transcript || "Your words will appear here…"}
              </Text>
            </ScrollView>
            {!followTranscript && <TextAction icon="arrow-down" accessibilityRole="button" onPress={() => {
              setFollowTranscript(true); scroll.current?.scrollToEnd({ animated: true });
            }}><Text style={[typography.reading.sm, { color: colors.primary }]}>Follow latest words</Text></TextAction>}
          </View>

          <View style={styles.controls}>
            {!!error && <ScrollView style={styles.error}><Text accessibilityRole="alert"
              style={[typography.reading.sm, { color: colors.text }]}>{error}</Text></ScrollView>}
            {phase === "countdown" && <Text style={[typography.display.lg, { color: colors.primary }]}>Get ready… {count}</Text>}
            {phase === "starting" && <Text style={[typography.reading.sm, { color: colors.text }]}>Starting microphone…</Text>}
            {phase === "recording" && <>
              <Text style={[typography.display.md, { color: colors.text }]}>Reading · {formatTime(elapsed)}</Text>
              <Button label="Stop reading" onPress={() => { setPhase("finishing"); Speech.stop(); }} />
            </>}
            {phase === "finishing" && <Text style={[typography.reading.sm, { color: colors.text }]}>Finishing your recording…</Text>}
            {phase === "idle" && !!uri && <AudioPlayerBar source={uri} title="Your reading" subtitle={formatTime(elapsed)} />}
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


