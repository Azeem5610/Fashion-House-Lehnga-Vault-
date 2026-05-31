const express = require("express");
const router = express.Router();
const {
  register,
  signup,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");

// Validation schemas
const registerSchema = {
  body: {
    email: { required: true, type: "email" },
    password: { required: true, minLength: 6 },
    name: { required: true },
  },
};

const loginSchema = {
  body: {
    email: { required: true, type: "email" },
    password: { required: true },
  },
};

const changePasswordSchema = {
  body: {
    currentPassword: { required: true },
    newPassword: { required: true, minLength: 6 },
  },
};

// Public routes
router.post("/register", validate(registerSchema), register);
router.post("/signup", validate(registerSchema), signup); // backward compat
router.post("/login", validate(loginSchema), login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.post("/logout", protect, logout);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, [protect, validate(changePasswordSchema)], changePassword);

module.exports = router;