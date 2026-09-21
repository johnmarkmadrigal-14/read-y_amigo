import * as SecureStore from "expo-secure-store";

// TODO: replace with your computer's local network IP (run `ipconfig` on
// Windows, look for "IPv4 Address" under your Wi-Fi adapter).
// Must match the port your Express server listens on.
// Your phone (Expo Go) and computer must be on the same Wi-Fi network.
const API_ROOT = "http://192.168.18.5:4000/api";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export type ApiUser = {
  _id: string;
  role: "teacher" | "learner";
  displayName: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
};

export type ApiClass = {
  _id: string;
  teacher: string;
  title: string;
  description?: string;
  code: string;
  status: "active" | "deleted";
  createdAt: string;
  updatedAt: string;
  learnerCount?: number;
};

export type ApiStreamPost = {
  _id: string;
  class: string;
  author: string;
  title: string;
  body?: string;
  createdAt: string;
};

export type ApiClasswork = {
  _id: string;
  class: string;
  title: string;
  description?: string;
  dueDate?: string;
  createdAt: string;
};

export type ApiEnrollment = {
  _id: string;
  class: string;
  learner: {
    _id: string;
    displayName: string;
    firstName: string;
    secondName: string;
  };
  streakDays: number;
  comprehensionAvg: number;
  createdAt: string;
};

export type ApiReportClass = {
  _id: string;
  title: string;
  code: string;
  learnerCount: number;
  avgStreakDays: number;
  avgComprehension: number;
};

export type ApiReportTotals = {
  classCount: number;
  totalLearners: number;
  avgComprehension: number;
  avgStreakDays: number;
};

export type ApiReports = {
  totals: ApiReportTotals;
  classes: ApiReportClass[];
};

type AuthResponse = {
  token: string;
  user: ApiUser;
};

type GoogleAuthResult =
  | AuthResponse
  | {
      needsProfile: true;
      pendingToken: string;
      suggestedDisplayName: string;
    };

// ── Core fetch helpers ───────────────────────────────────────────────────────

async function rawFetch(path: string, init: RequestInit) {
  try {
    return await fetch(`${API_ROOT}${path}`, init);
  } catch {
    throw new Error(
      "Couldn't reach the server. Check that your computer and phone are on the same Wi-Fi and that API_ROOT in api.ts is set correctly."
    );
  }
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data as T;
}

async function publicRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await rawFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOrThrow<T>(res);
}

