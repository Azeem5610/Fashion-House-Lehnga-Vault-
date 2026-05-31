import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute with role-based access control and JWT expiry check.
 *
 * Usage:
 *   <ProtectedRoute> — any logged-in user
 *   <ProtectedRoute allowedRoles={["superadmin", "inventoryManager"]}> — specific roles only
 *   <ProtectedRoute adminOnly> — backward compat, maps to admin roles
 */
const ADMIN_ROLES = ["superadmin", "inventoryManager", "productionManager", "tailor"];

// Lightweight JWT expiration check (decode payload without verification)
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // exp is in seconds, Date.now() in ms
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

const ProtectedRoute = ({ children, allowedRoles, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="spinner" />;

  // No user or token expired → redirect to login
  if (!user || isTokenExpired(user.token)) {
    return <Navigate to="/login" replace />;
  }

  // Role check
  if (adminOnly) {
    if (!ADMIN_ROLES.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
