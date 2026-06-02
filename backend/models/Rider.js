const mongoose = require("mongoose");

const riderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Rider name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Rider phone is required"],
    },
    cnic: {
      type: String,
      default: "",
    },
    vehicleType: {
      type: String,
      enum: ["bike", "car", "van"],
      default: "bike",
    },
    vehicleNumber: {
      type: String,
      default: "",
    },
    area: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["available", "on-delivery", "off-duty"],
      default: "available",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    totalDeliveries: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Index for common queries
riderSchema.index({ status: 1, isActive: 1 });

module.exports = mongoose.model("Rider", riderSchema);
