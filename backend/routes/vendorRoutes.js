const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  createVendor,
  getAllVendors,
  updateVendor,
  deleteVendor,
} = require("../controllers/vendorController");

router.post("/", protect, adminOnly, createVendor);
router.get("/", protect, adminOnly, getAllVendors);
router.put("/:id", protect, adminOnly, updateVendor);
router.delete("/:id", protect, adminOnly, deleteVendor);

module.exports = router;
