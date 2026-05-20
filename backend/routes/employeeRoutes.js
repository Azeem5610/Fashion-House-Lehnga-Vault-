const express = require("express");
const router = express.Router();
const { protect, roleAuth } = require("../middleware/authMiddleware");
const {
  createEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  recordAttendance,
  addSalaryRecord,
  createTask,
  getAllTasks,
  updateTask,
  deleteTask,
  getProductivity,
} = require("../controllers/employeeController");

const auth = [protect, roleAuth("superadmin", "productionManager")];

// Analytics
router.get("/productivity", ...auth, getProductivity);

// Employee CRUD
router.post("/", ...auth, createEmployee);
router.get("/", ...auth, getAllEmployees);
router.get("/:id", ...auth, getEmployee);
router.put("/:id", ...auth, updateEmployee);
router.delete("/:id", ...auth, deleteEmployee);

// Attendance & Salary
router.post("/:id/attendance", ...auth, recordAttendance);
router.post("/:id/salary", ...auth, addSalaryRecord);

// Tasks
router.post("/tasks", ...auth, createTask);
router.get("/tasks/all", ...auth, getAllTasks);
router.put("/tasks/:taskId", ...auth, updateTask);
router.delete("/tasks/:taskId", ...auth, deleteTask);

module.exports = router;
