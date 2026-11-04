import { useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { DOCUMENT_HTML } from './documentHtml';
import { fetchDocumentData } from './source';

type Props = {
  uri: string;
  kind: 'pdf' | 'docx' | 'auto';
  extractOnly?: boolean;
  onText?: (text: string) => void;
  onDone?: () => void;
  onError: (message: string) => void;
};
export function DocumentWebView(props: Props) {
  // A fresh instance isolates bridge messages, downloads, and timers per source.
  return <DocumentSession key={JSON.stringify([props.uri, props.kind, props.extractOnly])} {...props} />;
}
function DocumentSession({ uri, kind, extractOnly = false, onText, onDone, onError }: Props) {
  const web = useRef<WebView>(null);
  const ready = useRef(false);
  const data = useRef<{ base64: string; mimeType?: string } | null>(null);
  const sent = useRef(false);
  const active = useRef(true);
  const settled = useRef(false);
  const callbacks = useRef({ onText, onDone, onError });
  useEffect(() => { callbacks.current = { onText, onDone, onError }; }, [onText, onDone, onError]);
  const requestId = JSON.stringify([uri, kind, extractOnly]);
  const fail = (message: string) => {
    if (!active.current || settled.current) return;
    settled.current = true;
    callbacks.current.onError(message);
  };
  const inject = () => {
    if (!active.current || !ready.current || data.current === null || sent.current || settled.current) return;
    sent.current = true;
    web.current?.injectJavaScript(`window.renderFile(${JSON.stringify({ ...data.current, kind, extractOnly, requestId })}); true;`);
    data.current = null;
  };
  useEffect(() => {
    active.current = true;
    const timer = setTimeout(() => fail('This document took too long to read. Paste the passage manually or try a smaller file.'), 60000);
    fetchDocumentData(uri).then(value => {
      if (!active.current || settled.current) return;
      data.current = value;
      inject();
    }).catch(error => fail(error instanceof Error ? error.message : 'Could not read the document.'));
    return () => { active.current = false; clearTimeout(timer); };
    // The keyed session is immutable; callbacks are kept in a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <WebView ref={web} source={{ html: DOCUMENT_HTML }} originWhitelist={['*']}
    javaScriptEnabled nestedScrollEnabled setSupportMultipleWindows={false}
    allowFileAccess={false} javaScriptCanOpenWindowsAutomatically={false}
    onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url.startsWith('about:blank#')}
    onError={() => fail('Could not open the local document reader. Paste the passage manually.')}
    onContentProcessDidTerminate={() => fail('The document reader closed. Paste the passage manually or try a smaller file.')}
    onMessage={event => {
      if (!active.current || settled.current) return;
      try {
        const message = JSON.parse(event.nativeEvent.data);
        if (message.type === 'ready') { ready.current = true; inject(); return; }
        if (message.requestId !== requestId) return;
        if (message.type === 'error') fail(String(message.message));
        if (message.type === 'done') {
          settled.current = true;
          if (extractOnly && typeof message.text === 'string') callbacks.current.onText?.(message.text);
          callbacks.current.onDone?.();
        }
      } catch { /* Ignore malformed bridge messages. */ }
    }} style={{ flex: 1, backgroundColor: 'transparent' }} />;
}
