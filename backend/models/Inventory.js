const mongoose = require("mongoose");

// ── Subcategory Enums ──
const FABRIC_SUBCATEGORIES = [
  "Net (China)",
  "Pure China Krinkle",
  "Tussle Silk",
  "Organza",
  "Barosha",
  "Velvet",
  "Shafon Krinkle",
];

const ACCESSORY_SUBCATEGORIES = [
  "Moti",
  "Stones",
  "Pearls",
  "Lace",
  "Sitara",
  "Threads",
  "Beads",
  "Tassels",
];

const OTHER_SUBCATEGORIES = [
  "Dyeing chemicals",
  "Packaging materials",
  "Embroidery materials",
];

const ALL_SUBCATEGORIES = [
  ...FABRIC_SUBCATEGORIES,
  ...ACCESSORY_SUBCATEGORIES,
  ...OTHER_SUBCATEGORIES,
];

// ── Usage History Sub-schema ──
const usageHistorySchema = new mongoose.Schema(
  {
    quantity: { type: Number, required: true },
    reason: { type: String, default: "" },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ── Main Inventory Schema ──
const inventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["fabric", "accessory", "other"],
      required: [true, "Category is required"],
    },
    subcategory: {
      type: String,
      enum: ALL_SUBCATEGORIES,
      required: [true, "Subcategory is required"],
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      enum: ["meters", "yards", "pieces", "grams", "kg", "liters", "packets", "rolls", "boxes"],
      default: "meters",
    },
    costPerUnit: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reorderLevel: {
      type: Number,
      default: 10,
      min: 0,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    color: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
    },
    usageHistory: [usageHistorySchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: isLowStock ──
inventorySchema.virtual("isLowStock").get(function () {
  return this.quantity <= this.reorderLevel;
});

// ── Virtual: totalValue ──
inventorySchema.virtual("totalValue").get(function () {
  return this.quantity * this.costPerUnit;
});

// ── Indexes for search and filtering ──
inventorySchema.index({ category: 1, subcategory: 1 });
inventorySchema.index({ name: "text" });
inventorySchema.index({ quantity: 1, reorderLevel: 1 });

// ── Auto-generate SKU if not provided ──
inventorySchema.pre("save", function () {
  if (!this.sku) {
    const prefix = this.category === "fabric" ? "FAB" : this.category === "accessory" ? "ACC" : "OTH";
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.sku = `${prefix}-${rand}`;
  }
});

module.exports = mongoose.model("Inventory", inventorySchema);
module.exports.FABRIC_SUBCATEGORIES = FABRIC_SUBCATEGORIES;
module.exports.ACCESSORY_SUBCATEGORIES = ACCESSORY_SUBCATEGORIES;
module.exports.OTHER_SUBCATEGORIES = OTHER_SUBCATEGORIES;
module.exports.ALL_SUBCATEGORIES = ALL_SUBCATEGORIES;
