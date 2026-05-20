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
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", register);
router.post("/signup", signup); // backward compat
router.post("/login", login);
router.post("/refresh-token", refreshToken);

// Protected routes
router.post("/logout", protect, logout);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;