const Order = require("../models/Order");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const User = require("../models/User");
const OrderTracking = require("../models/OrderTracking");
const DesignRequest = require("../models/DesignRequest");
const Inventory = require("../models/Inventory");
const Appointment = require("../models/Appointment");
const Review = require("../models/Review");
const Employee = require("../models/Employee");
const Task = require("../models/Task");

// ─── DASHBOARD STATS ───────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalOrders, totalProducts, totalVendors, totalCustomers] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      Vendor.countDocuments(),
      User.countDocuments({ role: "customer" }),
    ]);

    // Revenue calculation — only count paid orders (Bug #2)
    const revenueResult = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" }, paymentStatus: "completed" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Pending orders
    const pendingOrders = await Order.countDocuments({ status: "pending" });

    // Recent orders count (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentOrders = await Order.countDocuments({ createdAt: { $gte: weekAgo } });

    // Low stock products
    const lowStockProducts = await Product.countDocuments({ inStock: false });

    res.json({
      totalOrders,
      totalProducts,
      totalVendors,
      totalCustomers,
      totalRevenue,
      pendingOrders,
      recentOrders,
      lowStockProducts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── MONTHLY REVENUE ───────────────────────────────────────────
exports.getMonthlyRevenue = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const monthlyData = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lt: new Date(`${year + 1}-01-01`),
          },
          status: { $ne: "cancelled" },
          paymentStatus: "completed", // Bug #3: Only count paid orders
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill all 12 months
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const result = months.map((name, i) => {
      const found = monthlyData.find((d) => d._id === i + 1);
      return {
        month: name,
        revenue: found?.revenue || 0,
        orders: found?.orders || 0,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PRODUCTION PROGRESS (Orders by Status) ────────────────────
exports.getProductionProgress = async (req, res) => {
  try {
    const statusData = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Map to friendlier format
    const statusColors = {
      pending: "#F59E0B",
      confirmed: "#3B82F6",
      "in-production": "#C2185B",
      "fabric-purchased": "#795548",
      dyeing: "#9C27B0",
      embroidery: "#FF8F00",
      stitching: "#00897B",
      finishing: "#3F51B5",
      "quality-check": "#689F38",
      shipped: "#8B5CF6",
      delivered: "#10B981",
      cancelled: "#EF4444",
    };

    const result = statusData.map((item) => ({
      status: item._id,
      count: item.count,
      color: statusColors[item._id] || "#6B7280",
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── TOP FABRICS ────────────────────────────────────────────────
exports.getTopFabrics = async (req, res) => {
  try {
    const fabricData = await Product.aggregate([
      {
        $group: {
          _id: "$fabricType",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 7 },
    ]);

    const result = fabricData.map((item) => ({
      fabric: item._id,
      count: item.count,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── RECENT ORDERS ──────────────────────────────────────────────
exports.getRecentOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("product", "name price images")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── ERP OVERVIEW (all modules) ─────────────────────────────────
exports.getErpOverview = async (req, res) => {
  try {
    const now = new Date();

    const [
      pendingDesignRequests,
      pendingAppointments,
      lowStockCount,
      pendingReviews,
      activeEmployeeTasks,
      inProgressTracking,
      overdueTracking,
    ] = await Promise.all([
      DesignRequest.countDocuments({ status: { $in: ["pending", "contacted"] } }),
      Appointment.countDocuments({ status: "pending" }),
      Inventory.countDocuments({ $expr: { $lte: ["$quantity", "$reorderLevel"] } }),
      Review.countDocuments({ isApproved: false }),
      Task.countDocuments({ status: { $in: ["pending", "in-progress"] } }),
      OrderTracking.countDocuments({ currentStage: { $ne: "Delivered" } }),
      OrderTracking.countDocuments({
        currentStage: { $ne: "Delivered" },
        estimatedCompletion: { $lt: now },
      }),
    ]);

    // Average review rating
    const ratingResult = await Review.aggregate([
      { $match: { isApproved: true } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    res.json({
      pendingDesignRequests,
      pendingAppointments,
      lowStockCount,
      pendingReviews,
      activeEmployeeTasks,
      inProgressTracking,
      overdueTracking,
      averageRating: ratingResult[0]?.avg ? Math.round(ratingResult[0].avg * 10) / 10 : 0,
      totalApprovedReviews: ratingResult[0]?.count || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
