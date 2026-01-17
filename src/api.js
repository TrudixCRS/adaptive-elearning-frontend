const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

// ✅ Named exports (your App.jsx imports these)
export function getToken() {
  return localStorage.getItem("token") || "";
}

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request(path, opts = {}) {
  const url = `${API_BASE}${path}`;

  const headers = {
    ...(opts.headers || {}),
  };

  // Only set JSON content-type when sending a JSON body
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (opts.auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data &&
        data.detail &&
        (typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail))) ||
      (typeof data === "string" ? data : JSON.stringify(data)) ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// ✅ Keep your api object as-is, just add me() and fix /courses redirect
export const api = {
  getToken,
  setToken,
  clearToken,

  register: (email, password, full_name) =>
    request(
      `/auth/register?email=${encodeURIComponent(email)}&password=${encodeURIComponent(
        password
      )}&full_name=${encodeURIComponent(full_name)}`,
      { method: "POST" }
    ),

  login: (email, password) =>
    request(
      `/auth/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(
        password
      )}`,
      { method: "POST" }
    ),

  // ✅ role check
  me: () => request(`/auth/me`, { auth: true }),

  // ✅ Use /courses (no trailing slash) to avoid 307 redirects
  listCourses: () => request("/courses"),
  getCourse: (courseId) => request(`/courses/${courseId}`),
  getLesson: (lessonId) => request(`/lessons/${lessonId}`),

  nextRecommendation: (courseId, mode) =>
    request(`/recommendation/next?course_id=${courseId}&mode=${mode}`, {
      auth: true,
    }),

  markCompleted: (lessonId, score = null) => {
    const qs = score !== null ? `&score=${encodeURIComponent(score)}` : "";
    return request(`/progress/complete?lesson_id=${lessonId}${qs}`, {
      method: "POST",
      auth: true,
    });
  },

  getMyProgress: () => request(`/progress/me`, { auth: true }),
};
