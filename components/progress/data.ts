import type { Attempt } from '../comprehension/types';

export type MetricValue = { value: number | null; status?: 'reviewed' | 'provisional' | 'pending-review'; submittedAt?: string };
export type ReadingSummary = { speed: MetricValue; accuracy: MetricValue; comprehension: MetricValue };
export type QuizResultSummary = Pick<Attempt, '_id' | 'classwork' | 'status' | 'attemptLabel' | 'result' | 'submittedAt' | 'readingSubmission'>;
export type ReadingHistoryEntry = {
  readingUnavailable?: boolean;
  id: string; classworkId: string; title: string; submittedAt: string;
  activities: ('read-aloud' | 'comprehension')[];
  readingSubmissionId?: string; comprehensionAttemptId?: string;
  speed: MetricValue; accuracy: MetricValue; comprehension: MetricValue;
  comprehensionScore?: { correctAnswers: number; totalQuestions: number; earnedPoints: number; maxPoints: number } | null;
};
export type LearnerReadingProgress = { learner: { _id: string; displayName: string }; history: ReadingHistoryEntry[] };

export function metricNumber(metric?: MetricValue, percentage = false): number | null {
  const v = metric?.value;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && (!percentage || v <= 100) && metric?.status !== 'pending-review' ? v : null;
}
export function metricText(metric: MetricValue | undefined, unit: 'WPM' | '%'): string {
  const n = metricNumber(metric, unit === '%');
  return n === null ? '—' : `${Number(n.toFixed(1))}${unit === '%' ? '%' : ' WPM'}`;
}
// Values use the unrounded correctness percentage, independent of weighted points.
export function comprehensionLevel(percentage: number | null | undefined) {
  if (typeof percentage !== 'number' || !Number.isFinite(percentage) || percentage < 0 || percentage > 100) return null;
  return percentage >= 80 ? 'Independent' : percentage >= 59 ? 'Instructional' : 'Frustration';
}
export function finalPercentage(attempt: QuizResultSummary): number | null {
  return attempt.status === 'graded' && attempt.result?.pendingQuestions === 0
    ? metricNumber({ value: attempt.result.percentage }, true) : null;
}
export function submittedHistory(history: ReadingHistoryEntry[]) {
  return history.filter(row => Number.isFinite(Date.parse(row.submittedAt)))
    .slice().sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
}
export function historyInRange(history: ReadingHistoryEntry[], range: 'All time' | 'This month', now = new Date()) {
  return submittedHistory(history).filter(row => range === 'All time' ||
    (new Date(row.submittedAt).getFullYear() === now.getFullYear() && new Date(row.submittedAt).getMonth() === now.getMonth()));
}
export function latestMetrics(history: ReadingHistoryEntry[]): ReadingSummary {
  const rows = submittedHistory(history);
  const latest = (key: keyof ReadingSummary) => rows.find(row => metricNumber(row[key], key !== 'speed') !== null)?.[key] ?? { value: null };
  return { speed: latest('speed'), accuracy: latest('accuracy'), comprehension: latest('comprehension') };
}
export function submissionDate(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Submission time unavailable';
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
