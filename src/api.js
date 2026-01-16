const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("token") || "";
}
function setToken(token) {
  localStorage.setItem("token", token);
}
function clearToken() {
  localStorage.removeItem("token");
}

async function request(path, opts = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  if (opts.auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
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
      (data && data.detail && (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail))) ||
      (typeof data === "string" ? data : JSON.stringify(data)) ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

export const api = {
  // token helpers (used by App.jsx)
  getToken,
  setToken,
  clearToken,

  register: (email, password, full_name) =>
    request(
      `/auth/register?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&full_name=${encodeURIComponent(full_name)}`,
      { method: "POST" }
    ),

  login: (email, password) =>
    request(`/auth/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, { method: "POST" }),

  listCourses: () => request("/courses"),
  getCourse: (courseId) => request(`/courses/${courseId}`),
  getLesson: (lessonId) => request(`/lessons/${lessonId}`),

  nextRecommendation: (courseId, mode) =>
    request(`/recommendation/next?course_id=${courseId}&mode=${mode}`, { auth: true }),

  markCompleted: (lessonId, score = null) => {
    const qs = score !== null ? `&score=${encodeURIComponent(score)}` : "";
    return request(`/progress/complete?lesson_id=${lessonId}${qs}`, { method: "POST", auth: true });
  },

  // optional but useful for UI later
  getMyProgress: () => request(`/progress/me`, { auth: true }),
};
