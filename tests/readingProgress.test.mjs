// Run with Node 22.18+ (native TypeScript stripping):
// node --test tests/readingProgress.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readingWords, readingSentences, readingPosition } from "../components/readingProgress.ts";

const passage = readingWords("Mia planted a small seed. Every morning she watered it.");
test("normalizes punctuation, apostrophes and Filipino words", () => {
  assert.deepEqual(readingWords("MIA’s hard-earned binhi, araw–araw!"), ["mias", "hard", "earned", "binhi", "araw", "araw"]);
});
test("preserves the passage and maps sentence word ranges", () => {
  const text = "Mia planted a seed!\nEvery morning, she watered it.\n";
  const sentences = readingSentences(text);
  assert.equal(sentences.map(sentence => sentence.text).join(""), text);
  assert.equal(sentences.find(sentence => sentence.text.includes("Every")).wordStart, 4);
});
test("empty or unrelated recognition does not advance", () => {
  assert.equal(readingPosition(passage, ""), -1);
  assert.equal(readingPosition(passage, "unrelated noise"), -1);
  assert.equal(readingPosition([], "hello"), -1);
});
test("follows recognition across a sentence boundary", () => {
  assert.equal(readingPosition(passage, "Mia planted a small seed every morning"), 6);
});
test("tolerates a recognizer substitution and an omitted word", () => {
  assert.equal(readingPosition(passage, "Mia planted the small seed every"), 5);
  assert.equal(readingPosition(passage, "Mia planted small seed every"), 5);
});
test("tolerates repeated spoken words", () => {
  assert.equal(readingPosition(passage, "Mia Mia planted a small seed"), 4);
});
test("revised interim recognition can move back", () => {
  assert.equal(readingPosition(passage, "Mia planted a small seed every"), 5);
  assert.equal(readingPosition(passage, "Mia planted"), 1);
});
test("a repeated word later in the passage does not cause a jump", () => {
  const repeated = readingWords("The cat saw the bird. The cat slept.");
  assert.equal(readingPosition(repeated, "the cat"), 1);
  assert.equal(readingPosition(repeated, "the cat saw the bird the cat"), 6);
});
