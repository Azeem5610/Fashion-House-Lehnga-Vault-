const mongoose = require("mongoose");

const moodboardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Moodboard name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, default: "" },
        caption: { type: String, default: "" },
      },
    ],
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    notes: {
      type: String,
      default: "",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
moodboardSchema.index({ user: 1 });
moodboardSchema.index({ isPublic: 1 });
moodboardSchema.index({ tags: 1 });

module.exports = mongoose.model("Moodboard", moodboardSchema);
