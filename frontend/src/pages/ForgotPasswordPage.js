import React, { useState } from "react";
import { Link } from "react-router-dom";
import { GiDiamondRing } from "react-icons/gi";
import { HiMail, HiSparkles, HiStar, HiShieldCheck, HiArrowLeft } from "react-icons/hi";
import API from "../utils/api";
import { toast } from "react-toastify";
import "./ForgotPasswordPage.css";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const { data } = await API.post("/auth/forgot-password", { email });
      toast.success(data.message || "Reset link sent!");
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong. Please try again.");
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
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {submitted ? (
              <div className="forgot-success-card">
                <div className="success-icon">✉️</div>
                <h3>Check your inbox</h3>
                <p>
                  If an account is associated with <strong>{email}</strong>, we have sent a secure link to reset your password.
                </p>
                <button 
                  className="btn btn-gold btn-lg btn-block" 
                  style={{ marginTop: "24px" }}
                  onClick={() => setSubmitted(false)}
                >
                  Resend Email
                </button>
              </div>
            ) : (
              <form className="login-form" onSubmit={handleSubmit}>
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
                  {loading ? "Sending link..." : "Send Reset Link"}
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
