import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute with role-based access control.
 *
 * Usage:
 *   <ProtectedRoute> — any logged-in user
 *   <ProtectedRoute allowedRoles={["superadmin", "inventoryManager"]}> — specific roles only
 *   <ProtectedRoute adminOnly> — backward compat, maps to admin roles
 */
const ADMIN_ROLES = ["superadmin", "inventoryManager", "productionManager", "tailor"];

const ProtectedRoute = ({ children, allowedRoles, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="spinner" />;

  if (!user) return <Navigate to="/login" replace />;

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
