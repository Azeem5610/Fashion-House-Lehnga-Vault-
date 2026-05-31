const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const sendEmail = require("../services/emailService");
const TokenBlacklist = require("../models/TokenBlacklist");


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
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
    res.cookie("refreshToken", refreshToken, {
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
    // Blacklist the current access token so it cannot be reused after logout
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        // Decode without verifying to extract expiry (token is already validated by protect middleware)
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          const expiresAt = new Date(decoded.exp * 1000); // exp is in seconds
          await TokenBlacklist.create({
            token,
            expiresAt,
            revokedBy: req.user?.id,
          });
        }
      } catch (blacklistErr) {
        // Non-critical — log but don't block logout
        console.warn("Failed to blacklist token on logout:", blacklistErr.message);
      }
    }

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

// ─── FORGOT PASSWORD ───────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // To prevent email enumeration, return success message even if email is not found
      return res.json({ message: "If an account with that email exists, an OTP code has been sent." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP and set expiry (10 minutes)
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // ── ALWAYS PRINT TO CONSOLE LOG (Render logs retrieval) ──
    console.log("\n====================================================================");
    console.log("🔑  [PASSWORD RESET OTP] - VERIFICATION CODE:");
    console.log(`Email:   ${user.email}`);
    console.log(`OTP:     ${otp}`);
    console.log(`Expires: In 10 minutes`);
    console.log("====================================================================\n");

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #b59410; margin: 0; font-size: 24px;">Fashion House</h2>
          <span style="font-size: 12px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase;">Lehnga Vault</span>
        </div>
        <h3 style="color: #1f2937; margin-bottom: 10px;">Verification Code</h3>
        <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
          Hello ${user.name || "there"},<br/><br/>
          Use the following One-Time Password (OTP) to reset your password. Do not share this code with anyone.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f3f4f6; color: #111827; letter-spacing: 4px; font-family: monospace; font-size: 32px; font-weight: bold; padding: 16px; border-radius: 8px; display: inline-block; border: 1px dashed #b59410;">
            ${otp}
          </div>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          This OTP will expire in 10 minutes. If you did not request this, please ignore this email.
        </p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;"/>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          &copy; ${new Date().getFullYear()} Fashion House. All rights reserved.
        </p>
      </div>
    `;

    const textMessage = `Hello,\n\nUse the following One-Time Password (OTP) to reset your password:\n\n${otp}\n\nThis OTP is valid for 10 minutes. If you did not request this, please ignore this email.`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Verification Code - Fashion House",
        text: textMessage,
        html: htmlMessage,
      });

      res.json({ message: "OTP verification code sent. Please check your email (or Render logs)." });
    } catch (err) {
      // Don't clear token if email fails, because the user can still read it from logs
      res.json({ message: "OTP generated. (Fallback to Render/console logs if delivery fails)." });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── RESET PASSWORD (with OTP) ───────────────────────────────────
exports.resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;

  try {
    if (!email || !otp || !password) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or OTP" });
    }

    // Get hashed version of incoming OTP
    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp.trim())
      .digest("hex");

    if (user.resetPasswordToken !== hashedOtp || !user.resetPasswordExpire || user.resetPasswordExpire < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired verification code (OTP)" });
    }

    // Set new password
    user.password = password; // pre-save hook hashes password
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: "Password reset successful! You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};