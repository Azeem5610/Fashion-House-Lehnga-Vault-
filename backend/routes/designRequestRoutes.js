const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");
const {
  createDesignRequest,
  getMyDesignRequests,
  getAllDesignRequests,
  updateDesignRequestStatus,
} = require("../controllers/designRequestController");

router.post("/", protect, upload.array("images", 5), createDesignRequest);
router.get("/my", protect, getMyDesignRequests);
router.get("/", protect, adminOnly, getAllDesignRequests);
router.put("/:id/status", protect, adminOnly, updateDesignRequestStatus);

module.exports = router;
