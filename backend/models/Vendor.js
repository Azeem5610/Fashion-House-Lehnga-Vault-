const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, "Contact number is required"],
    },
    whatsapp: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    specialties: {
      type: [String],
      default: [],
    },
    deliveryTime: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    completedOrders: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: performance percentage
vendorSchema.virtual("performance").get(function () {
  if (this.totalOrders === 0) return 0;
  return Math.round((this.completedOrders / this.totalOrders) * 100);
});

// Virtual: WhatsApp link
vendorSchema.virtual("whatsappLink").get(function () {
  const phone = this.whatsapp || this.contactNumber;
  if (!phone) return "";
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;
});

// Method: generate WhatsApp order link
vendorSchema.methods.generateWhatsAppOrderLink = function (orderDetails) {
  const phone = this.whatsapp || this.contactNumber;
  if (!phone) return "";
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(orderDetails)}`;
};

module.exports = mongoose.model("Vendor", vendorSchema);
