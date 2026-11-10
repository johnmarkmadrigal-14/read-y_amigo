import { authRequest } from '../../app/lib/api';
import type { ActivitySubmission, TeacherNotification, ToCheckItem } from './data';
export const getToCheck = () => authRequest<{ items: ToCheckItem[] }>('/teacher-work/to-check');
export const getNotifications = () => authRequest<{ notifications: TeacherNotification[] }>('/notifications');
export const readNotification = (id: string) => authRequest(`/notifications/${id}/read`, { method: 'PATCH', body: {} });
export const myActivities = (classId: string) => authRequest<{ submissions: ActivitySubmission[] }>(`/activities/mine?classId=${encodeURIComponent(classId)}`);
export const getActivity = (id: string) => authRequest<{ submission: ActivitySubmission; title: string }>(`/activities/${id}`);
export const checkActivity = (submission: ActivitySubmission, feedback: string) => authRequest<{ submission: ActivitySubmission }>(`/activities/${submission._id}/review`, { method: 'PATCH', body: { confirmed: true, feedback, previousCheckedAt: submission.checkedAt || null } });
