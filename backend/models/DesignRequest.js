const mongoose = require("mongoose");

const designRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    description: { type: String, default: "" },
    requestType: {
      type: String,
      enum: ["exact-copy", "with-customization"],
      default: "exact-copy",
    },
    status: {
      type: String,
      enum: ["pending", "contacted", "quoted", "approved", "in-production", "completed", "rejected"],
      default: "pending",
    },
    // ── Admin pricing & response fields ──
    adminNotes: { type: String, default: "" },
    quotedPrice: { type: Number, default: 0 },
    estimatedDays: { type: Number, default: 0 },
    // ── Link to converted order ──
    convertedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DesignRequest", designRequestSchema);
