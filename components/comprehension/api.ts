import { authRequest } from '../../app/lib/api';
import type { ReadingPassage } from '../readingRate';
import type { Answer, Attempt, Grade, QuizConfig, QuizSet } from './types';
export const quizSets = (passage: ReadingPassage) => authRequest<{ sets: QuizSet[] }>('/comprehension/sets/search', { method: 'POST', body: { passage } });
export const saveQuizSet = (title: string, passage: ReadingPassage, quiz: QuizConfig) => authRequest<{ set: QuizSet }>('/comprehension/sets', { method: 'POST', body: { title, passage, quiz } });
export const publishComprehension = (id: string, passage: ReadingPassage, quiz: QuizConfig) => authRequest(`/comprehension/classwork/${id}/config`, { method: 'POST', body: { passage, quiz } });
export const comprehensionInfo = (id: string) => authRequest<{ available: boolean; questionCount: number; requiresReading: boolean }>(`/comprehension/classwork/${id}`);
export const startComprehension = (id: string) => authRequest<{ attempt: Attempt }>(`/comprehension/classwork/${id}/start`, { method: 'POST', body: {} });
export const saveComprehension = (attempt: Attempt, answers: Answer[], submit = false) => authRequest<{ attempt: Attempt }>(`/comprehension/attempts/${attempt._id}/${submit ? 'submit' : 'draft'}`, { method: submit ? 'POST' : 'PUT', body: { revision: attempt.revision, answers } });
export const teacherAttempts = (id: string) => authRequest<{ title: string; attempts: Attempt[] }>(`/comprehension/classwork/${id}/attempts`);
export const gradeComprehension = (attempt: Attempt, grades: Grade[]) => authRequest<{ attempt: Attempt }>(`/comprehension/attempts/${attempt._id}/grade`, { method: 'PATCH', body: { revision: attempt.revision, grades } });

export const validateComprehension = (draft: { passage: ReadingPassage; quiz: QuizConfig }) => authRequest('/comprehension/validate', { method: 'POST', body: draft });
export const teacherQuizConfig = (id: string) => authRequest<{ passage: ReadingPassage; quiz: QuizConfig | null; title: string }>(`/comprehension/classwork/${id}/config`);

export const comprehensionCompletion = (classId: string) => authRequest<{ classworkIds: string[] }>(`/comprehension/mine?classId=${encodeURIComponent(classId)}`);
