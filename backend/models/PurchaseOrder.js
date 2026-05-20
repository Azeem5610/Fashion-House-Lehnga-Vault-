const mongoose = require("mongoose");

// ── Purchase Order Item Sub-schema ──
const orderItemSchema = new mongoose.Schema(
  {
    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "meters" },
    unitCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    orderNumber: {
      type: String,
      unique: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one item is required",
      },
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "pending", "ordered", "shipped", "received", "cancelled"],
      default: "pending",
    },
    expectedDelivery: {
      type: Date,
    },
    actualDelivery: {
      type: Date,
    },
    notes: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// ── Auto-generate order number ──
purchaseOrderSchema.pre("save", async function () {
  if (!this.orderNumber) {
    const count = await mongoose.model("PurchaseOrder").countDocuments();
    this.orderNumber = `PO-${String(count + 1).padStart(5, "0")}`;
  }
  // Auto-calculate total cost
  this.totalCost = this.items.reduce((sum, item) => sum + (item.totalCost || item.quantity * item.unitCost), 0);
});

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
