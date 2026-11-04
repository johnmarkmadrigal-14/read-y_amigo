const { Buffer } = require('node:buffer');
// PLAYWRIGHT_MODULE=/path/to/playwright node scripts/documentExtraction/test-offline.cjs
// No fixture downloads or server needed. Install Chromium once with Playwright.
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const vm = require('node:vm');
const JSZip = require('jszip');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const result = buildSync({ entryPoints: ['components/documentExtraction/documentHtml.ts'],
  bundle: true, write: false, format: 'cjs', platform: 'node' });
const moduleOutput = { exports: {} };
vm.runInNewContext(result.outputFiles[0].text, { module: moduleOutput, exports: moduleOutput.exports });
const html = moduleOutput.exports.DOCUMENT_HTML;
function pdf(text) {
  const stream = text ? `BT /F1 18 Tf 40 750 Td (${text}) Tj ET` : '0.8 g 40 700 200 100 re f';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let content = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(content.length); content += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = content.length;
  content += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('');
  return Buffer.from(content + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
}
async function docx() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="evil" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="javascript:window.PWNED=1" TargetMode="External"/><Relationship Id="image" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/pixel.png"/></Relationships>');
  zip.file('word/media/pixel.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64'));
  zip.file('word/document.xml', `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>The happy fox reads.</w:t></w:r></w:p>
    <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Table words</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
    <w:p><w:hyperlink r:id="evil"><w:r><w:t>Unsafe link</w:t></w:r></w:hyperlink></w:p>
    <w:p><w:r><w:t>&lt;script&gt;window.PWNED=1&lt;/script&gt;</w:t></w:r></w:p>
    <w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:blipFill><a:blip r:embed="image"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
    </w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ offline: true });
    let requests = 0;
    await context.route('**/*', route => { requests++; return route.abort(); });
    const word = await docx();
    let passed = 0;
    async function run(label, bytes, kind, extractOnly, verify, mimeType) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      // Exercise missing Promise APIs before the entire bundle initializes.
      const oldBrowserHtml = html.replace('<script>', '<script>Promise.withResolvers=undefined;Promise.try=undefined;window.messages=[];window.ReactNativeWebView={postMessage:m=>window.messages.push(JSON.parse(m))};');
      await page.setContent(oldBrowserHtml);
      await page.waitForFunction(() => window.messages.some(message => message.type === 'ready'));
      await page.evaluate(options => window.renderFile(options), {
        base64: bytes.toString('base64'), kind, extractOnly, mimeType, requestId: label,
      });
      const messages = await page.evaluate(() => window.messages);
      const message = messages.find(message => message.requestId === label);
      assert.ok(message, `No completion for ${label}: ${JSON.stringify(errors)}`);
      await verify(message, page);
      assert.equal(await page.evaluate(() => window.PWNED), undefined);
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => typeof Promise.withResolvers), 'function');
      console.log('PASS', label); passed++; await page.close();
    }
    await run('text PDF extraction', pdf('The happy fox reads.'), 'pdf', true, message => {
      assert.equal(message.type, 'done'); assert.match(message.text, /The happy fox reads\./);
    });
    await run('opaque material PDF signature', pdf('Material passage.'), 'auto', true, message => {
      assert.equal(message.type, 'done'); assert.match(message.text, /Material passage/);
    });
    await run('image-only PDF manual fallback', pdf(), 'pdf', true, message => {
      assert.equal(message.type, 'done'); assert.equal(message.text, '');
    });
    await run('PDF canvas viewer offline', pdf('Offline preview.'), 'pdf', false, async (message, page) => {
      assert.equal(message.type, 'done'); assert.equal(await page.locator('canvas').count(), 1);
    });
    await run('DOCX raw extraction', word, 'docx', true, message => {
      assert.equal(message.type, 'done'); assert.match(message.text, /The happy fox reads\./); assert.match(message.text, /Table words/);
    });
    await run('opaque material DOCX signature', word, 'auto', true, message => {
      assert.equal(message.type, 'done'); assert.match(message.text, /The happy fox reads/);
    });
    await run('hostile DOCX safe formatted preview', word, 'docx', false, async (message, page) => {
      assert.equal(message.type, 'done');
      assert.equal(await page.locator('#content table').count(), 1);
      assert.equal(await page.locator('#content strong').count(), 1);
      assert.equal(await page.locator('#content img').count(), 1);
      assert.equal(await page.locator('#content script, #content [href], #content [onerror]').count(), 0);
    });
    await run('opaque text MIME', Buffer.from('Text material passage.'), 'auto', true, message => {
      assert.equal(message.type, 'done'); assert.equal(message.text, 'Text material passage.');
    }, 'text/plain; charset=utf-8');
    await run('legacy DOC conversion fallback', Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), 'auto', true, message => assert.equal(message.type, 'error'));
    await run('corrupt PDF fallback', Buffer.from('%PDF-broken'), 'pdf', true, message => assert.equal(message.type, 'error'));
    assert.equal(requests, 0, 'The reader must not request CDN, worker, font, or document resources');
    console.log(`${passed} offline Chromium cases passed; zero network requests.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
