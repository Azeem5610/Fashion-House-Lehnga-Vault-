import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GiDiamondRing } from "react-icons/gi";
import { HiMail, HiLockClosed, HiUser, HiPhone, HiSparkles, HiStar, HiShieldCheck } from "react-icons/hi";
import "./RegisterPage.css";

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password, phone);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
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
          <p>Join our exclusive community and explore the finest bridal couture collections crafted just for you.</p>

          <div className="login-brand-features">
            <div className="login-brand-feature">
              <div className="login-brand-feature-icon"><HiSparkles /></div>
              <span>Browse Premium Bridal Collections</span>
            </div>
            <div className="login-brand-feature">
              <div className="login-brand-feature-icon"><HiStar /></div>
              <span>Track Your Custom Orders</span>
            </div>
            <div className="login-brand-feature">
              <div className="login-brand-feature-icon"><HiShieldCheck /></div>
              <span>Book Exclusive Appointments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="login-form-panel">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <div className="login-header-mobile-logo">
                <GiDiamondRing />
              </div>
              <h1>Create Account</h1>
              <p>
                Already have an account?{" "}
                <Link to="/login">Sign in</Link>
              </p>
            </div>

            {error && <div className="login-error">{error}</div>}

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-wrapper">
                  <HiUser className="input-icon" />
                  <input
                    id="register-name"
                    className="form-input"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <HiMail className="input-icon" />
                  <input
                    id="register-email"
                    className="form-input"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
                <div className="input-wrapper">
                  <HiPhone className="input-icon" />
                  <input
                    id="register-phone"
                    className="form-input"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <HiLockClosed className="input-icon" />
                  <input
                    id="register-password"
                    className="form-input"
                    type="password"
                    placeholder="Create a password (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-wrapper">
                  <HiLockClosed className="input-icon" />
                  <input
                    id="register-confirm-password"
                    className="form-input"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                id="register-submit"
                type="submit"
                className={`btn btn-gold btn-lg login-submit ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading && <span className="btn-spinner" />}
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <div className="login-footer">
              Already have an account?{" "}
              <Link to="/login">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
