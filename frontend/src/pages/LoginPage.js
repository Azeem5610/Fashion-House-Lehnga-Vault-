import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GiDiamondRing } from "react-icons/gi";
import { HiMail, HiLockClosed, HiCheck, HiSparkles, HiStar, HiShieldCheck } from "react-icons/hi";
import "./LoginPage.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(email, password);
      // Role-aware redirect
      if (["superadmin", "inventoryManager", "productionManager", "tailor"].includes(data.role)) {
        navigate("/admin");
      } else {
        navigate("/");
      }
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
              <span>Custom Orders & Design from Picture</span>
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
              <h1>Welcome Back</h1>
              <p>
                Don't have an account?{" "}
                <Link to="/register">Create one</Link>
              </p>
            </div>

            {error && <div className="login-error">{error}</div>}

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <HiMail className="input-icon" />
                  <input
                    id="login-email"
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
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <HiLockClosed className="input-icon" />
                  <input
                    id="login-password"
                    className="form-input"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                className={`btn btn-gold btn-lg login-submit ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading && <span className="btn-spinner" />}
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div className="login-footer">
              New to Fashion House?{" "}
              <Link to="/register">Create an account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
