import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Buffer } from 'node:buffer';
import { comparisonWords } from '../components/miscueComparison.ts';
import { buildSync } from 'esbuild';
import { fileURLToPath } from 'node:url';
const bundle = buildSync({ entryPoints: [fileURLToPath(new URL('../components/miscueReviewLayout.ts', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'node' });
const { passageTokens, passageSection, PASSAGE_SECTION_WORDS } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('word positions match comparison, retaining punctuation and Unicode', () => {
  const text = '“CAFÉ,” cafe\u0301! 3.14 anak‑bata; don’t.\n\nNext paragraph.';
  const tokens = passageTokens(text);
  assert.deepEqual(tokens.map(t => t.word), comparisonWords(text));
  assert.deepEqual(tokens.map(t => t.index), tokens.map((_, i) => i));
  const page = passageSection(text, 0);
  assert.equal(page.words.map(t => t.prefix + t.word).join('') + page.suffix, text.normalize('NFC'));
});

test('sections retain every word and punctuation across boundaries without duplicate numbering', () => {
  const text = Array.from({ length: PASSAGE_SECTION_WORDS * 2 + 3 }, (_, i) => `word${i + 1}${i % 7 === 0 ? '!\n\n' : ', '}`).join('');
  const pages = [0, 1, 2].map(n => passageSection(text, n));
  assert.equal(pages[0].count, 3);
  assert.equal(pages[1].words[0].index, PASSAGE_SECTION_WORDS);
  assert.equal(pages.map(p => p.words.map(t => t.prefix + t.word).join('') + p.suffix).join(''), text);
  assert.equal(pages[0].suffix, ', ');
  assert.equal(pages[2].words.length, 3);
});

test('empty and punctuation-only passages render safely; page bounds are clamped', () => {
  assert.equal(passageSection('', 0).count, 1);
  assert.equal(passageSection('…!', 5).suffix, '…!');
  assert.equal(passageSection('hello', -1).page, 0);
  assert.equal(passageSection('hello', 99).page, 0);
});
