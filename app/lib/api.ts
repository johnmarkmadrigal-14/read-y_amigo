import * as SecureStore from "expo-secure-store";

// TODO: Replace with your computer's local network IP.
// Your phone and computer must be connected to the same Wi-Fi.
const API_ROOT = "http://10.72.86.152:4000/api";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

// =========================
// TYPES
// =========================

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

  author:
    | string
    | {
        _id: string;
        displayName?: string;
        firstName?: string;
        secondName?: string;
        role?: "teacher" | "learner";
      };

  title: string;
  body?: string;
  createdAt: string;
  materialId?: string | null;
};

export type ApiPostComment = {
  _id: string;
  post: string;
  class: string;
  author:
    | string
    | {
        _id: string;
        displayName?: string;
        firstName?: string;
        secondName?: string;
        role?: "teacher" | "learner";
      };
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type ClassworkType =
  | "reading"
  | "activity"
  | "quiz";

export type ReadingActivity =
  | "read-aloud"
  | "comprehension";

export type QuizQuestionType =
  | "multiple-choice"
  | "checkboxes"
  | "true-false"
  | "short-answer"
  | "essay";

export type QuizType =
  | "multiple-choice"
  | "checkboxes"
  | "true-false"
  | "short-answer"
  | "essay"
  | "mixed";

export type ApiAttachment = {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
};

export type ApiQuizQuestion = {
  _id?: string;
  type: QuizQuestionType;
  question: string;
  choices?: string[];
  correctAnswer?: number | number[] | string;
  points?: number;
};

export type ApiClasswork = {
  _id: string;
  class: string;
  title: string;
  description?: string;

  type: ClassworkType;

  dueDate?: string;

  points: number;

  attachment?: ApiAttachment | null;

  material?: string | ApiMaterial | null;

  readingActivities?: ReadingActivity[];

  quizType?: QuizType;

  questions?: ApiQuizQuestion[];

  assignToAll: boolean;

  assignedTo?: string[];

  createdAt: string;
  updatedAt?: string;
};

export type ApiMaterial = {
  _id: string;
  class: string;

  uploadedBy:
    | string
    | {
        _id: string;
        displayName?: string;
      };

  title: string;
  description?: string;

  type:
    | "document"
    | "video"
    | "link"
    | "image"
    | "other";

  fileUrl?: string;
  category?: string;

  createdAt: string;
  updatedAt: string;
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

// =========================
// REQUEST HELPERS
// =========================

async function rawFetch(
  path: string,
  init: RequestInit
): Promise<Response> {
  const url = `${API_ROOT}${path}`;

  try {
    const response = await fetch(url, init);
    return response;
  } catch (error) {
    console.log("API REQUEST FAILED");
    console.log("URL:", url);
    console.log("ERROR:", error);

    throw new Error(
      `Couldn't reach the server.\n\n` +
        `URL: ${url}\n\n` +
        `Make sure:\n` +
        `1. The backend is running\n` +
        `2. Your phone and computer are on the same Wi-Fi\n` +
        `3. The IP address is correct\n` +
        `4. Windows Firewall is allowing port 4000`
    );
  }
}

async function parseOrThrow<T>(
  res: Response
): Promise<T> {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.error ||
        data.message ||
        "Something went wrong. Please try again."
    );
  }

  return data as T;
}

// =========================
// PUBLIC REQUEST
// =========================

async function publicRequest<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await rawFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseOrThrow<T>(res);
}

// =========================
// AUTH REQUEST
// =========================

async function authRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
  } = {}
): Promise<T> {
  const token = await getStoredToken();

  if (!token) {
    throw new Error(
      "You're not logged in. Please log in again."
    );
  }

  const res = await rawFetch(path, {
    method: options.method || "GET",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },

    body: options.body
      ? JSON.stringify(options.body)
      : undefined,
  });

  return parseOrThrow<T>(res);
}

// =========================
// MULTIPART AUTH REQUEST
// =========================

