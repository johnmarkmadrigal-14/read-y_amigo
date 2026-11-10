import type { ReadingHistoryEntry } from '../progress/data';
export type ReportMetric = { value: number | null; learnerCount: number; provisionalCount: number };
export type ReportMetrics = Record<'speed' | 'accuracy' | 'comprehension', ReportMetric>;
export type ReportsData = {
  updatedAt: string; availableClasses: { _id: string; title: string }[];
  totals: { classCount: number; totalLearners: number; withSubmissions: number; metrics: ReportMetrics; avgComprehension: number | null };
  classes: { _id: string; title: string; learnerCount: number; withSubmissions: number; metrics: ReportMetrics }[];
  levels: { Independent: number; Instructional: number; Frustration: number };
  trend: { date: string; metrics: ReportMetrics }[];
};
export type ReportPeriod = 'All time' | 'This month' | 'Last month';
export function periodQuery(period: ReportPeriod, now = new Date()) {
  if (period === 'All time') return '';
  const month = now.getMonth() - (period === 'Last month' ? 1 : 0);
  const from = new Date(now.getFullYear(), month, 1).toISOString();
  const to = new Date(now.getFullYear(), month + 1, 1).toISOString();
  return `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}
export function reportTrendRows(data: ReportsData): ReadingHistoryEntry[] {
  return data.trend.map(point => ({ id: point.date, classworkId: '', title: 'Learner average', submittedAt: `${point.date}T04:00:00Z`, activities: [],
    speed: { value: point.metrics.speed.value }, accuracy: { value: point.metrics.accuracy.value }, comprehension: { value: point.metrics.comprehension.value } })).reverse();
}
