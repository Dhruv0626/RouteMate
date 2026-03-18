import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Auto Token Refresh & Logout Logic ────────────────────────────────────────
// On ANY 401 from a protected endpoint:
//   1. Try to refresh the access token using the refresh cookie
//   2. If refresh succeeds → retry the original request seamlessly
//   3. If refresh fails → clear session and redirect to sign-in
const AUTH_ENDPOINTS = ["/users/signin", "/users/register", "/users/refresh-token", "/users/logout"];
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

const forceLogout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("csrfToken");
  
  const publicPaths = ["/signin", "/signup", "/forgot-password", "/admin/signin", "/admin/signup"];
  const isPublicPage = publicPaths.some(path => window.location.pathname.includes(path));

  if (!isPublicPage && window.location.pathname !== "/") {
    window.location.href = "/signin";
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || "";

    const isAuthEndpoint = AUTH_ENDPOINTS.some((url) => requestUrl.includes(url));

    // Skip refresh logic for auth endpoints and already-retried requests
    if (status !== 401 || isAuthEndpoint || originalRequest._retry) {
      // For non-retryable 401s that aren't auth endpoints, force logout
      if (status === 401 && !isAuthEndpoint && originalRequest._retry) {
        forceLogout();
      }
      return Promise.reject(error);
    }

    // ── Attempt token refresh ───────────────────────────────────────────
    if (isRefreshing) {
      // Another request is already refreshing — wait in queue
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => api(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await api.post("/users/refresh-token");
      isRefreshing = false;
      processQueue(null);
      return api(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      processQueue(refreshError);
      forceLogout();
      return Promise.reject(refreshError);
    }
  }
);

export default api;

