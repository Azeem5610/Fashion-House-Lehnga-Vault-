import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { GiDiamondRing } from "react-icons/gi";
import { HiLockClosed, HiSparkles, HiStar, HiShieldCheck } from "react-icons/hi";
import API from "../utils/api";
import { toast } from "react-toastify";
import "./ResetPasswordPage.css";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.post(`/auth/reset-password/${token}`, { password });
      toast.success(data.message || "Password reset successfully!");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired reset token. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
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
              <h1>Create New Password</h1>
              <p>Please enter your new password below.</p>
            </div>

            {error && <div className="login-error">{error}</div>}

            <form className="login-form" onSubmit={handleSubmit}>
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
                {loading ? "Resetting password..." : "Update Password"}
              </button>
            </form>

            <div className="login-footer">
              Remember your password? <Link to="/login">Back to Login</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
