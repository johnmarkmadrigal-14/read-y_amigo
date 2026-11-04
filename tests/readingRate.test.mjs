// Run: node --test tests/readingRate.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateReadingRate, countPassageWords, validateReadingPassage } from '../components/readingRate.ts';

const passage = { text: 'A passage', wordCount: 120, countMethod: 'manual', confirmed: true, tokenizerVersion: 'v1' };
const reading = { completed: true, wordsRead: 120, startMs: 0, endMs: 90000, interrupted: false };

test('Unicode tokenizer keeps internal apostrophes, hyphens and decimals', () => {
  assert.equal(countPassageWords("L’été don't mother-in-law 3.14 2,5 cafe\u0301 中文 مرحبا"), 8);
  assert.equal(countPassageWords(' — hello—world -  ... '), 2);
  assert.equal(countPassageWords('  \n 👋 ...'), 0);
});
test('120 words in 90 seconds is 80 WPM, provisional by default', () => {
  assert.deepEqual(calculateReadingRate(passage, reading, 90000), { wordsRead: 120, readingSeconds: 90, wpm: 80, status: 'provisional' });
  assert.equal(calculateReadingRate(passage, reading, 90000, 'reviewed')?.status, 'reviewed');
});
test('fractional seconds are never floored or thresholded', () => {
  assert.equal(calculateReadingRate(passage, { ...reading, endMs: 90500 }, 90500)?.wpm, 7200 / 90.5);
  assert.equal(calculateReadingRate(passage, { ...reading, endMs: 999 }, 999)?.readingSeconds, 0.999);
  assert.equal(calculateReadingRate(passage, { ...reading, endMs: 1 }, 1)?.readingSeconds, 0.001);
});
test('complete and partial counts are explicit and consistent', () => {
  assert.equal(calculateReadingRate(passage, { ...reading, completed: false, wordsRead: 60 }, 90000)?.wpm, 40);
  for (const measurement of [{ ...reading, completed: false }, { ...reading, wordsRead: 60 }, { ...reading, wordsRead: 0 }, { ...reading, wordsRead: 121 }, { ...reading, wordsRead: 1.5 }])
    assert.equal(calculateReadingRate(passage, measurement, 90000), null);
});
test('bounds trim only edges, retaining all internal time', () => {
  assert.equal(calculateReadingRate(passage, { ...reading, startMs: 5000, endMs: 95000 }, 100000)?.wpm, 80);
  for (const bounds of [{ startMs: -1, endMs: 90000 }, { startMs: 90000, endMs: 90000 }, { startMs: 90001, endMs: 90000 }, { startMs: 0, endMs: 90001 }, { startMs: NaN, endMs: 90000 }, { startMs: 0.1, endMs: 90000 }])
    assert.equal(calculateReadingRate(passage, { ...reading, ...bounds }, 90000), null);
});
test('paused or interrupted readings never receive WPM', () => {
  assert.equal(calculateReadingRate(passage, { ...reading, interrupted: true }, 90000), null);
});
test('unverified, zero, fractional-ms and non-finite durations fail closed', () => {
  for (const duration of [0, -1, NaN, Infinity, 90000.1]) assert.equal(calculateReadingRate(passage, reading, duration), null);
});
test('passage must be confirmed, nonempty and consistently counted', () => {
  for (const invalid of [{ ...passage, confirmed: false }, { ...passage, text: '' }, { ...passage, text: '  ... ' }, { ...passage, wordCount: 0 }, { ...passage, countMethod: 'automatic' }])
    assert.ok(validateReadingPassage(invalid));
  assert.equal(validateReadingPassage({ ...passage, countMethod: 'automatic', wordCount: 2 }), null);
});
