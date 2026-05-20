const express = require("express");
const router = express.Router();
const { protect, roleAuth } = require("../middleware/authMiddleware");
const {
  createVendor,
  getAllVendors,
  getVendor,
  updateVendor,
  deleteVendor,
  generateWhatsAppOrder,
  getVendorAnalytics,
} = require("../controllers/vendorController");

const auth = [protect, roleAuth("superadmin", "inventoryManager")];

router.get("/analytics", ...auth, getVendorAnalytics);
router.post("/whatsapp-order", ...auth, generateWhatsAppOrder);

router.post("/", ...auth, createVendor);
router.get("/", ...auth, getAllVendors);
router.get("/:id", ...auth, getVendor);
router.put("/:id", ...auth, updateVendor);
router.delete("/:id", ...auth, deleteVendor);

module.exports = router;
