import type { ApiSubmission } from '../app/lib/api';

export function submissionLearnerName(submission: ApiSubmission) {
  if (typeof submission.learner === 'string') return 'Learner';
  return submission.learner.displayName?.trim() ||
    `${submission.learner.firstName ?? ''} ${submission.learner.secondName ?? ''}`.trim() || 'Learner';
}

export function learnerInitials(name: string) {
  return name.trim().split(/\s+/u).filter(Boolean).slice(0, 2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase() || '?';
}

export function matchesLearnerSearch(name: string, query: string) {
  const normalize = (value: string) => value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
  return normalize(name).includes(normalize(query));
}

export function submissionDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
