import React, { useState, useRef, useEffect } from "react";
import { useNotifications } from "../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import { HiBell, HiCheck, HiTrash, HiX } from "react-icons/hi";
import "./NotificationDropdown.css";

const NOTIFICATION_ICONS = {
  order: "🛒",
  stock: "📦",
  appointment: "📅",
  production: "🏭",
  review: "⭐",
  system: "🔔",
};

const NotificationDropdown = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
    deleteNotification,
    clearAllRead,
  } = useNotifications();

  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
  };

  const timeAgo = (date) => {
    const now = new Date();
    const d = new Date(date);
    const seconds = Math.floor((now - d) / 1000);

    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
  };

  return (
    <div className="ntf-wrapper" ref={dropdownRef}>
      <button
        className={`ntf-bell ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <HiBell />
        {unreadCount > 0 && (
          <span className="ntf-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="ntf-dropdown">
          {/* Header */}
          <div className="ntf-header">
            <h4>Notifications</h4>
            <div className="ntf-header-actions">
              {unreadCount > 0 && (
                <button className="ntf-action-btn" onClick={markAllRead} title="Mark all read">
                  <HiCheck /> Read all
                </button>
              )}
              {notifications.some((n) => n.isRead) && (
                <button className="ntf-action-btn" onClick={clearAllRead} title="Clear read">
                  <HiTrash /> Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="ntf-list">
            {notifications.length === 0 ? (
              <div className="ntf-empty">
                <HiBell style={{ fontSize: "1.5rem", opacity: 0.2 }} />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 30).map((n) => (
                <div
                  key={n._id}
                  className={`ntf-item ${!n.isRead ? "unread" : ""}`}
                  onClick={() => handleClick(n)}
                >
                  <div className="ntf-icon">{NOTIFICATION_ICONS[n.type] || "🔔"}</div>
                  <div className="ntf-content">
                    <div className="ntf-title">{n.title}</div>
                    <div className="ntf-message">{n.message}</div>
                    <div className="ntf-time">{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.isRead && <div className="ntf-unread-dot" />}
                  <button
                    className="ntf-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n._id);
                    }}
                    title="Delete"
                  >
                    <HiX />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
