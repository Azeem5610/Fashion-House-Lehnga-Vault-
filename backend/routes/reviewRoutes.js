const express = require("express");
const router = express.Router();
const { protect, roleAuth } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");
const {
  createReview,
  getProductReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  getAllReviews,
  moderateReview,
  getReviewAnalytics,
  uploadReviewImages,
} = require("../controllers/reviewController");

// Public — get reviews for a product
router.get("/product/:productId", getProductReviews);

// Customer routes
router.post("/", protect, createReview);
router.get("/my", protect, getMyReviews);
router.put("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);
router.post("/upload", protect, upload.array("images", 3), uploadReviewImages);

// Admin routes
router.get("/admin/all", protect, roleAuth("superadmin"), getAllReviews);
router.put("/admin/:id/moderate", protect, roleAuth("superadmin"), moderateReview);
router.get("/admin/analytics", protect, roleAuth("superadmin"), getReviewAnalytics);

module.exports = router;
