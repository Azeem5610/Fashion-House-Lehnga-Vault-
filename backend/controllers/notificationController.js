const Notification = require("../models/Notification");

// GET user's notifications
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { user: req.user.id };
    if (unreadOnly === "true") query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });

    res.json({ notifications, total, unreadCount, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET unread count only (lightweight)
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });
    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// MARK one as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// MARK all as read
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE one notification
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE all read notifications
exports.clearRead = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id, isRead: true });
    res.json({ message: "Read notifications cleared" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── HELPER: Create notification + emit socket event ────────
// This is called from other controllers, not via route
exports.createAndEmit = async (io, { userId, type, title, message, link, data }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      link: link || "",
      data: data || {},
    });

    if (io) {
      io.to(`user_${userId}`).emit("notification", {
        _id: notification._id,
        type,
        title,
        message,
        link,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (error) {
    console.error("Notification create error:", error.message);
    return null;
  }
};
