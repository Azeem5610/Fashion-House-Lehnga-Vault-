const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  createPurchaseOrder,
  getAllPurchaseOrders,
  updatePurchaseOrderStatus,
} = require("../controllers/purchaseOrderController");

router.post("/", protect, adminOnly, createPurchaseOrder);
router.get("/", protect, adminOnly, getAllPurchaseOrders);
router.put("/:id/status", protect, adminOnly, updatePurchaseOrderStatus);

module.exports = router;
