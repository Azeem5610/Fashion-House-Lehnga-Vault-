const mongoose = require("mongoose");

// ── Transform sub-schema — canvas state snapshot ──
const transformSchema = new mongoose.Schema(
  {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    scaleX: { type: Number, default: 1 },
    scaleY: { type: Number, default: 1 },
    rotation: { type: Number, default: 0 },
    opacity: { type: Number, default: 1, min: 0, max: 1 },
    // Body adjustment controls (CSS/canvas scale multipliers)
    bodyHeight: { type: Number, default: 100 },    // % of base
    bodyWidth: { type: Number, default: 100 },     // % of base
    shoulderWidth: { type: Number, default: 100 }, // % of base
    skinToneFilter: {
      type: String,
      enum: ["none", "warm", "cool", "neutral"],
      default: "none",
    },
  },
  { _id: false }
);

const virtualTryOnSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Bride's uploaded photo (Cloudinary)
    uploadedImage: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },

    // Mannequin or custom photo
    mode: {
      type: String,
      enum: ["photo", "mannequin"],
      default: "mannequin",
    },

    // The lehnga/product being tried on
    lehnga: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    // Canvas transform state — persisted so session can be resumed
    transformData: {
      type: transformSchema,
      default: () => ({}),
    },

    // Final merged canvas export (saved to Cloudinary)
    finalPreview: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },

    // Human-readable label for this session
    sessionName: {
      type: String,
      trim: true,
      default: "",
    },

    // Quick flags for ERP cross-module status
    addedToWishlist: { type: Boolean, default: false },
    addedToMoodboard: { type: Boolean, default: false },
    convertedToOrder: { type: Boolean, default: false },

    // Reference to order if converted
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
virtualTryOnSchema.index({ user: 1, createdAt: -1 });
virtualTryOnSchema.index({ lehnga: 1 }); // for analytics — most tried lehngas

module.exports = mongoose.model("VirtualTryOn", virtualTryOnSchema);
