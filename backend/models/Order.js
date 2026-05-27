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
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ["safepay", "cod"],
      default: "safepay",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "expired", "refunded", "verification-failed", "cod_pending"],
      default: "pending",
      index: true,
    },
    safepayTracker: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Pre-save middleware to prevent status change to 'confirmed' if payment not completed
orderSchema.pre('save', async function() {
  // Check if status is being modified to 'confirmed'
  if (this.isModified('status') && this.status === 'confirmed') {
    // COD orders can be confirmed without online payment
    if (this.paymentMethod === 'cod') {
      return; // Allow COD orders to be confirmed
    }
    // Prevent confirmation if payment is not completed
    if (this.paymentStatus !== 'completed') {
      throw new Error('Cannot confirm order without completed payment');
    }
  }
});

module.exports = mongoose.model("Order", orderSchema);
