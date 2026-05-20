import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

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

// Attach token to every request
API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("fashionHouseUser"));
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
          "http://localhost:5000/api/auth/refresh-token",
          {},
          { withCredentials: true }
        );

        // Update stored user with new token
        const stored = JSON.parse(localStorage.getItem("fashionHouseUser"));
        if (stored) {
          stored.token = data.token;
          localStorage.setItem("fashionHouseUser", JSON.stringify(stored));
        }

        processQueue(null, data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed — force logout
        localStorage.removeItem("fashionHouseUser");
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
      localStorage.removeItem("fashionHouseUser");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default API;
