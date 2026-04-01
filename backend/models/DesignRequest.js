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
      enum: ["pending", "contacted", "in-progress", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DesignRequest", designRequestSchema);
