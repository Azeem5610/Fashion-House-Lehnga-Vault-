const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  createRider,
  getAllRiders,
  getRiderById,
  updateRider,
  deleteRider,
  getRiderStats,
} = require("../controllers/riderController");

// All routes are admin-only
router.get("/stats", protect, adminOnly, getRiderStats);
router.get("/", protect, adminOnly, getAllRiders);
router.post("/", protect, adminOnly, createRider);
router.get("/:id", protect, adminOnly, getRiderById);
router.put("/:id", protect, adminOnly, updateRider);
router.delete("/:id", protect, adminOnly, deleteRider);

module.exports = router;
