import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareTranscript, comparisonWords } from '../components/miscueComparison.ts';
test('example detects omission and substitution with stable positions', () => {
 const e = compareTranscript('The little boy opened the door.', 'The boy opened a door.');
 assert.deepEqual(e.map(x => [x.kind, x.passageStart, x.passageEnd]), [['omission',1,2],['substitution',4,5]]);
 assert.ok(e.every(x => x.status === 'pending'));
});
test('case punctuation Unicode and apostrophes normalize', () => {
 assert.deepEqual(compareTranscript("CAFÉ, don't! anak‑bata", "cafe\u0301 don’t anak-bata"), []);
 assert.equal(comparisonWords('3.14 magandang-araw').length, 2);
});
test('adjacent omissions group and partial reading excludes unread tail', () => {
 assert.equal(compareTranscript('The very little boy ran', 'The boy ran')[0].passageEnd,3);
 assert.deepEqual(compareTranscript('The boy ran home', 'The boy',2), []);
});
test('repeated phrases are suggestions, other added words are insertions', () => {
 assert.equal(compareTranscript('the little boy ran', 'the little the little boy ran')[0].kind,'repetition');
 assert.equal(compareTranscript('the boy ran', 'the happy boy ran')[0].kind,'insertion');
});
test('missing transcript and oversized input fail without mass omission claims', () => {
 assert.throws(() => compareTranscript('The boy', ''));
 assert.throws(() => compareTranscript('a '.repeat(2000), 'b '.repeat(2000)));
});
