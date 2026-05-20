const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    isApproved: {
      type: Boolean,
      default: false,
    },
    adminResponse: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// One review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Static: get average rating for a product
reviewSchema.statics.getAverageRating = async function (productId) {
  const result = await this.aggregate([
    { $match: { product: productId, isApproved: true } },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);
  return result.length > 0
    ? { averageRating: Math.round(result[0].averageRating * 10) / 10, totalReviews: result[0].totalReviews }
    : { averageRating: 0, totalReviews: 0 };
};

module.exports = mongoose.model("Review", reviewSchema);
