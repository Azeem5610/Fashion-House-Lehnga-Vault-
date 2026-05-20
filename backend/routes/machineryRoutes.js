const express = require("express");
const router = express.Router();
const { protect, roleAuth } = require("../middleware/authMiddleware");
const {
  getAllMachines,
  getMachine,
  createMachine,
  updateMachine,
  deleteMachine,
  addMaintenanceLog,
  getMaintenanceLogs,
  getAllMaintenanceLogs,
  deleteMaintenanceLog,
  getMachineryAnalytics,
} = require("../controllers/machineryController");

const auth = [protect, roleAuth("superadmin", "productionManager")];

// Analytics (must be before /:id to avoid matching)
router.get("/analytics", ...auth, getMachineryAnalytics);

// All maintenance logs (across machines)
router.get("/maintenance-logs", ...auth, getAllMaintenanceLogs);

// Machine CRUD
router.post("/", ...auth, createMachine);
router.get("/", ...auth, getAllMachines);
router.get("/:id", ...auth, getMachine);
router.put("/:id", ...auth, updateMachine);
router.delete("/:id", ...auth, deleteMachine);

// Maintenance logs for a specific machine
router.post("/:id/maintenance", ...auth, addMaintenanceLog);
router.get("/:id/maintenance", ...auth, getMaintenanceLogs);
router.delete("/maintenance/:logId", ...auth, deleteMaintenanceLog);

module.exports = router;
