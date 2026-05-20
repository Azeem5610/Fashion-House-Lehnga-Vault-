const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  createCollection,
  addToCollection,
  removeFromCollection,
  deleteCollection,
} = require("../controllers/wishlistController");

// All wishlist routes require authentication
router.use(protect);

// Wishlist CRUD
router.get("/", getWishlist);
router.post("/add", addToWishlist);
router.delete("/remove/:productId", removeFromWishlist);
router.get("/check/:productId", checkWishlist);

// Collections
router.post("/collections", createCollection);
router.post("/collections/:collectionId/add", addToCollection);
router.delete("/collections/:collectionId/remove/:productId", removeFromCollection);
router.delete("/collections/:collectionId", deleteCollection);

module.exports = router;
