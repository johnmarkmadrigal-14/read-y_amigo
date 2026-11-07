# Part 2: transcript comparison and teacher observations

The teacher submission card now has a transcript/miscue review beneath the existing audio player. Expand the numbered passage and saved transcript, listen, enter the last passage word reached, and compare. Word positions use the v1 tokenizer, not a manually overridden word count. Unread trailing words are excluded. The comparison scope is saved with the review.

Case and punctuation differences are ignored while Unicode letters, accents, internal apostrophes/hyphens and numeric tokens are preserved. Bounded dynamic programming aligns word sequences without a dependency. Consecutive edits of the same type are grouped; adjacent duplicated transcript phrases can be suggested as repetitions. Alignment is ambiguous for some repeated words and corrections. Empty transcripts never generate mass omissions. Large comparisons fail with a manual-review option (2 million alignment cells / 1,000 events).

Every suggestion starts pending. Listen using the existing audio player, then confirm, dismiss or reclassify, with optional notes/audio time. For combined events, dismiss the individual suggestions and add a teacher observation covering the relevant passage word range. Manual observations support mispronunciation, hesitation, self-correction and dialect variation, including audio-only submissions. Marking self-correction or dialect variation records an observation, not an error. Repetition is not automatically a scored error. No edit distance, event total, or confirmed-observation total becomes a Phil-IRI error count, reading accuracy, comprehension score or profile. The existing speed calculation is independent.

Reviews require a confirmed submission passage snapshot and saved recording. Older recordings without a snapshot remain playable but comparison is unavailable. The authenticated owning teacher can save through PATCH /submissions/:submissionId/miscue-review. The server validates types, spans, limits, listening acknowledgement and prior review timestamp, authors reviewer/time, and atomically rejects stale concurrent saves. Learners cannot save teacher reviews. Existing GET submission endpoints return the saved review.

The recognizer is retained. Only finalized results remain after recognition ends; an unfinalized trailing hypothesis is excluded. Standard recognition can use network speech services. An optional 'Require on-device recognition' switch checks device support and the exact installed locale before starting. If support cannot be verified, it stops with guidance; no silent online fallback. Some services return no installed locales even when offline models exist. Test English and Filipino separately on target phones. No Whisper models, paid APIs, new packages or native configuration changes were added.

## Updating

Pull teacher-role-feature in the frontend. The GitHub integration rejected writes to miniegail/read-y-amigo-backend, so the matching backend change is supplied as docs/backend-miscue-review.patch in this branch. Enable that repository for the GitHub integration to publish directly, or download the patch and apply it in a clean backend checkout:

```sh
git switch -c phil-iri-miscue-review
git apply --check /path/to/backend-miscue-review.patch
git apply /path/to/backend-miscue-review.patch
npm test
```

Commit and review the backend change before merging it, then restart the backend before saving reviews. There are no dependency or lockfile changes, database migration or dev-client rebuild requirements for these JavaScript changes. Normal runtime compatibility and installed native speech module are still required.

## Validation

Frontend: node --test tests/*.test.mjs; npx tsc --noEmit; targeted ESLint.
Backend: npm test, including real HTTP route tests with stubbed database access for ownership, learner denial, validation, save/serialization and stale-write rejection. These do not connect to a production database.

Device acceptance: record a short passage with a skipped word, substitution and repeated phrase; submit, listen and compare; dismiss recognizer mistakes; add a manual audio observation; save and reload; verify another teacher/learner cannot save. Check an incomplete reading excludes the unread tail, audio-only recording permits manual review, and on-device mode is blocked when a language model cannot be verified. Actual microphone recognition and Filipino offline support need phone testing.
