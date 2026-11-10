# Standalone quizzes, classroom Library, Reports and minimalist authentication

Applied to `teacher-role-feature`. Pair this frontend with `backend-quiz-library-reports-updated.zip`, a cumulative backend based on the previous classroom-progress update. Package files are unchanged; no new runtime/native dependency or dev-client rebuild is required for these changes.

## Standalone classroom quizzes

Classroom quizzes now open the same question-by-question interface used by passage quizzes, with drafts/autosave, manual save, Previous/Next, answer completeness checking, confirmation and locked submitted answers. Classroom Quiz cards show their saved status and final scores. To-do recognizes submitted/pending-review standalone attempts. Existing detail links also offer Open quiz or view result.

The backend snapshots authored questions into a separate `StandaloneQuizAttempt` collection, with a unique classwork/learner index and revision guards. Objective items are graded on the server; short-answer and essay responses remain pending until the owning teacher reviews correctness and points. The teacher opens Quiz results and grading from the classroom quiz's details and uses the familiar review UI. Lists/draft DTOs never return answer keys or private written-answer guides to learners. Enrollment, active class, assignment, role, owner and deadline rules are server-side. Submitted results may be reopened after the deadline, while new attempts/draft writes are blocked.

Standalone quiz results are general assessment scores. They do not receive an invented Phil-IRI comprehension level and are not included in passage comprehension reports. Existing passage quiz behavior is retained. New authored standalone quizzes are validated before publication; old quiz records are not rewritten. Invalid legacy keys produce an actionable validation error rather than a fabricated score.

## Classroom Library

Materials is labeled Library on both roles' classroom tabs. The old separate material-upload UI is replaced with a searchable two-column tile grid, grouped by local upload date and sorted newest first (toggle to oldest first). It derives reading attachment files from existing assignments; no duplicate upload/file storage is created. Reused legacy document materials remain supported.

GridFS `uploadDate` is used when available, falling back to the original material/assignment timestamp for legacy files. Reused file IDs/URLs appear once with their source activities. Text-only readings and non-reading attachments are excluded. Learner queries are enrollment- and assignment-scoped. Open uses the existing in-app file preview. Old material APIs and stored data remain available for backward compatibility.

## Dynamic teacher Reports

Reports fetches saved reading submissions and passage comprehension attempts for the teacher's active classes. It refreshes on focus, manual refresh and class/date filter changes. It shows distinct overall learner counts, learners with submissions, per-metric values/sample counts, separate metric trends, passage comprehension-level counts, and per-class results with links to the Progress tab.

For each metric, each learner contributes one latest available result within the selected period. A learner enrolled in multiple selected classes is counted once overall; class summaries count that class's enrolled learners. Missing/pending values are excluded, genuine zero scores remain valid, and provisional speed counts are disclosed. Word accuracy uses finalized saved teacher assessments. Weighted general quiz points are never mixed into reading-comprehension percentages or WPM.

All time / This month / Last month use explicit inclusive-start/exclusive-end timestamps from the device's local calendar. Trend points are cumulative latest-available learner averages within the period, grouped by submission day in Asia/Manila. They use separate WPM and percentage axes and are computed from current saved results; changing a review can revise historical report points. They are not immutable past reports or a combined Phil-IRI reading profile. Empty periods show unavailable values, not false zero averages. No arbitrary all-metric combined score is computed.

## Minimalist landing, login and sign-up

Opening uses a short native opening-book animation made from code-native shapes, then reveals the READ-Y AMIGO name and Log in / Sign up buttons. Reduced-motion settings skip the animation. Hidden controls remain inaccessible until the reveal finishes. No extra illustration package, animated image, social marketing tiles or new fonts are needed.

Login uses two simple labeled inputs with password visibility, existing authentication/role routing and inline errors. Sign up chooses Learner/Teacher and continues into the existing four-step form, with simpler headings, thin input borders and Back navigation. Form drafts, field validation, Google sign-up (behind a small disclosure) and CAPTCHA are preserved. The user's configured API origin is preserved.

## Backend endpoints

- `/api/quizzes`: current result summaries (`GET /mine?classId=`), start/resume (`POST /classwork/:id/start`), draft (`PUT /attempts/:id/draft`), submit (`POST /attempts/:id/submit`), teacher attempts (`GET /classwork/:id/attempts`), teacher grade (`PATCH /attempts/:id/grade`). Same answer/revision payloads as passage quizzes.
- `GET /api/classes/:classId/library` and `GET /api/learner/classes/:classId/library`: role-scoped reading files.
- `GET /api/reports?classId=&from=&to=`: real reading metrics, samples, trends, levels, per-class results and teacher-owned class options.

New standalone collection/index must be allowed by the database. No migrations, deletion or historical-score backfill occurs. Keep your existing `.env`, uploads and GridFS data and restart the backend after applying the ZIP.

## Validation

TypeScript, targeted ESLint, 6 frontend data/client tests, 33 backend tests and Android bundle export passed. DOM interaction checks exercise actual React Native Web components with fixture router/API/platform adapters: normal/reduced-motion landing, login validation/routing and password visibility, both signup flows/draft preservation, Google disclosure, standalone answer/save/submit/result, teacher written grading, Library date sorting/search/preview/retry, report metric/class/period filters and Progress navigation.

Existing learner To-do animation/date-render React Compiler lint findings predate this update; the new components and other changed screens pass targeted lint. Backend HTTP tests use stubbed database models, not a production MongoDB. Browser screenshot validation was blocked by Chromium's socket permission; physical Android verification remains a deployment acceptance step.
