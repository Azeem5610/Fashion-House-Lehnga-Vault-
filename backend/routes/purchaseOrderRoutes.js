const express = require("express");
const router = express.Router();
const { protect, roleAuth } = require("../middleware/authMiddleware");
const {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
} = require("../controllers/purchaseOrderController");

const auth = [protect, roleAuth("superadmin", "inventoryManager")];

router.post("/", ...auth, createPurchaseOrder);
router.get("/", ...auth, getAllPurchaseOrders);
router.get("/:id", ...auth, getPurchaseOrder);
router.put("/:id/status", ...auth, updatePurchaseOrderStatus);
router.delete("/:id", ...auth, deletePurchaseOrder);

module.exports = router;
