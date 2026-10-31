# Reading passages and live transcription

Teacher Reading Assignments now offer Attach file or Input text. Text passages preserve paragraphs and render as native, selectable text on the learner classwork screen; file assignments retain the existing FileViewer. New readings require a passage. Existing assignments continue to work.

## Installation

Deploy the matching backend changes in the supplied backend ZIP first. In the frontend folder:

```sh
git checkout teacher-role-feature
git pull
npm ci
npx expo run:android
```

Use Android Studio and a connected Android device (or emulator with working speech recognition). For iOS, use `npx expo run:ios` on macOS with Xcode. Rebuild the native app after installing this dependency; restarting Metro alone is insufficient. Local Android builds do not require a paid EAS plan.

`expo-speech-recognition` is pinned to the SDK 57 major matching this repository. It uses the platform speech recognizer, with no paid transcription API, account, key, or backend transcription service. Device speech services may use internet and process speech remotely. Offline recognition is not guaranteed; supported languages and accuracy depend on the device.

Live audio persistence requires Android 13+ or iOS and a supported recognizer. Expo Go, web, older Android devices, and builds missing the native module retain the original audio-only recorder. Learners can also choose audio-only recording if the speech service fails.

The live mode records and transcribes with ONE native microphone session, saves WAV audio, shows interim words and accumulated final results, supports English/Filipino selection, and submits the saved audio and transcript. Read each live-mode take continuously and tap Stop; use audio-only mode if pause/resume is needed. Saved WAV recordings are subject to the existing 25 MB backend upload limit. Recognition may end early because of platform limits, silence, loss of network, or an interruption; replay the saved audio before submitting.

## Backend fields

Classwork multipart requests and teacher/learner responses include `readingSource` (`file` or `text`) and `readingText` (up to 100,000 characters). Text mode must not contain a file/material. File mode ignores stale text on the client and validates conflicting input on the server. Legacy clients that omit source retain previous behavior. Existing MongoDB documents need no migration.

Audio submissions optionally include `transcript` and `transcriptLocale`. These remain machine-generated text, not an assessment score. WAV audio uses the existing authenticated GridFS upload and playback routes.

## Verification

- TypeScript check passes after replacing the removed SDK `StyleSheet.absoluteFillObject` reference in FileViewer with `StyleSheet.absoluteFill`.
- Android Metro/Hermes export succeeds. This verifies bundling, not a native APK build.
- No new ESLint errors compared with the source branch; existing lint errors remain.
- Backend: `node --test tests/*.test.js` exercises text/file multipart routes with stubbed database/storage, schema persistence, legacy defaults, invalid combinations, and passage size limits.

Physical-device microphone, permissions, live transcript timing, Filipino service support, WAV playback, production MongoDB/GridFS, and native compilation still need testing in the target environment.
