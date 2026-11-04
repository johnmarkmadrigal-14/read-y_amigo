# Local document extraction

## Integration

- Teacher creation publishes `readingPassage: { text, wordCount, countMethod: 'automatic' | 'manual', confirmed: true, tokenizerVersion: 'v1' }` for every new reading assignment.
- Typed editor changes synchronize `readingText`. Both payload strings are trimmed identically. File canonical text remains separate from the original attachment.
- Teacher details display the confirmed canonical passage/count; original attachments remain supplementary. Typed legacy readings still display `readingText`.
- Review resets on source/file/material/type/modal changes, including switching away and back; text and count edits always unset confirmation. Download cancellation, source session keys, request IDs, settled guards, and editor unmount on manual input prevent stale results overwriting edits.
- Character and count limits are 100,000. Oversized extraction is rejected with a shorter-passage paste instruction, rather than silently truncating and permitting confirmation. Manual counts must be positive whole numbers no greater than 100,000.
- PDF/image scans with no text, image uploads, legacy `.doc`, errors, and timeouts all allow teacher paste/type input. OCR and automatic heading/question classification are deliberately not performed: teachers remove non-passage material and confirm the exact text/count.
- Existing material URLs are resolved through `getFileUrl`. Opaque filenames are identified by PDF/ZIP signatures or text/plain response MIME, without relying on the material title having an extension. Arbitrary ZIP files fail Mammoth conversion with the same manual-input fallback.

## Offline runtime

`DocumentWebView` is shared by FileViewer and hidden teacher extraction. Its HTML embeds the generated bundle as a string; Metro does not execute the browser libraries in React Native. It needs no CDN, remote worker, or separate library download. Fetching an existing remote material itself naturally still needs network access.

Pinned build dependencies: PDF.js `6.5.438` legacy browser build + matching in-process worker; Mammoth `1.13.0`; DOMPurify `3.3.1`; esbuild `0.25.12`. PDF text uses `getTextContent`. DOCX extraction uses `extractRawText`; normal viewing keeps formatted `convertToHtml` output sanitized with DOMPurify, preserves tables/bold/embedded raster images, strips active links and external images, and blocks all network content through CSP. The CSP disallows unsafe eval. PDF options explicitly disable eval, wasm, and optional worker rendering. Legacy PDF.js plus our early Promise.withResolvers/Promise.try shims support older WebViews with those Promise APIs missing.

Regenerate after dependency changes:

```sh
npm run build:documents
```

Commit the generated JS string and third-party notices with sources. No runtime generation step is required. `expo-file-system@57.0.7` is now explicit (already present transitively); cached device files use its File API. A custom development client missing this native module needs a native rebuild.

## Verification

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node scripts/documentExtraction/test-offline.cjs
npx tsc --noEmit
```

The test script creates real PDF and DOCX fixtures locally and executes the exact HTML bundle offline in Chromium. It tests text-PDF extraction, opaque PDF and DOCX signatures, image-only/no-text fallback, canvas PDF viewing, raw DOCX text/table extraction, sanitized hostile DOCX with retained tables/bold/embedded images, plain-text response MIME, legacy DOC fallback, and corrupt-PDF fallback. It removes Promise.withResolvers and Promise.try before loading the bundle. Result: 10 passing cases and zero network requests in Chromium 134.

TypeScript passed. Scoped lint passes on all new components and FileViewer. The teacher class screen retains one pre-existing `react-hooks/set-state-in-effect` error at its `loadEverything()` mount effect (outside this feature).

## Device limits / remaining physical QA

No Android/iOS device was available. Confirm cached DocumentPicker files, hidden WebView initialization, bridge timing, keyboard/editor scrolling, source switching during extraction, and large-file memory use on actual supported Android/iOS clients. esbuild targets Safari 16.4 / Chromium 110; earlier JS engines are not promised. Mobile OS WebView behavior and native-file permissions remain device QA items. PDF.js uses system fonts; unusual CJK PDFs needing external CMaps, advanced codecs, damaged/password-protected documents, or large documents can fail or have incomplete extraction/preview. The teacher review/manual-paste path is available in every case. There is a 60-second WebView-session timeout.

