const express = require("express");
const router = express.Router();
const { protect, roleAuth } = require("../middleware/authMiddleware");
const {
  createEstimation,
  getEstimations,
  getEstimation,
  updateEstimation,
  deleteEstimation,
  getAnalytics,
} = require("../controllers/costEstimationController");

// All routes require superadmin
router.use(protect, roleAuth("superadmin"));

// Analytics must come before :id route
router.get("/analytics", getAnalytics);

router.route("/")
  .get(getEstimations)
  .post(createEstimation);

router.route("/:id")
  .get(getEstimation)
  .put(updateEstimation)
  .delete(deleteEstimation);

module.exports = router;
