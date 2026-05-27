const mongoose = require("mongoose");

const OPERATION_TYPES = [
  "session_created",
  "webhook_received",
  "verification_attempted",
  "verification_succeeded",
  "verification_failed",
  "refund_initiated",
  "refund_completed",
  "status_updated",
];

const paymentLogSchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: false, // Bug #7: Allow null for system-level logs (e.g. webhook signature failures)
      default: null,
      index: true,
    },
    operation: {
      type: String,
      enum: OPERATION_TYPES,
      required: [true, "Operation type is required"],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Operation details are required"],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient log queries by payment and date
paymentLogSchema.index({ payment: 1, createdAt: -1 });

module.exports = mongoose.model("PaymentLog", paymentLogSchema);
module.exports.OPERATION_TYPES = OPERATION_TYPES;