async function authMultipartRequest<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const token = await getStoredToken();

  if (!token) {
    throw new Error(
      "You're not logged in. Please log in again."
    );
  }

  const res = await rawFetch(path, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${token}`,
    },

    body: formData,
  });

  return parseOrThrow<T>(res);
}

// =========================
// SESSION
// =========================

async function persistSession(
  response: AuthResponse
) {
  await SecureStore.setItemAsync(
    TOKEN_KEY,
    response.token
  );

  await SecureStore.setItemAsync(
    USER_KEY,
    JSON.stringify(response.user)
  );
}

// =========================
// AUTHENTICATION
// =========================

export async function signupTeacher(payload: {
  firstName: string;
  secondName: string;
  middleInitial: string;
  displayName: string;
  age: string;
  learnerLevel: string;
  email: string;
  password: string;
  captchaToken: string;
}) {
  const data = await publicRequest<AuthResponse>(
    "/auth/teacher-signup",
    payload
  );

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
  captchaToken: string;
}) {
  const data = await publicRequest<AuthResponse>(
    "/auth/learner-signup",
    payload
  );

  await persistSession(data);

  return data;
}

export async function login(
  identifier: string,
  password: string
) {
  const data = await publicRequest<AuthResponse>(
    "/auth/login",
    {
      identifier,
      password,
    }
  );

  await persistSession(data);

  return data;
}

export async function googleAuth(
  idToken: string,
  roleForNewAccount: "teacher" | "learner"
) {
  const data = await publicRequest<GoogleAuthResult>(
    "/auth/google",
    {
    idToken,
    role: roleForNewAccount,
    }
  );

  if ("token" in data) {
    await persistSession(data);
  }

  return data;
}

export async function completeGoogleSignup(
  payload: {
  pendingToken: string;
  firstName: string;
  secondName: string;
  middleInitial?: string;
  displayName: string;
  age: string;
  learnerLevel?: string;
  }
) {
  const data = await publicRequest<AuthResponse>(
    "/auth/google/complete-signup",
    payload
  );

  await persistSession(data);

  return data;
}

export async function getMyProfile() {
  const data = await authRequest<{ user: ApiUser }>(
    "/auth/me"
  );

  return data.user;
}

export async function updateMyProfile(
  payload: {
  firstName?: string;
  secondName?: string;
  middleInitial?: string;
  displayName?: string;
  age?: string;
  learnerLevel?: string;
  }
) {
  const data = await authRequest<{ user: ApiUser }>(
    "/auth/me",
    {
    method: "PATCH",
    body: payload,
    }
  );

  await SecureStore.setItemAsync(
    USER_KEY,
    JSON.stringify(data.user)
  );

  return data.user;
}

// =========================
// CLASS MANAGEMENT
// =========================

export async function getMyClasses() {
  const data = await authRequest<{
    classes: ApiClass[];
  }>("/classes/mine");

  return data.classes;
}

export async function getArchivedClasses() {
  const data = await authRequest<{
    classes: ApiClass[];
  }>("/classes/archived");

  return data.classes;
}

export async function createClass(
  payload: {
    title: string;
    description?: string;
  }
) {
  const data = await authRequest<{
    class: ApiClass;
  }>("/classes", {
    method: "POST",
    body: payload,
  });

  return data.class;
}

export async function getClass(
  classId: string
) {
  return authRequest<{
    class: ApiClass;
    learnerCount: number;
  }>(`/classes/${classId}`);
}

export async function updateClass(
  classId: string,
  payload: {
    title?: string;
    description?: string;
  }
) {
  const data = await authRequest<{
    class: ApiClass;
  }>(`/classes/${classId}`, {
    method: "PATCH",
    body: payload,
  });

  return data.class;
}

export async function deleteClass(
  classId: string
) {
  const data = await authRequest<{
    class: ApiClass;
  }>(`/classes/${classId}`, {
    method: "DELETE",
  });

  return data.class;
}

export async function restoreClass(
  classId: string
) {
  const data = await authRequest<{
    class: ApiClass;
  }>(`/classes/${classId}/restore`, {
    method: "PATCH",
  });

  return data.class;
}

// =========================
// REPORTS
// =========================

export async function getReports() {
  return authRequest<ApiReports>("/reports");
}


// =========================
// STREAM
// =========================

export async function getStream(
  classId: string
) {
  const data = await authRequest<{
    posts: ApiStreamPost[];
  }>(`/classes/${classId}/stream`);

  return data.posts;
}

export async function getStreamPost(
  classId: string,
  postId: string
) {
  const posts = await getStream(classId);

  return (
    posts.find(
      (post) => post._id === postId
    ) ?? null
  );
}

export async function createStreamPost(
  classId: string,
  payload: {
    title: string;
    body?: string;
  }
) {
  const data = await authRequest<{
    post: ApiStreamPost;
  }>(`/classes/${classId}/stream`, {
    method: "POST",
    body: payload,
  });

  return data.post;
}

export async function savePostAsMaterial(
  classId: string,
  postId: string
) {
  const data = await authRequest<{
    material: ApiMaterial;
  }>(
    `/classes/${classId}/stream/${postId}/save-material`,
    {
      method: "POST",
    }
  );

  return data.material;
}

// =========================
// STREAM COMMENTS
// =========================

export async function getPostComments(
  classId: string,
  postId: string
) {
  const data = await authRequest<{
    comments: ApiPostComment[];
  }>(
    `/comments/classes/${classId}/posts/${postId}`
  );

  return data.comments;
}

export async function createPostComment(
  classId: string,
  postId: string,
  body: string
) {
  const data = await authRequest<{
    comment: ApiPostComment;
  }>(
    `/comments/classes/${classId}/posts/${postId}`,
    {
    method: "POST",
      body: {
        body,
      },
    }
  );

  return data.comment;
}

export async function updatePostComment(
  classId: string,
  postId: string,
  commentId: string,
  body: string
) {
  const data = await authRequest<{
    comment: ApiPostComment;
  }>(
    `/comments/classes/${classId}/posts/${postId}/${commentId}`,
    {
      method: "PATCH",
      body: {
        body,
      },
    }
  );

  return data.comment;
}

export async function deletePostComment(
  classId: string,
  postId: string,
  commentId: string
) {
  const data = await authRequest<{
    message: string;
  }>(
    `/comments/classes/${classId}/posts/${postId}/${commentId}`,
    {
      method: "DELETE",
    }
  );

  return data;
}


// =========================
// CLASSWORK
// =========================

export type CreateClassworkPayload = {
  title: string;
  description?: string;

  type: ClassworkType;

  dueDate?: string;

  points?: number;

  material?: string | null;

  readingActivities?: ReadingActivity[];

  quizType?: QuizType;

  questions?: ApiQuizQuestion[];

  assignToAll?: boolean;

  assignedTo?: string[];
};

export async function getClasswork(
  classId: string
) {
  const data = await authRequest<{
    classwork: ApiClasswork[];
  }>(`/classes/${classId}/classwork`);

  return data.classwork;
}

function buildClassworkFormData(
  payload: CreateClassworkPayload
) {
  const formData = new FormData();

  formData.append("title", payload.title);

  formData.append(
    "description",
    payload.description || ""
  );

  formData.append("type", payload.type);

  if (payload.dueDate) {
    formData.append(
      "dueDate",
      payload.dueDate
    );
}

  formData.append(
    "points",
    String(payload.points ?? 0)
  );

  if (payload.material) {
    formData.append(
      "material",
      payload.material
    );
  }

  if (payload.readingActivities) {
    formData.append(
      "readingActivities",
      JSON.stringify(
        payload.readingActivities
      )
    );
}

  if (payload.quizType) {
    formData.append(
      "quizType",
      payload.quizType
    );
  }

  if (payload.questions) {
    formData.append(
      "questions",
      JSON.stringify(payload.questions)
    );
  }

  formData.append(
    "assignToAll",
    String(payload.assignToAll ?? true)
  );

  if (
    payload.assignedTo &&
    payload.assignedTo.length > 0
  ) {
    formData.append(
      "assignedTo",
      JSON.stringify(payload.assignedTo)
    );
  }

  return formData;
}

// Create classwork WITHOUT file
export async function createClasswork(
  classId: string,
  payload: CreateClassworkPayload
) {
  const formData =
    buildClassworkFormData(payload);

  const data =
    await authMultipartRequest<{
      classwork: ApiClasswork;
    }>(
      `/classes/${classId}/classwork`,
      formData
    );

  return data.classwork;
}

// Create classwork WITH uploaded file
export async function createClassworkWithFile(
  classId: string,
  payload: CreateClassworkPayload & {
    file: {
      uri: string;
      name: string;
      type: string;
    };
  }
): Promise<ApiClasswork> {
  const token = await getStoredToken();

  if (!token) {
    throw new Error(
      "You're not logged in. Please log in again."
    );
  }

  const formData = new FormData();

  formData.append("title", payload.title);
  formData.append(
    "description",
    payload.description || ""
  );
  formData.append("type", payload.type);
  formData.append(
    "points",
    String(payload.points ?? 0)
  );
  formData.append(
    "assignToAll",
    String(payload.assignToAll ?? true)
  );

  if (payload.dueDate) {
    formData.append(
      "dueDate",
      payload.dueDate
    );
  }

  if (payload.material) {
    formData.append(
      "material",
      payload.material
    );
  }

  if (payload.readingActivities) {
    formData.append(
      "readingActivities",
      JSON.stringify(
        payload.readingActivities
      )
    );
  }

  if (payload.quizType) {
    formData.append(
      "quizType",
      payload.quizType
    );
  }

  if (payload.questions) {
    formData.append(
      "questions",
      JSON.stringify(payload.questions)
    );
  }

  if (
    payload.assignedTo &&
    payload.assignedTo.length > 0
  ) {
    formData.append(
      "assignedTo",
      JSON.stringify(payload.assignedTo)
    );
  }

  formData.append("file", {
    uri: payload.file.uri,
    name: payload.file.name,
    type: payload.file.type,
  } as any);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(
      "POST",
      `${API_ROOT}/classes/${classId}/classwork`
    );

    xhr.setRequestHeader(
      "Authorization",
      `Bearer ${token}`
    );

    xhr.onload = () => {
      let data: any = {};

      try {
        data = JSON.parse(
          xhr.responseText || "{}"
        );
      } catch {
        data = {};
      }

      if (
        xhr.status >= 200 &&
        xhr.status < 300
      ) {
        if (data.classwork) {
          resolve(data.classwork);
        } else {
          reject(
            new Error(
              "Server did not return the created classwork."
            )
          );
        }

        return;
      }

      reject(
        new Error(
          data.error ||
            data.message ||
            `Server error (${xhr.status}).`
        )
      );
    };

    xhr.onerror = () => {
      reject(
        new Error(
          "Couldn't reach the server. Check your Wi-Fi connection and make sure the backend is running."
        )
      );
    };

    xhr.ontimeout = () => {
      reject(
        new Error(
          "The upload took too long. Please try again."
        )
      );
    };

    xhr.timeout = 60000;

    xhr.send(formData);
  });
}

// =========================
// MATERIALS LIBRARY
// =========================

export async function getMaterials(
  classId: string
) {
  const data = await authRequest<{
    materials: ApiMaterial[];
  }>(`/classes/${classId}/materials`);

  return data.materials;
}

export async function createMaterial(
  classId: string,
  payload: {
    title: string;
    description?: string;
    type?: ApiMaterial["type"];
    fileUrl?: string;
    category?: string;
  }
) {
  const data = await authRequest<{
    material: ApiMaterial;
  }>(`/classes/${classId}/materials`, {
    method: "POST",
    body: payload,
  });

  return data.material;
}

export async function updateMaterial(
  classId: string,
  materialId: string,
  payload: {
    title?: string;
    description?: string;
    type?: ApiMaterial["type"];
    fileUrl?: string;
    category?: string;
  }
) {
  const data = await authRequest<{
    material: ApiMaterial;
  }>(
    `/classes/${classId}/materials/${materialId}`,
    {
      method: "PATCH",
      body: payload,
    }
  );

  return data.material;
}

export async function deleteMaterial(
  classId: string,
  materialId: string
) {
  await authRequest<{ message: string }>(
    `/classes/${classId}/materials/${materialId}`,
    {
      method: "DELETE",
    }
  );
}

// =========================
// LEARNERS
// =========================

export async function getLearners(
  classId: string
) {
  const data = await authRequest<{
    learners: ApiEnrollment[];
  }>(`/classes/${classId}/learners`);

  return data.learners;
}

export async function getLearnerClass(classId: string) {
  return getClass(classId);
}

export async function getLearnerStream(classId: string) {
  return getStream(classId);
}

export async function getLearnerClasswork(classId: string) {
  return getClasswork(classId);
}

export async function getLearnerClassmates(classId: string) {
  return getLearners(classId);
}

// =========================
// PROGRESS
// =========================

export async function getProgress(
  classId: string
) {
  const data = await authRequest<{
    progress: ApiEnrollment[];
  }>(`/classes/${classId}/progress`);

  return data.progress;
}

// =========================
// SESSION
// =========================

export async function getStoredToken() {
  return SecureStore.getItemAsync(
    TOKEN_KEY
  );
}

export async function getStoredUser(): Promise<ApiUser | null> {
  const raw =
    await SecureStore.getItemAsync(
      USER_KEY
    );

  return raw ? JSON.parse(raw) : null;
}

export async function logout() {
  await SecureStore.deleteItemAsync(
    TOKEN_KEY
  );

  await SecureStore.deleteItemAsync(
    USER_KEY
  );
}