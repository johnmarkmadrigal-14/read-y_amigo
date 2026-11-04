import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

import { DocumentWebView } from "../../components/documentExtraction/DocumentWebView";
import { detectDocumentKind, fetchDocumentText } from "../../components/documentExtraction/source";

interface FileViewerProps {
  url: string;
  name: string;
  mimeType?: string;
  height?: number;
}

export function FileViewer(props: FileViewerProps) {
  return <FileViewerSession key={JSON.stringify([props.url, props.name, props.mimeType])} {...props} />;
}
function FileViewerSession({ url, name, mimeType, height = 440 }: FileViewerProps) {
  const { colors } = useTheme();
  const kind = detectDocumentKind(name, mimeType);

  const [loading, setLoading] = useState(kind !== "unsupported");
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (kind === "text") {
      fetchDocumentText(url)
        .then((t) => {
          if (cancelled) return;
          setText(t);
          setLoading(false);
        })
        .catch((e) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : "Couldn't load the file.");
          setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [url, kind]);

  return (
    <View
      style={[
        styles.card,
        { height, backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {kind === "image" && (
        <Image
          source={{ uri: url }}
          style={styles.fill}
          resizeMode="contain"
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setError("Couldn't load this image.");
            setLoading(false);
          }}
        />
      )}

      {(kind === "pdf" || kind === "docx") && (
        <DocumentWebView uri={url} kind={kind}
          onDone={() => setLoading(false)}
          onError={message => { setError(message); setLoading(false); }} />
      )}

      {kind === "text" && text !== null && (
        <ScrollView nestedScrollEnabled contentContainerStyle={{ padding: spacing.md }}>
          <Text style={[typography.reading.md, { color: colors.text }]}>{text}</Text>
        </ScrollView>
      )}

      {kind === "unsupported" && (
        <View style={styles.centered}>
          <Ionicons name="document-outline" size={36} color={colors.textMuted} />
          <Text
            style={[
              typography.reading.sm,
              { color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
            ]}
          >
            This file type can&apos;t be previewed in the app yet. Supported types: PDF, Word (.docx),
            images, and text files.
          </Text>
        </View>
      )}

      {error && (
        <View style={[styles.overlay, { backgroundColor: colors.surface }]}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.retry} />
          <Text
            style={[
              typography.reading.sm,
              { color: colors.text, textAlign: "center", marginTop: spacing.sm },
            ]}
          >
            {error}
          </Text>
        </View>
      )}

      {loading && !error && (
        <View style={[styles.overlay, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.reading.sm, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Opening file...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 3,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  fill: {
    flex: 1,
    backgroundColor: "transparent",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
});