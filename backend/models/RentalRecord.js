const mongoose = require("mongoose");

const rentalRecordSchema = new mongoose.Schema(
  {
    // ── Month/Year this rent is for ──
    month: {
      type: String,
      required: [true, "Month is required (YYYY-MM)"],
      match: [/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"],
    },

    // ── Rent Details ──
    rentAmount: {
      type: Number,
      required: [true, "Rent amount is required"],
      min: 0,
    },
    shopName: {
      type: String,
      default: "Main Shop",
      trim: true,
    },
    landlordName: {
      type: String,
      default: "",
      trim: true,
    },
    landlordPhone: {
      type: String,
      default: "",
      trim: true,
    },

    // ── Payment Tracking ──
    status: {
      type: String,
      enum: ["pending", "paid", "partial", "overdue"],
      default: "pending",
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank-transfer", "cheque", "online", "other"],
      default: "cash",
    },
    receiptNumber: {
      type: String,
      default: "",
      trim: true,
    },

    // ── Extras ──
    utilities: { type: Number, default: 0, min: 0 },
    maintenance: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "" },

    // ── Who recorded ──
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: total (rent + utilities + maintenance) ──
rentalRecordSchema.virtual("totalAmount").get(function () {
  return (this.rentAmount || 0) + (this.utilities || 0) + (this.maintenance || 0);
});

// ── Virtual: balance ──
rentalRecordSchema.virtual("balance").get(function () {
  return this.totalAmount - (this.paidAmount || 0);
});

// ── Unique index per shop per month ──
rentalRecordSchema.index({ month: 1, shopName: 1 }, { unique: true });
rentalRecordSchema.index({ status: 1 });
rentalRecordSchema.index({ month: -1 });

module.exports = mongoose.model("RentalRecord", rentalRecordSchema);
