const Review = require("../models/Review");
const Product = require("../models/Product");
const { cloudinary } = require("../config/cloudinary");

// CREATE review (customer)
exports.createReview = async (req, res) => {
  try {
    const { productId, rating, text, images } = req.body;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Check for existing review
    const existingReview = await Review.findOne({
      user: req.user.id,
      product: productId,
    });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    const review = await Review.create({
      user: req.user.id,
      product: productId,
      rating,
      text,
      images: images || [],
    });

    const populated = await review.populate("user", "name avatar");
    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }
    res.status(500).json({ message: error.message });
  }
};

// GET reviews for a product (public — only approved)
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ product: productId, isApproved: true })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    const stats = await Review.getAverageRating(
      require("mongoose").Types.ObjectId.createFromHexString(productId)
    );

    res.json({ reviews, ...stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET my reviews (customer)
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.id })
      .populate("product", "name images price")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE my review (customer)
exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { rating, text, images } = req.body;
    if (rating) review.rating = rating;
    if (text !== undefined) review.text = text;
    if (images) review.images = images;
    review.isApproved = false; // Re-approve after edit

    await review.save();
    const populated = await review.populate("user", "name avatar");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE my review (customer)
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    // Allow both the user and admin to delete
    if (
      review.user.toString() !== req.user.id.toString() &&
      req.user.role !== "superadmin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Delete images from cloudinary
    for (const img of review.images) {
      try {
        await cloudinary.uploader.destroy(img.public_id);
      } catch (e) { /* non-critical */ }
    }

    await review.deleteOne();
    res.json({ message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── ADMIN ENDPOINTS ────────────────────────────────────────

// GET all reviews (admin)
exports.getAllReviews = async (req, res) => {
  try {
    const { status, rating } = req.query;
    const query = {};

    if (status === "approved") query.isApproved = true;
    else if (status === "pending") query.isApproved = false;

    if (rating) query.rating = parseInt(rating);

    const reviews = await Review.find(query)
      .populate("user", "name email avatar")
      .populate("product", "name images price")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// APPROVE / REJECT review (admin)
exports.moderateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const { isApproved, adminResponse } = req.body;
    if (isApproved !== undefined) review.isApproved = isApproved;
    if (adminResponse !== undefined) review.adminResponse = adminResponse;

    await review.save();

    // Notify the customer
    try {
      const Notification = require("../models/Notification");
      await Notification.create({
        user: review.user,
        type: "review",
        title: isApproved ? "Review Approved" : "Review Update",
        message: isApproved
          ? "Your review has been approved and is now visible to others."
          : adminResponse
            ? `Admin responded to your review: "${adminResponse}"`
            : "Your review status has been updated.",
        link: `/product/${review.product}`,
        data: { reviewId: review._id, productId: review.product },
      });
    } catch (e) { /* non-critical */ }

    const populated = await review.populate([
      { path: "user", select: "name email avatar" },
      { path: "product", select: "name images price" },
    ]);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET review analytics (admin)
exports.getReviewAnalytics = async (req, res) => {
  try {
    const all = await Review.find();
    const total = all.length;
    const approved = all.filter((r) => r.isApproved).length;
    const pending = total - approved;

    // Rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    all.forEach((r) => {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
    });

    // Average rating
    const avgRating =
      total > 0
        ? Math.round((all.reduce((sum, r) => sum + r.rating, 0) / total) * 10) / 10
        : 0;

    // Reviews with images
    const withImages = all.filter((r) => r.images.length > 0).length;

    res.json({
      total,
      approved,
      pending,
      avgRating,
      withImages,
      ratingDistribution,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload review images (customer)
exports.uploadReviewImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    const images = req.files.map((file) => ({
      url: file.path,
      public_id: file.filename,
    }));

    res.json({ images });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
