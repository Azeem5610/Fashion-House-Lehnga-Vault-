const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getMyMoodboards,
  getMoodboard,
  getPublicMoodboards,
  createMoodboard,
  updateMoodboard,
  addImage,
  removeImage,
  addProduct,
  removeProduct,
  deleteMoodboard,
} = require("../controllers/moodboardController");

// Public gallery (no auth required)
router.get("/public", getPublicMoodboards);

// All other routes require auth
router.use(protect);

router.get("/my", getMyMoodboards);
router.get("/:id", getMoodboard);
router.post("/", createMoodboard);
router.put("/:id", updateMoodboard);
router.delete("/:id", deleteMoodboard);

// Image management
router.post("/:id/images", addImage);
router.delete("/:id/images/:imageId", removeImage);

// Product management on moodboard
router.post("/:id/products", addProduct);
router.delete("/:id/products/:productId", removeProduct);

module.exports = router;
