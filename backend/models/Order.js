const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    size: {
      type: String,
      enum: ["S", "M", "L", "XL", ""],
      default: "",
    },
    quantity: { type: Number, default: 1, min: 1 },
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "in-production",
        "fabric-purchased",
        "dyeing",
        "embroidery",
        "stitching",
        "finishing",
        "quality-check",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    tracking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderTracking",
    },
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      phone: { type: String, required: true },
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
