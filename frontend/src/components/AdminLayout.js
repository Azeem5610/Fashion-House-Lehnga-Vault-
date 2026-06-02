import React, { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HiViewGrid,
  HiCube,
  HiShoppingCart,
  HiPhotograph,
  HiUserGroup,
  HiClipboardList,
  HiMenu,
  HiLogout,
  HiChevronDown,
  HiCog,
  HiCollection,
  HiUsers,
  HiCalendar,
  HiStar,
  HiTruck,
  HiCurrencyDollar,
  HiOfficeBuilding,
} from "react-icons/hi";
import { GiDiamondRing } from "react-icons/gi";
import NotificationDropdown from "./NotificationDropdown";
import "./AdminLayout.css";

// Role-based navigation config
const NAV_SECTIONS = [
  {
    title: "Overview",
    links: [
      { path: "/admin", label: "Dashboard", icon: <HiViewGrid />, roles: ["superadmin", "inventoryManager", "productionManager", "tailor"] },
    ],
  },
  {
    title: "Products & Orders",
    links: [
      { path: "/admin/products", label: "Products", icon: <HiCube />, roles: ["superadmin", "productionManager"] },
      { path: "/admin/orders", label: "Orders", icon: <HiShoppingCart />, roles: ["superadmin", "productionManager"] },
      { path: "/admin/design-requests", label: "Design Requests", icon: <HiPhotograph />, roles: ["superadmin", "productionManager"] },
      { path: "/admin/order-tracking", label: "Order Tracking", icon: <HiTruck />, roles: ["superadmin", "productionManager", "tailor"] },
      { path: "/admin/riders", label: "Riders", icon: <HiTruck />, roles: ["superadmin", "productionManager"] },
    ],
  },
  {
    title: "Operations",
    links: [
      { path: "/admin/inventory", label: "Inventory", icon: <HiCollection />, roles: ["superadmin", "inventoryManager"] },
      { path: "/admin/vendors", label: "Vendors", icon: <HiUserGroup />, roles: ["superadmin", "inventoryManager"] },
      { path: "/admin/purchase-orders", label: "Purchase Orders", icon: <HiClipboardList />, roles: ["superadmin", "inventoryManager"] },
    ],
  },
  {
    title: "Team & Assets",
    links: [
      { path: "/admin/employees", label: "Employees", icon: <HiUsers />, roles: ["superadmin"] },
      { path: "/admin/machinery", label: "Machinery", icon: <HiCog />, roles: ["superadmin", "productionManager"] },
    ],
  },
  {
    title: "Customer",
    links: [
      { path: "/admin/appointments", label: "Appointments", icon: <HiCalendar />, roles: ["superadmin"] },
      { path: "/admin/reviews", label: "Reviews", icon: <HiStar />, roles: ["superadmin"] },
    ],
  },
  {
    title: "Finance",
    links: [
      { path: "/admin/cost-estimation", label: "Cost Estimation", icon: <HiCurrencyDollar />, roles: ["superadmin"] },
      { path: "/admin/rentals", label: "Shop Rentals", icon: <HiOfficeBuilding />, roles: ["superadmin"] },
      { path: "/admin/payments", label: "Payments History", icon: <HiCurrencyDollar />, roles: ["superadmin"] },
    ],
  },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  const userRole = user?.role || "customer";
  const userInitials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const formatRole = (role) => {
    const roleLabels = {
      superadmin: "Super Admin",
      inventoryManager: "Inventory Mgr",
      productionManager: "Production Mgr",
      tailor: "Tailor",
      customer: "Customer",
    };
    return roleLabels[role] || role;
  };

  const toggleSection = (title) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Filter sections/links based on user role
  const filteredSections = NAV_SECTIONS.map((section) => ({
    ...section,
    links: section.links.filter((link) => link.roles.includes(userRole)),
  })).filter((section) => section.links.length > 0);

  const isActive = (path) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="admin-layout">
      {/* Overlay for mobile */}
      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div className="admin-sidebar-header">
          <Link to="/admin" className="admin-sidebar-brand" onClick={() => setSidebarOpen(false)}>
            <div className="admin-sidebar-brand-icon">
              <GiDiamondRing />
            </div>
            <div className="admin-sidebar-brand-text">
              <h2>Fashion House</h2>
              <span>ERP Dashboard</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="admin-sidebar-nav">
          {filteredSections.map((section) => (
            <div className="admin-nav-section" key={section.title}>
              <div
                className="admin-nav-section-title"
                onClick={() => toggleSection(section.title)}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 20 }}
              >
                {section.title}
                <HiChevronDown
                  style={{
                    fontSize: "0.7rem",
                    transition: "transform 0.2s",
                    transform: collapsedSections[section.title] ? "rotate(-90deg)" : "rotate(0)",
                    opacity: 0.5,
                  }}
                />
              </div>

              {!collapsedSections[section.title] &&
                section.links.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`admin-sidebar-link ${isActive(link.path) ? "active" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
            </div>
          ))}
        </nav>

        {/* User Panel */}
        <div className="admin-sidebar-user">
          <div className="admin-sidebar-avatar">{userInitials}</div>
          <div className="admin-sidebar-user-info">
            <div className="admin-sidebar-user-name">{user?.name || "User"}</div>
            <div className="admin-sidebar-user-role">{formatRole(userRole)}</div>
          </div>
          <button className="admin-sidebar-logout" onClick={handleLogout} title="Logout">
            <HiLogout />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-content">
        <div className="admin-content-topbar">
          <NotificationDropdown />
        </div>
        <Outlet />
      </main>

      {/* Mobile Toggle */}
      <button
        className="admin-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <HiMenu />
      </button>
    </div>
  );
};

export default AdminLayout;
