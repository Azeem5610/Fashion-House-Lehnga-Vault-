const jwt = require("jsonwebtoken");
const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");

// Protect routes — verify JWT and attach user to req
exports.protect = async (req, res, next) => {
  let token = req.headers.authorization;

  if (token && token.startsWith("Bearer")) {
    try {
      token = token.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if token has been blacklisted (user logged out)
      const isBlacklisted = await TokenBlacklist.findOne({ token });
      if (isBlacklisted) {
        return res.status(401).json({ message: "Token has been revoked. Please log in again.", code: "TOKEN_REVOKED" });
      }

      // Attach full user info (excluding password & refreshToken)
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: "User no longer exists" });
      }
      if (!user.isActive) {
        return res.status(403).json({ message: "Account has been deactivated" });
      }

      req.user = {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
      };
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired", code: "TOKEN_EXPIRED" });
      }
      res.status(401).json({ message: "Not authorized, token invalid" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Role-based authorization middleware factory
// Usage: roleAuth("superadmin", "inventoryManager")
exports.roleAuth = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }
    next();
  };
};

// Backward compatibility — adminOnly grants access to all staff roles
exports.adminOnly = (req, res, next) => {
  const adminRoles = ["superadmin", "inventoryManager", "productionManager", "tailor"];
  if (req.user && adminRoles.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: "Admin access only" });
  }
};

// Bug #21: Finance-only access — restricts payment/refund routes to financial roles
exports.financeOnly = (req, res, next) => {
  const financeRoles = ["superadmin", "inventoryManager"];
  if (req.user && financeRoles.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: "Finance access only. Tailors and production managers cannot access payment operations." });
  }
};