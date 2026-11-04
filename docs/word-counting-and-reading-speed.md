# Part 1: passage word counts and reading speed

This change adds passage preparation and reading speed. It does not calculate
miscue accuracy, comprehension, or a final Phil-IRI profile.

## Teacher workflow

1. Create a Reading Assignment and choose Input text or Attach file.
2. For a text PDF or DOCX, extract the passage. For scanned PDFs, images, older
   `.doc` files, or failed extraction, paste/transcribe the passage (or convert
   `.doc` to `.docx` first). OCR is not required for this fallback.
3. Edit the passage preview to remove titles, questions, instructions, page
   numbers, and extraction artefacts. Confirm that the text matches what learners
   will read. For file assignments, this canonical text is stored alongside the
   original attachment.
4. Review the automatic count or provide a positive whole-number manual count
   when the selected reading material has an established word count. Explicitly
   confirm before publishing. Changes invalidate confirmation.
5. Open the reading's Submissions page, play a recording, and confirm completion,
   words covered, and the reading start/end before saving a reviewed rate.

Version `v1` counts Unicode words/numbers, keeps internal apostrophes and hyphens
within a word, and treats numeric decimals as one token. It is a documented app
counting convention, not a claim that every Phil-IRI material uses that convention.
Use the teacher override when necessary. The server recomputes automatic counts.

## Learner workflow and timing

Record continuously. After stopping, the app loads the saved audio metadata for a
provisional speed preview. Choose Complete passage or Part of passage; for partial
reading, enter the number of passage words covered. These are passage positions,
including misread words, not transcript token counts or words-correct-per-minute.

The default interval is the saved audio's full duration. Start/end seconds can
exclude leading and trailing idle time. Hesitations during the reading stay in the
interval. Countdown/recognizer callback latency is not the scoring clock.

```
readingSeconds = (endMs - startMs) / 1000
WPM = wordsRead * 60 / readingSeconds
```

Example: 120 words in 90 seconds = 80 WPM. Intermediate values are not rounded;
the interface displays one decimal place. Empty passages, invalid intervals,
zero/nonfinite durations, unverified audio, and paused/interrupted recordings do
not produce WPM. Recordings can still be submitted without a speed result.

The server reads actual duration from the uploaded media using `music-metadata`,
snapshots the teacher-confirmed passage, validates timing and word counts, and
calculates the stored result. Client WPM is never accepted as an authoritative
score. Learner declarations remain provisional until the owning teacher reviews
them. Old assignments/submissions without confirmed passage snapshots remain
playable and do not receive invented speed results.

## Processing and dependencies

Word counting/calculation use local code. PDF and DOCX extraction use bundled
PDF.js and Mammoth code in the document WebView, removing the old CDN requirement.
Files must first be available on the device; downloading classwork still requires
your server connection. File extraction is automatic text recovery, not OCR.

No paid extraction or scoring service/key is introduced. Existing live speech
recognition is unchanged by this part and may still use the platform's online
speech services.

## Deployment

The backend is maintained separately. Apply the files in `backend-reading-update/`
over the matching backend from `backendforcodex3.zip`, preserving other files and
environment settings, then follow its README to install dependencies and test.
Deploy that backend before using new passage confirmation and reviewed rates.

Frontend:

```sh
git checkout teacher-role-feature
git pull
npm ci
npx expo start --clear
```

This part uses existing native audio/WebView modules; it does not add a new native
speech engine. A build that already includes those modules can use the JavaScript
update. Native build/device validation is still required for your release process.

## Device acceptance checks

- Publish typed, PDF, and DOCX passages; edit/count/confirm; change sources and
  verify stale extraction does not overwrite a new passage.
- Try a scan, empty file, unsupported `.doc`, and long/malformed document; use
  the manual passage fallback.
- Record the same passage in both audio-only and live modes, including partial
  completion, a pause/interruption, and leading/trailing silence.
- Confirm preview timing against playback and teacher review, reconnect/reopen
  the activity, and confirm stored counts and rates persist.
- Verify small phones, text scaling, microphone interruptions, media failures,
  and an older recording without assessment data.

## Automated verification

- 16 frontend tests pass (reading position plus word counting/rate validation).
- 14 backend tests pass in the complete backend, including existing profile and
  classwork tests and generated real-WAV duration/ownership tests.
- 10 offline Chromium document cases pass with zero network requests.
- TypeScript and Android Metro/Hermes export pass.
- Existing repository lint errors remain; new feature code adds none.

These checks do not replace Android/iOS physical-device microphone, playback,
WebView, permissions, and production MongoDB/GridFS testing.
