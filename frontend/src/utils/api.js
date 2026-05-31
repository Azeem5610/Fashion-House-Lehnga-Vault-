import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// ── Session-isolation helpers ──
// Admin and customer sessions use separate localStorage keys so that
// opening both panels in the same browser never cross-contaminates tokens.
export const STORAGE_KEY_ADMIN = "fashionHouseUser_admin";
export const STORAGE_KEY_CUSTOMER = "fashionHouseUser_customer";

// Determine which storage key applies to the current page context
export const getActiveStorageKey = () => {
  return window.location.pathname.startsWith("/admin")
    ? STORAGE_KEY_ADMIN
    : STORAGE_KEY_CUSTOMER;
};

// Read the stored user for the current context
export const getStoredUser = () => {
  const key = getActiveStorageKey();
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Track if we're already refreshing to avoid infinite loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Attach token to every request — reads from the correct role-scoped key
API.interceptors.request.use((config) => {
  const user = getStoredUser();
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

// Handle 401 errors — attempt token refresh before logout
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const storageKey = getActiveStorageKey();

    // If 401 with TOKEN_EXPIRED code and we haven't retried yet
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED" &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        // Update stored user with new token (role-scoped key)
        const stored = JSON.parse(localStorage.getItem(storageKey));
        if (stored) {
          stored.token = data.token;
          localStorage.setItem(storageKey, JSON.stringify(stored));
        }

        processQueue(null, data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed — force logout
        localStorage.removeItem(storageKey);
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For non-TOKEN_EXPIRED 401s (bad token, no token), logout immediately
    if (error.response?.status === 401) {
      localStorage.removeItem(storageKey);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default API;
