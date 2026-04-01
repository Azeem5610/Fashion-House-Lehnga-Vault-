import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GiDiamondRing } from "react-icons/gi";
import { HiMenu, HiX } from "react-icons/hi";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path ? "active" : "";

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <GiDiamondRing className="logo-icon" />
          <span>Fashion House</span>
        </Link>

        <button className="navbar-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <HiX /> : <HiMenu />}
        </button>

        <div className={`navbar-links ${menuOpen ? "open" : ""}`}>
          {user.role === "admin" ? (
            <>
              <Link to="/admin" className={isActive("/admin")} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/admin/products" className={isActive("/admin/products")} onClick={() => setMenuOpen(false)}>Products</Link>
              <Link to="/admin/orders" className={isActive("/admin/orders")} onClick={() => setMenuOpen(false)}>Orders</Link>
              <Link to="/admin/design-requests" className={isActive("/admin/design-requests")} onClick={() => setMenuOpen(false)}>Design Requests</Link>
              <Link to="/admin/vendors" className={isActive("/admin/vendors")} onClick={() => setMenuOpen(false)}>Vendors</Link>
              <Link to="/admin/purchase-orders" className={isActive("/admin/purchase-orders")} onClick={() => setMenuOpen(false)}>Purchase Orders</Link>
            </>
          ) : (
            <>
              <Link to="/" className={isActive("/")} onClick={() => setMenuOpen(false)}>Home</Link>
              <Link to="/my-orders" className={isActive("/my-orders")} onClick={() => setMenuOpen(false)}>My Orders</Link>
            </>
          )}
        </div>

        <div className="navbar-user">
          <div className="navbar-user-info">
            <div className="navbar-user-name">{user.name}</div>
            <div className="navbar-user-role">{user.role}</div>
          </div>
          <div className="navbar-avatar">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <button className="navbar-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
