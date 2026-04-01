const mongoose = require("mongoose");
const { FABRIC_TYPES } = require("./Product");

const purchaseOrderSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    fabricType: {
      type: String,
      enum: FABRIC_TYPES,
      required: true,
    },
    length: {
      type: Number,
      enum: [25, 50],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "ordered", "received"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
