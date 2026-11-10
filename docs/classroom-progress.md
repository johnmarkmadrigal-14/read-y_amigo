# Classroom quiz results and learner analytics

Implemented on `teacher-role-feature`. Use the accompanying updated backend ZIP together with this frontend commit. No package or native module changes are needed.

## Learner

Open a classroom → Classwork → Quiz. The list includes existing standalone classroom quizzes and passage comprehension assignments. Filter by All sources, From passages or Standalone. Passage cards show the current saved attempt, final correct-answer score, percentage, comprehension level, weighted quiz points and submission timestamp. View result opens that same attempt through the existing comprehension screen. Browsing the list is read-only and creates no duplicate classwork or attempts. Drafts and pending written-answer reviews have distinct states; pending results receive no final percentage or level. Returning to the classroom refreshes the data.

Comprehension levels use the same Phil-IRI ranges already shown on the app information screen: Independent ≥80%, Instructional ≥59% and <80%, Frustration <59%. Classification uses the unrounded correctness percentage, separately from weighted points. This corrects the illustrative labels in the proposed image. The levels describe comprehension only, not a combined reading profile. A general standalone quiz receives no invented comprehension classification and keeps its existing detail flow.

## Teacher

Classwork → Quiz also lists passage comprehension assignments, opening the existing results/grading screen. Progress lists each enrolled learner, a search field, and latest available speed, accuracy and comprehension. Tap a learner to open a full-screen detail view with All time / This month filters, three separate line charts, selectable data points and reading history newest first. Each metric uses its own scale (WPM or 0–100%); unavailable values create gaps and are not zero scores. Long charts scroll horizontally, and history initially shows ten rows with Show more.

History includes the activity title, read-aloud/comprehension labels, submission date/time, available metric results and a working submission-review link. Linked recording and quiz results share one history row. Old quizzes whose recording was removed remain explicitly identified with an unavailable recording and retain their quiz result. They open comprehension results instead of a broken recording link. Comprehension-only activities have no invented audio submission.

Blue denotes speed, green denotes accuracy and orange denotes comprehension. Existing red, cream, fonts, role navigation and standalone quiz flow remain in use.

## Word accuracy confirmation

The supplied backend stores miscue observations but has no saved numeric word-accuracy assessment. The update adds Word accuracy review in the existing learner submission screen. After listening, the owning teacher confirms words assessed and scored errors according to the assessment protocol. The server validates integer bounds and computes `(wordsAssessed - errorCount) / wordsAssessed * 100`, authors reviewer metadata and rejects stale edits. Grouped ASR suggestions are never converted automatically into scored errors. Older submissions display a dash for accuracy until assessed. Speed and miscue observations remain separate.

## API additions

- `GET /api/comprehension/mine?classId=...&include=results`: adds current, assigned learner-safe result summaries; legacy completion-only requests retain their existing response. Excludes other learners, removed assignments and quizzes linked to superseded recordings. Returns no answer keys, written-answer guides, private passage or learner answers.
- `GET /api/classes/:classId/progress`: adds `readingSummary` and `latestReadingAt` to enrollment DTOs, using bulk class-scoped reads.
- `GET /api/classes/:classId/progress/:learnerId`: owner-teacher-only enrollment-scoped reading history; no answer keys or learner response content.
- `PATCH /api/submissions/:submissionId/word-accuracy`: teacher-only assessment with `wordsAssessed`, `errorCount`, `listened: true`, and `previousReviewedAt` (null for first review).

The optional `wordAccuracy` submission subdocument needs no migration. Historical assessments are not fabricated or backfilled.

## Validation

- `npx tsc --noEmit`.
- Targeted ESLint for new progress components, the modified result/review components, and API client.
- `node --test tests/progress.test.cjs`: scoring boundaries, pending/missing/zero values, separate weighted points, calendar ranges and chronological latest metrics.
- Companion backend `npm test`: 28 passing tests including current-attempt linkage, privacy, role/ownership/enrollment/assignment checks, accuracy validation and stale-update rejection.
- Android bundle export succeeded.
- DOM interaction checks against the actual new React Native Web components with fixture API/router adapters: source filters, result opening, pending review, learner modal, three charts, point and date-range selection, history navigation, accuracy save and failed-request retry.

Browser screenshot verification was blocked by Chromium's local socket permission and the remote browser's inability to reach the local preview. A physical Android device and production MongoDB were not used. Check on the development client with a teacher and learner account after starting the updated backend.
