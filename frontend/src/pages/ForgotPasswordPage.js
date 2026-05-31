import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GiDiamondRing } from "react-icons/gi";
import { HiMail, HiSparkles, HiStar, HiShieldCheck, HiArrowLeft, HiLockClosed } from "react-icons/hi";
import API from "../utils/api";
import { toast } from "react-toastify";
import "./ForgotPasswordPage.css";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Request OTP, Step 2: Verification & Reset

  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const { data } = await API.post("/auth/forgot-password", { email });
      toast.success(data.message || "OTP code sent successfully!");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.post("/auth/reset-password", {
        email,
        otp,
        password,
      });
      toast.success(data.message || "Password reset successfully!");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      {/* Left Brand Panel */}
      <div className="login-brand-panel">
        <div className="login-particles">
          <div className="login-particle" />
          <div className="login-particle" />
          <div className="login-particle" />
          <div className="login-particle" />
          <div className="login-particle" />
        </div>

        <div className="login-brand-content">
          <div className="login-brand-icon">
            <GiDiamondRing />
          </div>
          <h1><span>Fashion House</span></h1>
          <p>Your premier destination for exquisite bridal couture. Crafted with passion, designed for perfection.</p>

          <div className="login-brand-features">
            <div className="login-brand-feature">
              <div className="login-brand-feature-icon"><HiSparkles /></div>
              <span>Premium Handcrafted Bridal Designs</span>
            </div>
            <div className="login-brand-feature">
              <div className="login-brand-feature-icon"><HiStar /></div>
              <span>7 Exquisite Fabric Collections</span>
            </div>
            <div className="login-brand-feature">
              <div className="login-brand-feature-icon"><HiShieldCheck /></div>
              <span>Secure Account Protection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="login-form-panel">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <Link to="/login" className="back-to-login">
                <HiArrowLeft /> Back to Login
              </Link>
              <h1 style={{ marginTop: "16px" }}>Reset Password</h1>
              <p>
                {step === 1
                  ? "Enter your email address and we'll send you a verification code (OTP)."
                  : "Enter the 6-digit OTP code printed in your logs/email and choose a new password."}
              </p>
            </div>

            {step === 1 ? (
              <form className="login-form" onSubmit={handleRequestOtp}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-wrapper">
                    <HiMail className="input-icon" />
                    <input
                      id="forgot-email"
                      className="form-input"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  id="forgot-submit"
                  type="submit"
                  className={`btn btn-gold btn-lg login-submit ${loading ? "loading" : ""}`}
                  disabled={loading}
                >
                  {loading && <span className="btn-spinner" />}
                  {loading ? "Requesting OTP..." : "Send Verification Code"}
                </button>
              </form>
            ) : (
              <form className="login-form" onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label className="form-label">Verification Code (6-digit OTP)</label>
                  <div className="input-wrapper">
                    <HiShieldCheck className="input-icon" />
                    <input
                      id="reset-otp"
                      className="form-input"
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="input-wrapper">
                    <HiLockClosed className="input-icon" />
                    <input
                      id="reset-password"
                      className="form-input"
                      type="password"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <div className="input-wrapper">
                    <HiLockClosed className="input-icon" />
                    <input
                      id="reset-confirm-password"
                      className="form-input"
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  id="reset-submit"
                  type="submit"
                  className={`btn btn-gold btn-lg login-submit ${loading ? "loading" : ""}`}
                  disabled={loading}
                >
                  {loading && <span className="btn-spinner" />}
                  {loading ? "Resetting Password..." : "Update Password"}
                </button>

                <button
                  type="button"
                  className="btn btn-link btn-block"
                  style={{ marginTop: "12px", color: "#6b7280" }}
                  onClick={() => setStep(1)}
                >
                  Change Email / Resend OTP
                </button>
              </form>
            )}

            <div className="login-footer">
              Need assistance? Contact support at <a href="mailto:support@fashionhouse.com">support@fashionhouse.com</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
