import React, { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { HiViewGrid, HiCube, HiShoppingCart, HiPhotograph, HiUserGroup, HiClipboardList, HiMenu } from "react-icons/hi";
import "./AdminLayout.css";

const LINKS = [
  { path: "/admin", label: "Dashboard", icon: <HiViewGrid /> },
  { path: "/admin/products", label: "Products", icon: <HiCube /> },
  { path: "/admin/orders", label: "Orders", icon: <HiShoppingCart /> },
  { path: "/admin/design-requests", label: "Design Requests", icon: <HiPhotograph /> },
  { path: "/admin/vendors", label: "Vendors", icon: <HiUserGroup /> },
  { path: "/admin/purchase-orders", label: "Purchase Orders", icon: <HiClipboardList /> },
];

const AdminLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-sidebar-title">Admin Panel</div>
        <div className="admin-sidebar-links">
          {LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`admin-sidebar-link ${location.pathname === link.path ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>

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