async function authRequest<T>(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): Promise<T> {
  const token = await getStoredToken();
  if (!token) {
    throw new Error("You're not logged in. Please log in again.");
  }

  const res = await rawFetch(path, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return parseOrThrow<T>(res);
}

async function persistSession(response: AuthResponse) {
  await SecureStore.setItemAsync(TOKEN_KEY, response.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signupTeacher(payload: {
  firstName: string;
  secondName: string;
  middleInitial: string;
  displayName: string;
  age: string;
  learnerLevel: string;
  email: string;
  password: string;
}) {
  const data = await publicRequest<AuthResponse>("/auth/teacher-signup", payload);
  await persistSession(data);
  return data;
}

export async function signupLearner(payload: {
  firstName: string;
  secondName: string;
  middleInitial: string;
  displayName: string;
  age: string;
  username: string;
  password: string;
}) {
  const data = await publicRequest<AuthResponse>("/auth/learner-signup", payload);
  await persistSession(data);
  return data;
}

export async function login(identifier: string, password: string) {
  const data = await publicRequest<AuthResponse>("/auth/login", { identifier, password });
  await persistSession(data);
  return data;
}

export async function googleAuth(idToken: string, roleForNewAccount: "teacher" | "learner") {
  const data = await publicRequest<GoogleAuthResult>("/auth/google", {
    idToken,
    role: roleForNewAccount,
  });
  if ("token" in data) {
    await persistSession(data);
  }
  return data;
}

export async function completeGoogleSignup(payload: {
  pendingToken: string;
  firstName: string;
  secondName: string;
  middleInitial?: string;
  displayName: string;
  age: string;
  learnerLevel?: string;
}) {
  const data = await publicRequest<AuthResponse>("/auth/google/complete-signup", payload);
  await persistSession(data);
  return data;
}

export async function getMyProfile() {
  const data = await authRequest<{ user: ApiUser }>("/auth/me");
  return data.user;
}

export async function updateMyProfile(payload: {
  firstName?: string;
  secondName?: string;
  middleInitial?: string;
  displayName?: string;
  age?: string;
  learnerLevel?: string;
}) {
  const data = await authRequest<{ user: ApiUser }>("/auth/me", {
    method: "PATCH",
    body: payload,
  });
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function getStoredToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<ApiUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function logout() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

// ── Teacher: classes ─────────────────────────────────────────────────────────

export async function getMyClasses() {
  const data = await authRequest<{ classes: ApiClass[] }>("/classes/mine");
  return data.classes;
}

export async function getArchivedClasses() {
  const data = await authRequest<{ classes: ApiClass[] }>("/classes/archived");
  return data.classes;
}

export async function createClass(payload: { title: string; description?: string }) {
  const data = await authRequest<{ class: ApiClass }>("/classes", {
    method: "POST",
    body: payload,
  });
  return data.class;
}

export async function getClass(classId: string) {
  return authRequest<{ class: ApiClass; learnerCount: number }>(`/classes/${classId}`);
}

export async function updateClass(
  classId: string,
  payload: { title?: string; description?: string }
) {
  const data = await authRequest<{ class: ApiClass }>(`/classes/${classId}`, {
    method: "PATCH",
    body: payload,
  });
  return data.class;
}

export async function deleteClass(classId: string) {
  const data = await authRequest<{ class: ApiClass }>(`/classes/${classId}`, {
    method: "DELETE",
  });
  return data.class;
}

export async function restoreClass(classId: string) {
  const data = await authRequest<{ class: ApiClass }>(`/classes/${classId}/restore`, {
    method: "PATCH",
  });
  return data.class;
}

// ── Teacher: reports ─────────────────────────────────────────────────────────

export async function getReports() {
  return authRequest<ApiReports>("/reports");
}

// ── Teacher: stream ───────────────────────────────────────────────────────────

export async function getStream(classId: string) {
  const data = await authRequest<{ posts: ApiStreamPost[] }>(`/classes/${classId}/stream`);
  return data.posts;
}

export async function createStreamPost(
  classId: string,
  payload: { title: string; body?: string }
) {
  const data = await authRequest<{ post: ApiStreamPost }>(`/classes/${classId}/stream`, {
    method: "POST",
    body: payload,
  });
  return data.post;
}

// ── Teacher: classwork ────────────────────────────────────────────────────────

export async function getClasswork(classId: string) {
  const data = await authRequest<{ classwork: ApiClasswork[] }>(`/classes/${classId}/classwork`);
  return data.classwork;
}

export async function createClasswork(
  classId: string,
  payload: { title: string; description?: string; dueDate?: string }
) {
  const data = await authRequest<{ classwork: ApiClasswork }>(`/classes/${classId}/classwork`, {
    method: "POST",
    body: payload,
  });
  return data.classwork;
}

// ── Teacher: learners & progress ──────────────────────────────────────────────

export async function getLearners(classId: string) {
  const data = await authRequest<{ learners: ApiEnrollment[] }>(`/classes/${classId}/learners`);
  return data.learners;
}

export async function getProgress(classId: string) {
  const data = await authRequest<{ progress: ApiEnrollment[] }>(`/classes/${classId}/progress`);
  return data.progress;
}

// ── Learner: enrollments ──────────────────────────────────────────────────────

export async function joinClassroom(code: string) {
  const data = await authRequest<{ enrollment: ApiEnrollment; class: ApiClass }>(
    "/enrollments/join",
    { method: "POST", body: { code } }
  );
  return data;
}

export async function getMyEnrollments() {
  const data = await authRequest<{ enrollments: (ApiEnrollment & { class: ApiClass })[] }>(
    "/enrollments/mine"
  );
  return data.enrollments;
}

// ── Learner: class detail (read-only) ─────────────────────────────────────────

export async function getLearnerClass(classId: string) {
  return authRequest<{ class: ApiClass; learnerCount: number }>(`/learner/classes/${classId}`);
}

export async function getLearnerStream(classId: string) {
  const data = await authRequest<{ posts: ApiStreamPost[] }>(`/learner/classes/${classId}/stream`);
  return data.posts;
}

export async function getLearnerClasswork(classId: string) {
  const data = await authRequest<{ classwork: ApiClasswork[] }>(`/learner/classes/${classId}/classwork`);
  return data.classwork;
}

export async function getLearnerClassmates(classId: string) {
  const data = await authRequest<{ learners: ApiEnrollment[] }>(`/learner/classes/${classId}/learners`);
  return data.learners;
}