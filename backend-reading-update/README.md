# Part 1 backend overlay

Apply these files over the **latest backend supplied as backendforcodex3.zip** (its root folder is `backendforcodex2`), preserving all other files (including the latest profile changes). This directory is an overlay, not a standalone server. It contains no secrets, uploads, node_modules or placeholder files. No quiz, miscue or unsubmit behavior is added.

## Deploy and verify

1. Back up the deployed backend and database. Use Node.js 22 or newer.
2. Copy `models/`, `routes/`, `utils/`, `tests/`, `package.json` and `package-lock.json` from this overlay into the corresponding backend paths. Merge directories; do not delete existing files. Preserve the existing auth, GridFS, readingSource utilities, profile changes and tests.
3. In the complete backend run `npm ci`, then `npm test` (or `node --test tests/*.test.js`). Tests use mocked DB methods and generated PCM WAV buffers; no MongoDB or credentials are required for tests.
4. Restart the existing backend with its existing environment configuration and MongoDB/GridFS connection (`npm start`). No new environment variables, API keys, paid service or migration are required. Existing records remain unchanged; do not backfill verified duration or WPM from client duration/transcripts.
5. Smoke-test creating a confirmed reading assignment, recording a submission and teacher review. Unsupported/undeterminable media duration allows upload but produces no rate.

Validated in a separate complete backend copy; original reference tests were left unchanged.

## Classwork contract

The existing multipart classwork create endpoint accepts optional `readingPassage` as a JSON string (also accepts an object if already parsed):

```json
{"text":"One two three four","wordCount":4,"countMethod":"automatic","confirmed":true,"tokenizerVersion":"v1"}
```

Only reading classwork accepts it. Omission preserves legacy behavior. All five keys are required; unknown keys, null, malformed JSON, nonboolean confirmation and unsupported versions are rejected with 400 before saving an attachment. Text has a raw limit of 100,000 JavaScript characters and is normalized by trimming outside whitespace and replacing CRLF/CR with LF. Typed passage canonical text must equal the existing normalized `readingText`. File/material assignments can provide canonical passage text via this field without populating `readingText`.

Automatic mode recomputes `wordCount` on the server and rejects a differing supplied count with 400 so the teacher must confirm again. Tokenizer v1 uses Unicode letters, combining marks and numbers; internal straight/curly apostrophes and hyphens (`-`, U+2010, U+2011), and numeric dot/comma groups remain inside a token. Text is normalized to NFC for counting; the regex exactly matches frontend `countPassageWords`. Punctuation-only text has zero tokens and is rejected in automatic mode. Manual mode accepts an integer 1–100,000 and also requires at least one token in the text. Both modes require a supplied integer in that range. `confirmedBy` (authenticated teacher ID) and `confirmedAt` are server authored and included in stored/serialized passages. Clients must omit these audit keys on create.

Existing teacher and learner classwork routes naturally serialize `readingPassage`. Teacher `GET /api/submissions/classwork/:classworkId` additionally returns it inside the response's `classwork` object.

## Submission contract

Existing multipart `POST /api/submissions/classwork/:classworkId` accepts `recordingInterrupted` as the string `"true"` or `"false"` (always sent by current clients; omission defaults to false for legacy clients). Other values return 400. It is stored as root `submission.recordingInterrupted` even without a measurement. It also accepts optional `readingMeasurement` JSON:

```json
{"completed":true,"wordsRead":4,"startMs":0,"endMs":2000,"interrupted":false}
```

The server snapshots the assignment into `submission.readingPassage`; the client cannot supply a snapshot. Fields `submission.readingMeasurement` and `submission.readingRate` are stored alongside it. Unknown measurement keys are rejected. Boolean fields must be actual booleans; numbers must be finite, `wordsRead` an integer 0–100,000, `startMs >= 0` and `endMs > startMs`; both bounds must be safe integer milliseconds. With a confirmed passage, complete readings must equal its count; partial readings require 0 through count−1 words. Zero partial words produces no rate.

The uploaded buffer is parsed with dynamically imported `music-metadata`, `parseBuffer` with `duration: true` and `skipCovers: true`. `audio.durationMs` stores measured milliseconds rounded with `Math.round` when available; `audio.durationVerified` is true only then. If parsing fails or no finite positive duration exists, a finite positive client `durationMs` is retained only for legacy playback (otherwise 0), with `durationVerified: false`. Client duration and transcript text never supply WPM. See the [official buffer API and duration documentation](https://github.com/Borewit/music-metadata#parsebuffer-function).

Verified measurements must start before the actual audio end. An end up to 100 ms beyond measured duration is clamped to the actual end; anything further is rejected with 400 before saving audio. Internal pauses/hesitations remain inside the selected interval; no silence removal occurs. `interrupted: true` is accepted and stored but makes the rate null. A root recording interruption is OR-merged into an existing measurement; a missing measurement still has a null rate.

`readingRate` is null unless a confirmed snapshot, verified positive duration and valid noninterrupted nonzero measurement exist. Otherwise the server calculates full precision:

```json
{"wordsRead":4,"readingSeconds":2,"wpm":120,"status":"provisional"}
```

`readingSeconds = (endMs − startMs) / 1000`; `wpm = wordsRead * 60 / readingSeconds`. Learner declarations are always provisional. The pure calculator independently validates passage/count consistency, integer duration/bounds, completion, interruption and status, and returns null for invalid or nonfinite arithmetic. Legacy missing fields never fabricate WPM.

## Teacher review contract

`PATCH /api/submissions/:submissionId/reading-rate` requires teacher authentication and ownership of the submission's class (403 otherwise). Send the **raw measurement object** as the JSON body, not a `readingMeasurement` wrapper:

```json
{"completed":false,"wordsRead":2,"startMs":100,"endMs":1700,"interrupted":false}
```

A confirmed submission passage snapshot and verified stored audio duration/file ID are required (400 otherwise). The same validation/bounds/clamping apply. Review uses the snapshot even if classwork later changes. A previously reported interruption in either root `recordingInterrupted` or `readingMeasurement.interrupted` prevents review with 400; teachers cannot clear it. Review persists the validated measurement and recalculated rate with `status: "reviewed"`, plus **root-level** `submission.reviewedBy` and `submission.reviewedAt`. It returns `{submission}`. A zero-word review has null rate but still records review audit fields. An incoming review newly marked interrupted also has null rate and blocks future reviews. The response's learner is the existing ID; the frontend preserves its previously populated learner card.

Clients cannot author `readingRate`, confirmation/review audit fields or duration verification. Existing role/enrollment/assignment and duplicate-submission checks remain in force. Existing learner submissions and teacher lists serialize all stored reading fields.

## Files and coverage

Changed production files: `models/ClassWork.js`, `models/Submission.js`, `routes/classes.js`, `routes/submissions.js`. New production files: `models/readingSchemas.js`, `utils/readingRate.js`. Updated package manifest/lock adds free `music-metadata` and the Node test command.

New tests: `tests/readingRate.test.js`, `tests/reading-rate-routes.test.js`. They cover Unicode tokenization, manual bounds, confirmation/audit spoofing, canonical typed text, validation before GridFS writes, real WAV duration versus forged client duration, full/partial/zero/interrupted recordings, 100 ms tolerance, snapshots, review ownership/roles/audits, irreversible interruption, legacy/invalid media, and teacher/learner serialization, exact NFC/comma tokenization, stale automatic confirmation rejection, punctuation-only manual rejection, integer millisecond bounds, robust pure calculation, and root interruption with/without measurement. Original profile, readingSource and classwork tests are retained in the complete backend and are not copied into this overlay.
