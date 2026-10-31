import { useEffect, useRef, useState } from "react";
import { AppState, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { ExpoSpeechRecognitionModule as Speech, useSpeechRecognitionEvent } from "expo-speech-recognition";
import type { ReadAloudRecorderProps } from "../app/components/ReadAloudRecorder";
import { AudioPlayerBar, formatTime } from "../app/components/AudioPlayerBar";
import { Button } from "../app/components/Button";
import { useTheme } from "../app/theme/ThemeProvider";

type Phase = "idle" | "countdown" | "starting" | "recording" | "finishing";

// Speech recognition owns the microphone AND saves the audio; running a second
// expo-audio recorder alongside it can interrupt either recording on native devices.
export function LiveReadAloudRecorder({ onSubmit, onUseAudioOnly }: ReadAloudRecorderProps & { onUseAudioOnly: () => void }) {
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
  const finalized = useRef("");
  const startedAt = useRef(0);
  const duration = useRef(0);
  const active = useRef(false);
  const mounted = useRef(true);
  const permissionPending = useRef(false);
  const generation = useRef(0);
  const scroll = useRef<ScrollView>(null);

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
    if (mounted.current) setPhase("idle");
  });
  useSpeechRecognitionEvent("error", (event) => {
    if (mounted.current && event.error !== "aborted") {
      setError(`${event.message || "Speech recognition stopped."} You can replay any saved audio or read again.`);
    }
  });

  async function start() {
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

  if (submitted) return <Text style={{ color: colors.text }}>Great reading! Your teacher can listen now.</Text>;
  return <View style={{ gap: 16 }}>
    <Text style={{ color: colors.textMuted }}>Words appear as you read. Automatic transcription may make mistakes.</Text>
    <View style={{ flexDirection: "row", gap: 12 }}>
      {[["en-US", "English"], ["fil-PH", "Filipino"]].map(([code, label]) =>
        <Pressable key={code} disabled={phase !== "idle" || submitting} onPress={() => setLocale(code)}
          accessibilityRole="radio" accessibilityState={{ checked: locale === code }}
          style={{ padding: 12, borderWidth: 2, borderRadius: 12, borderColor: locale === code ? colors.primary : colors.border }}>
          <Text style={{ color: colors.text }}>{label}</Text>
        </Pressable>)}
    </View>
    {phase === "countdown" && <Text style={{ color: colors.text, fontSize: 32 }}>Get ready… {count}</Text>}
    {phase === "starting" && <Text style={{ color: colors.text }}>Starting microphone…</Text>}
    {phase === "recording" && <>
      <Text style={{ color: colors.text }}>Reading · {formatTime(elapsed)}</Text>
      <Button label="Stop reading" onPress={() => { setPhase("finishing"); Speech.stop(); }} />
    </>}
    {phase === "finishing" && <Text style={{ color: colors.text }}>Finishing your recording…</Text>}
    <Text style={{ color: colors.text, fontWeight: "700" }}>Live transcript</Text>
    <ScrollView ref={scroll} style={{ maxHeight: 240 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
      <Text selectable style={{ color: colors.text, fontSize: 20, lineHeight: 32 }}>{transcript || "Your words will appear here…"}</Text>
    </ScrollView>
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.text }}>{error}</Text>}
    {phase === "idle" && <Button label={uri ? "Read again" : "Read now"} onPress={start} disabled={submitting} />}
    {phase === "idle" && !uri && <Button label="Use audio recording only" variant="secondary" onPress={onUseAudioOnly} disabled={submitting} />}
    {phase === "idle" && !!uri && <>
      <AudioPlayerBar source={uri} title="Your reading" subtitle={formatTime(elapsed)} />
      <Button label="Submit" onPress={submit} loading={submitting} disabled={submitting} />
    </>}
  </View>;
}
