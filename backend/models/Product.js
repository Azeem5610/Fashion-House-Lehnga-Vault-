const mongoose = require("mongoose");

const FABRIC_TYPES = [
  "Net (China)",
  "Pure China Krinkle",
  "Tussle Silk",
  "Organza",
  "Barosha",
  "Velvet (Winter)",
  "Shafon Krinkle",
];

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["ready-made", "customized"],
      required: true,
    },
    fabricType: {
      type: String,
      enum: FABRIC_TYPES,
      required: true,
    },
    price: { type: Number, required: true },
    sizes: {
      type: [{ type: String, enum: ["S", "M", "L", "XL"] }],
      default: [],
    },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    inStock: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
module.exports.FABRIC_TYPES = FABRIC_TYPES;
