const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");
const {
  createDesignRequest,
  getMyDesignRequests,
  getAllDesignRequests,
  updateDesignRequestStatus,
  sendQuote,
  convertToOrder,
} = require("../controllers/designRequestController");

router.post("/", protect, upload.array("images", 5), createDesignRequest);
router.get("/my", protect, getMyDesignRequests);
router.get("/", protect, adminOnly, getAllDesignRequests);
router.put("/:id/status", protect, adminOnly, updateDesignRequestStatus);
router.put("/:id/quote", protect, adminOnly, sendQuote);
router.post("/:id/convert", protect, adminOnly, convertToOrder);

module.exports = router;

