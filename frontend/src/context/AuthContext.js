import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../utils/api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Admin/staff roles that should see the admin panel
const ADMIN_ROLES = ["superadmin", "inventoryManager", "productionManager", "tailor"];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("fashionHouseUser");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("fashionHouseUser");
      }
    }
    setLoading(false);
  }, []);

  // Persist user to localStorage whenever it changes
  const persistUser = useCallback((data) => {
    localStorage.setItem("fashionHouseUser", JSON.stringify(data));
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
      await API.post("/auth/logout");
    } catch {
      // Continue logout even if API call fails
    }
    localStorage.removeItem("fashionHouseUser");
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
      const { data } = await API.post("/auth/refresh-token");
      persistUser(data);
      return data;
    } catch {
      // Refresh failed — force logout
      localStorage.removeItem("fashionHouseUser");
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
