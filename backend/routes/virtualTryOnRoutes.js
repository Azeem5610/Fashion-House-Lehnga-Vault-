const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/virtualTryOnController");

// Cloudinary upload middleware (scoped to tryon_uploads folder)
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

const tryOnStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "fashion_house/tryon_uploads",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1600, height: 2000, crop: "limit", quality: "auto" }],
  },
});
const tryOnUpload = multer({ storage: tryOnStorage });

// ── Image upload ──
router.post("/upload-image", protect, tryOnUpload.single("image"), ctrl.uploadBrideImage);

// ── Session CRUD ──
router.post("/", protect, ctrl.createSession);
router.get("/", protect, ctrl.getUserSessions);
router.get("/:id", protect, ctrl.getSession);
router.patch("/:id", protect, ctrl.updateSession);
router.delete("/:id", protect, ctrl.deleteSession);

// ── Final preview (canvas export → Cloudinary) ──
router.patch("/:id/preview", protect, ctrl.saveFinalPreview);

// ── ERP Integrations ──
router.post("/:id/wishlist", protect, ctrl.addToWishlist);
router.post("/:id/moodboard", protect, ctrl.addToMoodboard);
router.post("/:id/order", protect, ctrl.convertToOrder);

// ── Analytics ──
router.get("/analytics/most-tried", protect, ctrl.getMostTriedLehngas);

module.exports = router;
