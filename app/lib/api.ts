import * as SecureStore from "expo-secure-store";

// TODO: replace with your computer's local network IP (run `ipconfig` on
// Windows, look for "IPv4 Address" under your Wi-Fi adapter).
// Must match the port your Express server listens on.
// Your phone (Expo Go) and computer must be on the same Wi-Fi network.
const API_ROOT = "http://192.168.18.86:4000/api";

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
  // Only present on responses that compute it (getMyClasses, getClass) -
  // not on create/update, which return the raw document.
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

// One row of the cross-class analytics breakdown.
export type ApiReportClass = {
  _id: string;
  title: string;
  code: string;
  learnerCount: number;
  avgStreakDays: number;
  avgComprehension: number;
};

// Aggregate stats across all of the teacher's active classes.
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

// /auth/google can return either a completed login (existing account) or
// a signal that the app must collect more info before the account exists.
type GoogleAuthResult =
  | AuthResponse
  | {
      needsProfile: true;
      pendingToken: string;
      suggestedDisplayName: string;
    };

async function rawFetch(path: string, init: RequestInit) {
  try {
    return await fetch(`${API_ROOT}${path}`, init);
  } catch {
    // Fetch itself failed — almost always networking/config, not a bad
    // request, so give a message that points at the actual cause.
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

// For public endpoints that don't require a token (signup/login).
async function publicRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await rawFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOrThrow<T>(res);
}

// For endpoints that require the logged-in user's token.
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

// Signs in with a Google ID token. If an account already exists for this
// Google user, this resolves to a completed login (session is persisted).
// If not, it resolves to { needsProfile: true, pendingToken, ... } — no
// account exists yet, so nothing is persisted; call completeGoogleSignup
// next with the pendingToken plus the missing fields.
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

// Finishes a Google sign-up started by googleAuth, once the app has
// collected the fields Google doesn't provide (name parts, age).
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

// Fetches the logged-in user's own profile fresh from the server.
export async function getMyProfile() {
  const data = await authRequest<{ user: ApiUser }>("/auth/me");
  return data.user;
}

// Updates the logged-in user's own profile. Only send the fields you want
// changed - anything omitted is left as-is on the server.
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
  // Keep the locally stored user in sync so other screens reading
  // getStoredUser() see the update without needing a fresh fetch.
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

// Fetches the logged-in teacher's own active classes, each with a
// learnerCount attached.
export async function getMyClasses() {
  const data = await authRequest<{ classes: ApiClass[] }>("/classes/mine");
  return data.classes;
}

// Fetches the logged-in teacher's archived (soft-deleted) classes, each
// with a learnerCount attached. Powers the "Archived classes" screen,
// which pairs with restoreClass() below to bring a class back.
export async function getArchivedClasses() {
  const data = await authRequest<{ classes: ApiClass[] }>("/classes/archived");
  return data.classes;
}

// Creates a new class owned by the logged-in teacher.
export async function createClass(payload: { title: string; description?: string }) {
  const data = await authRequest<{ class: ApiClass }>("/classes", {
    method: "POST",
    body: payload,
  });
  return data.class;
}

// Fetches a single class's details, including its current learner count.
export async function getClass(classId: string) {
  return authRequest<{ class: ApiClass; learnerCount: number }>(`/classes/${classId}`);
}

// Updates a class's title/description. Omit a field to leave it unchanged.
// The join code can't be changed here - it's immutable once created.
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

// Soft-deletes a class (shown in the app as "Archive"): marks it "deleted"
// so it disappears from getMyClasses and stops being accessible via the
// API, but nothing is actually removed server-side (enrollments, stream
// posts, and classwork all stay intact). Returns the updated class for
// confirmation. Pairs with restoreClass() below.
export async function deleteClass(classId: string) {
  const data = await authRequest<{ class: ApiClass }>(`/classes/${classId}`, {
    method: "DELETE",
  });
  return data.class;
}

// Restores a previously archived (soft-deleted) class back to "active",
// so it reappears in getMyClasses.
export async function restoreClass(classId: string) {
  const data = await authRequest<{ class: ApiClass }>(`/classes/${classId}/restore`, {
    method: "PATCH",
  });
  return data.class;
}

// Cross-class analytics: a per-class breakdown (learner count, avg streak,
// avg comprehension) plus overall totals, across all of the teacher's
// active classes.
export async function getReports() {
  return authRequest<ApiReports>("/reports");
}

// Stream tab
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

// Classwork tab
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

// Learners tab
export async function getLearners(classId: string) {
  const data = await authRequest<{ learners: ApiEnrollment[] }>(`/classes/${classId}/learners`);
  return data.learners;
}

// Progress tab
export async function getProgress(classId: string) {
  const data = await authRequest<{ progress: ApiEnrollment[] }>(`/classes/${classId}/progress`);
  return data.progress;
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