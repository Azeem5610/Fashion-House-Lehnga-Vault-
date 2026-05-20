const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getMonthlyRevenue,
  getProductionProgress,
  getTopFabrics,
  getRecentOrders,
  getErpOverview,
} = require("../controllers/analyticsController");
const { protect, roleAuth } = require("../middleware/authMiddleware");

// All analytics routes require auth + admin/manager roles
const adminRoles = ["superadmin", "inventoryManager", "productionManager"];

router.get("/dashboard", protect, roleAuth(...adminRoles), getDashboardStats);
router.get("/monthly-revenue", protect, roleAuth(...adminRoles), getMonthlyRevenue);
router.get("/production", protect, roleAuth(...adminRoles), getProductionProgress);
router.get("/top-fabrics", protect, roleAuth(...adminRoles), getTopFabrics);
router.get("/recent-orders", protect, roleAuth(...adminRoles), getRecentOrders);
router.get("/erp-overview", protect, roleAuth(...adminRoles), getErpOverview);

module.exports = router;

