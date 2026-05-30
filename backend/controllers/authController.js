const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

// ─── Token Helpers ────────────────────────────────────────────
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const generateRefreshToken = () => {
  return uuidv4();
};

// ─── REGISTER (replaces signup) ────────────────────────────────
exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // New users always register as 'customer'
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password, // hashed by pre-save hook
      phone: phone || "",
      role: "customer",
    });

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    // Save refresh token to user
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Set refresh token as httpOnly cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── LOGIN ─────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Need to explicitly select password since it's select: false
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account has been deactivated" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    // Save refresh token and last login
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Set refresh token as httpOnly cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── SIGNUP (backward compat alias) ───────────────────────────
exports.signup = exports.register;

// ─── REFRESH TOKEN ─────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const user = await User.findOne({ refreshToken }).select("+refreshToken");
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account deactivated" });
    }

    // Rotate refresh token
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      token: newAccessToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── LOGOUT ────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    // Clear refresh token from DB
    if (req.user) {
      await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
    }

    // Clear cookie
    res.cookie("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      expires: new Date(0),
    });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET PROFILE ───────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user.toPublicJSON());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── UPDATE PROFILE ────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json(user.toPublicJSON());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── CHANGE PASSWORD ───────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const bcrypt = require("bcryptjs");
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};