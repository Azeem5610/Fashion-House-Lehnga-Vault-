const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    safepayTracker: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      default: "PKR",
      enum: ["PKR"],
    },

    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "completed",
        "failed",
        "expired",
        "refunded",
        "verification-failed",
      ],
      default: "pending",
      index: true,
    },

    transactionId: {
      type: String,
      default: null,
    },

    paymentMethod: {
      type: String,
      default: null,
    },

    checkoutUrl: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    refund: {
      refundId: String,
      amount: Number,
      reason: String,
      initiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      refundedAt: Date,
    },

    attempts: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        status: String,
        errorMessage: String,
      },
    ],

    webhookEvents: [
      {
        eventType: String,
        receivedAt: {
          type: Date,
          default: Date.now,
        },
        payload: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for finding expired payments
paymentSchema.index({ status: 1, expiresAt: 1 });

// Compound index for finding stale pending payments
paymentSchema.index({ status: 1, createdAt: 1 });

// Virtual property to check if payment is expired
paymentSchema.virtual("isExpired").get(function () {
  return this.status === "pending" && new Date() > this.expiresAt;
});

// Instance method to add payment attempt
paymentSchema.methods.addAttempt = function (status, errorMessage = null) {
  this.attempts.push({ status, errorMessage });
  return this.save();
};

// Instance method to add webhook event
paymentSchema.methods.addWebhookEvent = function (eventType, payload) {
  this.webhookEvents.push({ eventType, payload });
  return this.save();
};

module.exports = mongoose.model("Payment", paymentSchema);
