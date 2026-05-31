import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HiMenu, HiX, HiSparkles, HiLightningBolt } from "react-icons/hi";
import NotificationDropdown from "./NotificationDropdown";
import "./Navbar.css";

// Admin/staff roles that see the admin sidebar
const ADMIN_ROLES = ["superadmin", "inventoryManager", "productionManager", "tailor"];

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path ? "active-menu" : "";

  if (!user) return null;

  const userInitial = user.name?.charAt(0).toUpperCase() || "?";
  const isAdminUser = ADMIN_ROLES.includes(user.role);

  return (
    <header className="site-header">
      {/* Main Navigation — NO announcement bar */}
      <nav className={`main-nav ${scrolled ? "nav-scrolled" : ""}`}>
        <div className="container nav-inner">
          {/* Logo */}
          <Link to="/" className="nav-logo">
            <span className="logo-text">Fashion House</span>
          </Link>

          {/* Desktop Menu */}
          <div className={`nav-menu ${menuOpen ? "open" : ""}`}>
            <ul className="nav-links">
              {isAdminUser ? (
                <>
                  <li><Link to="/admin" className={isActive("/admin")} onClick={() => setMenuOpen(false)}>Dashboard</Link></li>
                  <li><Link to="/admin/products" className={isActive("/admin/products")} onClick={() => setMenuOpen(false)}>Products</Link></li>
                  <li><Link to="/admin/orders" className={isActive("/admin/orders")} onClick={() => setMenuOpen(false)}>Orders</Link></li>
                  <li><Link to="/admin/design-requests" className={isActive("/admin/design-requests")} onClick={() => setMenuOpen(false)}>Design Requests</Link></li>
                  <li><Link to="/admin/vendors" className={isActive("/admin/vendors")} onClick={() => setMenuOpen(false)}>Vendors</Link></li>
                  <li><Link to="/admin/purchase-orders" className={isActive("/admin/purchase-orders")} onClick={() => setMenuOpen(false)}>Purchase Orders</Link></li>
                </>
              ) : (
                <>
                  <li><Link to="/" className={isActive("/")} onClick={() => setMenuOpen(false)}>Home</Link></li>
                  <li><Link to="/category/ready-made/fabrics" onClick={() => setMenuOpen(false)}>Ready-Made</Link></li>
                  <li><Link to="/category/customized/fabrics" onClick={() => setMenuOpen(false)}>Customized</Link></li>
                  <li><Link to="/design-from-picture" className={isActive("/design-from-picture")} onClick={() => setMenuOpen(false)}>Upload Design</Link></li>
                  <li><Link to="/my-orders" className={isActive("/my-orders")} onClick={() => setMenuOpen(false)}>My Orders</Link></li>
                  <li><Link to="/appointments" className={isActive("/appointments")} onClick={() => setMenuOpen(false)}>Appointments</Link></li>
                  <li><Link to="/wishlist" className={isActive("/wishlist")} onClick={() => setMenuOpen(false)}>Wishlist</Link></li>
                  <li>
                    <Link
                      to="/style-finder"
                      className={`nav-tryon-link ${isActive("/style-finder")}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <HiLightningBolt />
                      Style Finder
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Right actions */}
          <div className="nav-actions">
            <NotificationDropdown />
            <Link to="/profile" className="nav-avatar" title={user.name}>
              {userInitial}
            </Link>
            <button className="nav-logout-btn" onClick={handleLogout}>
              Logout
            </button>
            <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
              {menuOpen ? <HiX /> : <HiMenu />}
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
