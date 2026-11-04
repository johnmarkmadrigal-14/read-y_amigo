import { useEffect } from 'react';
import { View } from 'react-native';
import { DocumentWebView } from './DocumentWebView';
import { detectDocumentKind, DocumentSource, fetchDocumentText } from './source';

export function DocumentExtractor({ source, onText, onError }: {
  source: DocumentSource;
  onText: (text: string) => void;
  onError: (message: string) => void;
}) {
  const kind = detectDocumentKind(source.name, source.mimeType);
  useEffect(() => {
    let active = true;
    if (kind === 'text') {
      fetchDocumentText(source.uri).then(text => { if (active) onText(text); })
        .catch(() => { if (active) onError('Could not read this text file. Paste the passage below.'); });
    } else if (kind === 'image' || /\.doc(?:[?#]|$)/i.test(source.name)) {
      onError(kind === 'image' ? 'Images need teacher input. Paste or type the passage below.'
        : 'For .doc or other file types, convert to DOCX or a text PDF, or paste the passage below.');
    }
    return () => { active = false; };
    // Source changes remount the extractor; callbacks belong to that session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.uri, source.name, source.mimeType, kind]);
  if (kind === 'text' || kind === 'image' || /\.doc(?:[?#]|$)/i.test(source.name)) return null;
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}>
    <DocumentWebView uri={source.uri} kind={kind === 'unsupported' ? 'auto' : kind} extractOnly onText={onText} onError={onError} />
  </View>;
}
