import './polyfills';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as worker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import mammoth from 'mammoth/mammoth.browser.js';
import DOMPurify from 'dompurify';

// PDF.js sees the bundled handler and uses its in-process worker. No worker URL,
// dynamic import, CDN, or eval is needed in an offline native WebView.
globalThis.pdfjsWorker = worker;
const post = (message) => window.ReactNativeWebView.postMessage(JSON.stringify(message));
window.renderFile = async ({ base64, kind, mimeType, extractOnly, requestId }) => {
  const send = (message) => post({ ...message, requestId });
  let task;
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    if (kind === 'auto') {
      const header = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
      if (header.includes('%PDF-')) kind = 'pdf';
      else if (bytes[0] === 0x50 && bytes[1] === 0x4b) kind = 'docx';
      else if (mimeType?.toLowerCase().startsWith('text/plain')) kind = 'text';
      else throw new Error('Unknown file type. For .doc or images, convert the file or paste its passage.');
    }
    const content = document.getElementById('content');
    content.replaceChildren();
    if (kind === 'text') {
      const text = new TextDecoder().decode(bytes);
      content.textContent = text;
      send({ type: 'done', text });
    } else if (kind === 'pdf') {
      task = pdfjs.getDocument({ data: bytes, isEvalSupported: false,
        useWasm: false, useSystemFonts: true, isOffscreenCanvasSupported: false,
        isImageDecoderSupported: false, disableWorkerRendering: true });
      const pdf = await task.promise;
      const pages = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        if (extractOnly) {
          const text = await page.getTextContent();
          pages.push(text.items.map((item) => typeof item.str === 'string'
            ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim());
        } else {
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(window.devicePixelRatio || 1, 2) * window.innerWidth / base.width });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width; canvas.height = viewport.height;
          content.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext('2d'), canvas, viewport }).promise;
        }
        page.cleanup();
      }
      send({ type: 'done', text: pages.join('\n\n') });
    } else {
      if (extractOnly) {
        const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
        content.textContent = result.value;
        content.style.whiteSpace = 'pre-wrap';
        send({ type: 'done', text: result.value });
      } else {
        const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
        content.innerHTML = DOMPurify.sanitize(result.value, {
          USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'button'],
          FORBID_ATTR: ['style'], ALLOW_UNKNOWN_PROTOCOLS: false,
        });
        // Keep formatting, embedded images and tables, but no active or remote content.
        content.querySelectorAll('a').forEach(link => link.removeAttribute('href'));
        content.querySelectorAll('img').forEach(image => {
          if (!/^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(image.getAttribute('src') || '')) image.remove();
        });
        send({ type: 'done' });
      }
    }
  } catch (error) {
    send({ type: 'error', message: 'Could not read this document. Paste the passage manually or convert it to a text PDF or DOCX. ' + String(error?.message || error) });
  } finally {
    if (task) await task.destroy();
  }
};
post({ type: 'ready' });
