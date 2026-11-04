/** Versioned counting and scoring rules shared with server/review consumers. */
export type ReadingPassage = {
  text: string;
  wordCount: number;
  countMethod: 'automatic' | 'manual';
  confirmed: boolean;
  tokenizerVersion: 'v1';
};
export type ReadingMeasurement = {
  completed: boolean;
  wordsRead: number;
  startMs: number;
  endMs: number;
  interrupted: boolean;
};
export type RecordingPayload = {
  uri: string;
  durationMs: number;
  transcript?: string;
  transcriptLocale?: string;
  readingMeasurement?: ReadingMeasurement;
  recordingInterrupted?: boolean;
};
export type ReadingRateResult = {
  wordsRead: number;
  readingSeconds: number;
  wpm: number;
  status: 'provisional' | 'reviewed';
};

/** Letters/marks/numbers; internal apostrophes and hyphens; decimal numbers. */
export function countPassageWords(text: string): number {
  return (text.normalize('NFC').match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:(?:['’\-‐‑][\p{L}\p{N}][\p{L}\p{M}\p{N}]*)|(?:[.,](?=\p{N})\p{N}+))*/gu) ?? []).length;
}

export function validateReadingPassage(passage: ReadingPassage): string | null {
  if (!passage || typeof passage.text !== 'string' || passage.text.length > 100000 || countPassageWords(passage.text) === 0 || passage.confirmed !== true ||
      passage.tokenizerVersion !== 'v1' || !Number.isSafeInteger(passage.wordCount) || passage.wordCount <= 0 || passage.wordCount > 100000 ||
      !['automatic', 'manual'].includes(passage.countMethod)) return 'A confirmed passage word count is needed.';
  if (passage.countMethod === 'automatic' && countPassageWords(passage.text) !== passage.wordCount)
    return 'The passage word count has changed. Confirm it again.';
  return null;
}

/** Bounds trim only the edges. Every hesitation inside the interval counts. */
export function validateReadingMeasurement(passage: ReadingPassage, measurement: ReadingMeasurement, durationMs: number): string | null {
  const passageError = validateReadingPassage(passage);
  if (passageError) return passageError;
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0) return 'Audio duration could not be verified.';
  if (!measurement || typeof measurement.completed !== 'boolean' || typeof measurement.interrupted !== 'boolean')
    return 'Confirm whether you finished the passage.';
  if (measurement.interrupted) return 'Recording was interrupted. Read again continuously for a speed preview. You can still submit this recording.';
  if (!Number.isSafeInteger(measurement.wordsRead) || measurement.wordsRead <= 0 || measurement.wordsRead > passage.wordCount)
    return 'Enter the number of passage words read.';
  if (measurement.completed ? measurement.wordsRead !== passage.wordCount : measurement.wordsRead >= passage.wordCount)
    return 'Choose complete for the whole passage, or enter fewer words for a partial reading.';
  if (!Number.isSafeInteger(measurement.startMs) || !Number.isSafeInteger(measurement.endMs) ||
      measurement.startMs < 0 || measurement.endMs > durationMs || measurement.endMs <= measurement.startMs)
    return 'Reading bounds must be inside the saved audio, with end after start.';
  return null;
}

/** No rounding or minimum-duration threshold before calculating the rate. */
export function calculateReadingRate(passage: ReadingPassage, measurement: ReadingMeasurement, durationMs: number,
  status: ReadingRateResult['status'] = 'provisional'): ReadingRateResult | null {
  if (validateReadingMeasurement(passage, measurement, durationMs) || !['provisional', 'reviewed'].includes(status)) return null;
  const readingSeconds = (measurement.endMs - measurement.startMs) / 1000;
  const wpm = measurement.wordsRead * 60 / readingSeconds;
  return Number.isFinite(wpm) && wpm > 0 ? { wordsRead: measurement.wordsRead, readingSeconds, wpm, status } : null;
}
