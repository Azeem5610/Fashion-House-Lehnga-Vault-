const mongoose = require("mongoose");

// ── Cost Line Item Sub-schema ──
const costLineSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, default: 0, min: 0 },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

// ── Main Cost Estimation Schema ──
const costEstimationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Estimation title is required"],
      trim: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    // ── Core Cost Breakdown ──
    fabricCost: { type: Number, default: 0, min: 0 },
    embroideryCost: { type: Number, default: 0, min: 0 },
    laborCost: { type: Number, default: 0, min: 0 },
    accessoriesCost: { type: Number, default: 0, min: 0 },
    dyeingCost: { type: Number, default: 0, min: 0 },

    // ── Extra line items (flexible additions) ──
    extraCosts: [costLineSchema],

    // ── Profit Margin ──
    profitMarginPercent: { type: Number, default: 0, min: 0, max: 100 },

    // ── Selling Price (what customer pays) ──
    sellingPrice: { type: Number, default: 0, min: 0 },

    // ── Notes ──
    notes: { type: String, default: "" },

    // ── Who created this ──
    createdBy: {
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

// ── Virtual: baseCost (sum of all cost components) ──
costEstimationSchema.virtual("baseCost").get(function () {
  const extras = (this.extraCosts || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  return (
    (this.fabricCost || 0) +
    (this.embroideryCost || 0) +
    (this.laborCost || 0) +
    (this.accessoriesCost || 0) +
    (this.dyeingCost || 0) +
    extras
  );
});

// ── Virtual: profitAmount ──
costEstimationSchema.virtual("profitAmount").get(function () {
  return (this.baseCost * (this.profitMarginPercent || 0)) / 100;
});

// ── Virtual: totalCost (baseCost + profitAmount) ──
costEstimationSchema.virtual("totalCost").get(function () {
  return this.baseCost + this.profitAmount;
});

// ── Virtual: actualProfit (sellingPrice - baseCost) ──
costEstimationSchema.virtual("actualProfit").get(function () {
  if (!this.sellingPrice) return this.profitAmount;
  return (this.sellingPrice || 0) - this.baseCost;
});

// ── Indexes ──
costEstimationSchema.index({ createdAt: -1 });
costEstimationSchema.index({ order: 1 });

module.exports = mongoose.model("CostEstimation", costEstimationSchema);
