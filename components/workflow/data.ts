export type WorkKind = 'reading' | 'activity' | 'comprehension' | 'quiz';
export type ToCheckItem = {
  _id: string; kind: WorkKind; status: string; learnerId: string; learnerName: string;
  title: string; classId: string; classTitle: string; classworkId: string;
  submissionId?: string; attemptId?: string; submittedAt: string;
};
export type TeacherNotification = {
  _id: string; kind: WorkKind | 'joined'; actorId: string; actorName: string;
  classId: string; classTitle: string; title: string; submissionId?: string;
  classworkId?: string; attemptId?: string; createdAt: string; readAt?: string | null;
};
export type ActivitySubmission = {
  _id: string; class: string; classwork: string; learner: string | { _id: string; displayName?: string; firstName?: string; secondName?: string };
  text: string; attachment?: { name: string; url: string; mimeType?: string; size?: number };
  submittedAt: string; checkedAt?: string; feedback?: string;
};
export function workLabel(kind: WorkKind | 'joined') {
  return kind === 'reading' ? 'Read-aloud' : kind === 'activity' ? 'Activity' : kind === 'comprehension' ? 'Comprehension' : kind === 'quiz' ? 'Classroom quiz' : 'New learner';
}
export function workDestination(item: Pick<ToCheckItem, 'kind' | 'classId' | 'classworkId' | 'submissionId' | 'attemptId'> | TeacherNotification) {
  if (item.kind === 'joined') return { pathname: '/teacher/class/[id]' as const, params: { id: item.classId, tab: 'Learners' } };
  if (item.kind === 'reading' && item.submissionId && item.classworkId) return { pathname: '/teacher/classwork/submission/[id]' as const, params: { id: item.submissionId, classworkId: item.classworkId } };
  if (item.kind === 'activity' && item.submissionId) return { pathname: '/teacher/classwork/activity/[id]' as const, params: { id: item.submissionId } };
  if (item.kind === 'comprehension' && item.classworkId) return { pathname: '/teacher/classwork/comprehension/[id]' as const, params: { id: item.classworkId, attemptId: item.attemptId } };
  if (item.kind === 'quiz' && item.classworkId) return { pathname: '/teacher/classwork/quiz/[id]' as const, params: { id: item.classworkId, attemptId: item.attemptId } };
  return { pathname: '/teacher/class/[id]' as const, params: { id: item.classId } };
}
export function readingReviewed(submission: { verification?: { verifiedAt?: string }; readingRate?: { status: string } | null; wordAccuracy?: { reviewedAt?: string } }) {
  return !!submission.verification?.verifiedAt || (submission.readingRate?.status === 'reviewed' && !!submission.wordAccuracy?.reviewedAt);
}
