const express = require("express");
const router = express.Router();
const { protect, roleAuth } = require("../middleware/authMiddleware");
const {
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  getAllAppointments,
  updateAppointmentStatus,
  deleteAppointment,
  getAppointmentAnalytics,
} = require("../controllers/appointmentController");

// Customer routes (any authenticated user)
router.post("/book", protect, bookAppointment);
router.get("/my", protect, getMyAppointments);
router.put("/cancel/:id", protect, cancelAppointment);

// Admin routes
const admin = [protect, roleAuth("superadmin")];
router.get("/analytics", ...admin, getAppointmentAnalytics);
router.get("/", ...admin, getAllAppointments);
router.put("/:id/status", ...admin, updateAppointmentStatus);
router.delete("/:id", ...admin, deleteAppointment);

module.exports = router;
