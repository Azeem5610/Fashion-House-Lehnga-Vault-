import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import API, {
  STORAGE_KEY_ADMIN,
  STORAGE_KEY_CUSTOMER,
  getActiveStorageKey,
  getSessionType,
  getActiveSessionType,
} from "../utils/api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Admin/staff roles that should see the admin panel
const ADMIN_ROLES = ["superadmin", "inventoryManager", "productionManager", "tailor"];

// ── Helpers ──

// Determine the correct storage key for a given user role
const storageKeyForRole = (role) =>
  ADMIN_ROLES.includes(role) ? STORAGE_KEY_ADMIN : STORAGE_KEY_CUSTOMER;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, load user from the storage key that matches the current path
  useEffect(() => {
    const key = getActiveStorageKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(key);
      }
    }
    setLoading(false);
  }, []);

  // Persist user to the correct role-scoped localStorage key
  const persistUser = useCallback((data) => {
    const key = storageKeyForRole(data.role);
    localStorage.setItem(key, JSON.stringify(data));
    setUser(data);
  }, []);

  const login = async (email, password) => {
    const { data } = await API.post("/auth/login", { email, password });
    persistUser(data);
    return data;
  };

  const register = async (name, email, password, phone) => {
    const { data } = await API.post("/auth/register", { name, email, password, phone });
    persistUser(data);
    return data;
  };

  // Keep backward compat
  const signup = async (name, email, password) => {
    const { data } = await API.post("/auth/signup", { name, email, password });
    persistUser(data);
    return data;
  };

  const logout = async () => {
    try {
      // Pass sessionType so the backend clears the correct scoped cookie
      const sessionType = user ? getSessionType(user.role) : getActiveSessionType();
      await API.post(`/auth/logout?sessionType=${sessionType}`);
    } catch {
      // Continue logout even if API call fails
    }
    // Clear only the storage key for the current context
    const key = getActiveStorageKey();
    localStorage.removeItem(key);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const { data } = await API.put("/auth/profile", profileData);
    // Merge updated profile with existing token data
    const updated = { ...user, ...data };
    persistUser(updated);
    return updated;
  };

  const refreshToken = async () => {
    try {
      const sessionType = user ? getSessionType(user.role) : getActiveSessionType();
      const { data } = await API.post(`/auth/refresh-token?sessionType=${sessionType}`);
      persistUser(data);
      return data;
    } catch {
      // Refresh failed — force logout
      const key = getActiveStorageKey();
      localStorage.removeItem(key);
      setUser(null);
      return null;
    }
  };

  // Helper to check if user has admin-level role
  const isAdmin = user && ADMIN_ROLES.includes(user.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        login,
        register,
        signup,
        logout,
        updateProfile,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
