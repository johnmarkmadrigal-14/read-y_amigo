import { authRequest } from '../../app/lib/api';
import type { QuizResultSummary, LearnerReadingProgress } from './data';

// These read-only DTOs are supplied by the companion backend update. Never create
// quiz attempts just to display a result, or derive accuracy from ASR matches.
export async function learnerQuizResults(classId: string): Promise<QuizResultSummary[]> {
  const data = await authRequest<{ classworkIds: string[]; attempts?: QuizResultSummary[] }>(`/comprehension/mine?classId=${encodeURIComponent(classId)}&include=results`);
  if (!Array.isArray(data.attempts)) throw new Error('Quiz scores are not available from this server yet. Please update the backend, then refresh.');
  return data.attempts;
}
export async function learnerReadingProgress(classId: string, learnerId: string): Promise<LearnerReadingProgress> {
  const data = await authRequest<LearnerReadingProgress>(`/classes/${encodeURIComponent(classId)}/progress/${encodeURIComponent(learnerId)}`);
  if (!data.learner || !Array.isArray(data.history)) throw new Error('Reading history is not available from this server yet. Please refresh after the backend update.');
  return data;
}
