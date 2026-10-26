import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

type Kind = "image" | "pdf" | "docx" | "text" | "unsupported";

interface FileViewerProps {
  url: string;
  name: string;
  mimeType?: string;
  height?: number;
}

function detectKind(name: string, mimeType?: string): Kind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png"].includes(ext) || mimeType?.startsWith("image/")) return "image";
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "txt" || mimeType === "text/plain") return "text";
  return "unsupported";
}

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't download the file (error ${res.status}).`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Couldn't read the file."));
    reader.readAsDataURL(blob);
  });
}

// ── HTML rendered inside the WebView ────────────────────────────────────────
// The app downloads the file and injects it as base64, so the WebView never
// needs to reach your local server. The PDF/Word libraries load from a CDN,
// so the phone needs internet access for those two file types.

const PDF_HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"/>
<style>
  body{margin:0;background:#EDEDED;font-family:sans-serif}
  #pages canvas{display:block;width:100%;height:auto;margin:0 0 8px;background:#fff}
  #msg{padding:16px;color:#555;font-size:14px}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head><body>
<div id="msg">Loading...</div><div id="pages"></div>
<script>
function post(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));}
window.renderFile=async function(b64){
  try{
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    var bin=atob(b64);var bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    var pdf=await pdfjsLib.getDocument({data:bytes}).promise;
    document.getElementById('msg').style.display='none';
    var container=document.getElementById('pages');
    var ratio=Math.min(window.devicePixelRatio||1,2);
    for(var p=1;p<=pdf.numPages;p++){
      var page=await pdf.getPage(p);
      var base=page.getViewport({scale:1});
      var vp=page.getViewport({scale:(window.innerWidth/base.width)*ratio});
      var c=document.createElement('canvas');
      c.width=vp.width;c.height=vp.height;
      container.appendChild(c);
      await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
      if(p===1)post({type:'done'});
    }
  }catch(e){post({type:'error',message:'Could not open this PDF. Check your internet connection. '+String(e)});}
};
post({type:'ready'});
</script></body></html>`;

const DOCX_HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"/>
<style>
  body{margin:0;padding:16px;background:#fff;color:#222;font-family:sans-serif;font-size:18px;line-height:1.6}
  img{max-width:100%;height:auto}
  table{border-collapse:collapse;max-width:100%}
  td,th{border:1px solid #ccc;padding:6px}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
</head><body>
<div id="content">Loading...</div>
<script>
function post(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));}
window.renderFile=async function(b64){
  try{
    var bin=atob(b64);var bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    var result=await mammoth.convertToHtml({arrayBuffer:bytes.buffer});
    document.getElementById('content').innerHTML=result.value||'<p>This document is empty.</p>';
    post({type:'done'});
  }catch(e){post({type:'error',message:'Could not open this Word file. Check your internet connection. '+String(e)});}
};
post({type:'ready'});
</script></body></html>`;

export function FileViewer({ url, name, mimeType, height = 440 }: FileViewerProps) {
  const { colors } = useTheme();
  const kind = detectKind(name, mimeType);

  const [loading, setLoading] = useState(kind !== "unsupported");
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const dataRef = useRef<string | null>(null);
  const injectedRef = useRef(false);

  // Sends the file to the WebView once BOTH the page is ready and the
  // download has finished, in whichever order they happen.
  const tryInject = useCallback(() => {
    if (readyRef.current && dataRef.current && !injectedRef.current) {
      injectedRef.current = true;
      webRef.current?.injectJavaScript(
        `window.renderFile(${JSON.stringify(dataRef.current)}); true;`
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setText(null);
    setLoading(kind !== "unsupported");
    readyRef.current = false;
    dataRef.current = null;
    injectedRef.current = false;

    if (kind === "pdf" || kind === "docx") {
      fetchAsBase64(url)
        .then((b64) => {
          if (cancelled) return;
          dataRef.current = b64;
          tryInject();
        })
        .catch((e) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : "Couldn't load the file.");
          setLoading(false);
        });
    } else if (kind === "text") {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`Couldn't download the file (error ${res.status}).`);
          return res.text();
        })
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
  }, [url, kind, tryInject]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "ready") {
        readyRef.current = true;
        tryInject();
      } else if (msg.type === "done") {
        setLoading(false);
      } else if (msg.type === "error") {
        setError(msg.message);
        setLoading(false);
      }
    } catch {
      // ignore malformed messages
    }
  };

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
        <WebView
          key={url}
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html: kind === "pdf" ? PDF_HTML : DOCX_HTML }}
          onMessage={handleMessage}
          javaScriptEnabled
          nestedScrollEnabled
          setSupportMultipleWindows={false}
          // Stops the page from navigating away (keeps the learner in the app).
          onShouldStartLoadWithRequest={(req) => !/^https?:/i.test(req.url)}
          style={styles.fill}
        />
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
            This file type can't be previewed in the app yet. Supported types: PDF, Word (.docx),
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
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
});