const express = require("express");
const router = express.Router();
const { protect, roleAuth } = require("../middleware/authMiddleware");
const {
  createRental,
  getRentals,
  getRental,
  updateRental,
  deleteRental,
  getAnalytics,
} = require("../controllers/rentalController");

// All routes require superadmin
router.use(protect, roleAuth("superadmin"));

// Analytics must come before :id route
router.get("/analytics", getAnalytics);

router.route("/")
  .get(getRentals)
  .post(createRental);

router.route("/:id")
  .get(getRental)
  .put(updateRental)
  .delete(deleteRental);

module.exports = router;
