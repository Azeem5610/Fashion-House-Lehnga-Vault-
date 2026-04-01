import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GiDiamondRing } from "react-icons/gi";
import { HiMail, HiLockClosed, HiUser } from "react-icons/hi";
import "./LoginPage.css";

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await login(email, password);
      } else {
        if (!name.trim()) {
          setError("Name is required");
          setLoading(false);
          return;
        }
        data = await signup(name, email, password);
      }
      // Redirect based on role
      if (data.role === "admin") {
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
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <GiDiamondRing />
            </div>
            <h1><span>Fashion House</span></h1>
            <p>Premium Bridal Collection</p>
          </div>

          <div className="login-toggle">
            <button
              className={isLogin ? "active" : ""}
              onClick={() => { setIsLogin(true); setError(""); }}
            >
              Sign In
            </button>
            <button
              className={!isLogin ? "active" : ""}
              onClick={() => { setIsLogin(false); setError(""); }}
            >
              Sign Up
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-wrapper">
                  <HiUser className="input-icon" />
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-wrapper">
                <HiMail className="input-icon" />
                <input
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
              type="submit"
              className="btn btn-gold btn-lg login-submit"
              disabled={loading}
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
