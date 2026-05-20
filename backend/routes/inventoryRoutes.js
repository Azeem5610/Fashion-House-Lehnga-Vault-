const express = require("express");
const router = express.Router();
const { protect, roleAuth } = require("../middleware/authMiddleware");
const {
  createItem,
  getAllItems,
  getItem,
  updateItem,
  deleteItem,
  getLowStock,
  recordUsage,
  addStock,
  getAnalytics,
} = require("../controllers/inventoryController");

// All routes require auth + superadmin or inventoryManager role
const auth = [protect, roleAuth("superadmin", "inventoryManager")];

// Analytics (place before /:id to avoid route conflict)
router.get("/analytics", ...auth, getAnalytics);
router.get("/low-stock", ...auth, getLowStock);

// CRUD
router.post("/", ...auth, createItem);
router.get("/", ...auth, getAllItems);
router.get("/:id", ...auth, getItem);
router.put("/:id", ...auth, updateItem);
router.delete("/:id", ...auth, deleteItem);

// Stock operations
router.post("/:id/usage", ...auth, recordUsage);
router.post("/:id/add-stock", ...auth, addStock);

module.exports = router;
