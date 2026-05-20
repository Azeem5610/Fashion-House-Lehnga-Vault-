const express = require("express");
const router = express.Router();
const { protect, roleAuth } = require("../middleware/authMiddleware");
const {
  createTracking,
  getTrackingByOrder,
  getAllTracking,
  updateStage,
  deleteTracking,
  getTrackingAnalytics,
} = require("../controllers/orderTrackingController");

// Admin routes
router.get("/analytics", protect, roleAuth("superadmin", "productionManager"), getTrackingAnalytics);
router.get("/", protect, roleAuth("superadmin", "productionManager", "tailor"), getAllTracking);
router.post("/", protect, roleAuth("superadmin", "productionManager"), createTracking);
router.put("/:trackingId/stage", protect, roleAuth("superadmin", "productionManager", "tailor"), updateStage);
router.delete("/:id", protect, roleAuth("superadmin"), deleteTracking);

// Customer + Admin route
router.get("/order/:orderId", protect, getTrackingByOrder);

module.exports = router;
