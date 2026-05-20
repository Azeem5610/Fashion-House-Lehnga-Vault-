import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import API from "../utils/api";
import { useAuth } from "./AuthContext";
import { toast } from "react-toastify";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

const SOCKET_URL = "http://localhost:5000";

const NOTIFICATION_ICONS = {
  order: "🛒",
  stock: "📦",
  appointment: "📅",
  production: "🏭",
  review: "⭐",
  system: "🔔",
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  // Connect socket when user is logged in
  useEffect(() => {
    if (!user?.token) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Create socket connection with auth
    const socket = io(SOCKET_URL, {
      auth: { token: user.token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("Notification socket connected");
    });

    socket.on("notification", (data) => {
      // Add to local state
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast notification
      const icon = NOTIFICATION_ICONS[data.type] || "🔔";
      toast.info(
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ fontSize: "1.2rem" }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{data.title}</div>
            <div style={{ fontSize: "0.78rem", opacity: 0.8 }}>{data.message}</div>
          </div>
        </div>,
        { autoClose: 5000 }
      );
    });

    socket.on("connect_error", (err) => {
      console.log("Socket connection error:", err.message);
    });

    socketRef.current = socket;

    // Fetch initial notifications
    fetchNotifications();
    fetchUnreadCount();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.token]);

  const fetchNotifications = useCallback(async (page = 1) => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const { data } = await API.get("/notifications", { params: { page, limit: 30 } });
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notifications");
    }
    setLoading(false);
  }, [user?.token]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.token) return;
    try {
      const { data } = await API.get("/notifications/unread-count");
      setUnreadCount(data.unreadCount || 0);
    } catch {
      /* silent */
    }
  }, [user?.token]);

  const markAsRead = useCallback(async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      /* silent */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await API.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      toast.error("Failed to mark all as read");
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      await API.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      // Adjust unread count
      const wasUnread = notifications.find((n) => n._id === id && !n.isRead);
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      /* silent */
    }
  }, [notifications]);

  const clearAllRead = useCallback(async () => {
    try {
      await API.delete("/notifications/clear-read");
      setNotifications((prev) => prev.filter((n) => !n.isRead));
      toast.success("Cleared read notifications");
    } catch {
      toast.error("Failed to clear");
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllRead,
        deleteNotification,
        clearAllRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
