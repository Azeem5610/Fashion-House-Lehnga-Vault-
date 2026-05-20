const mongoose = require("mongoose");

const MACHINE_TYPES = ["embroidery", "stitch", "cutting", "press"];
const CONDITION_OPTIONS = ["excellent", "good", "fair", "needs-repair", "out-of-service"];

const machinerySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Machine name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: MACHINE_TYPES,
      required: [true, "Machine type is required"],
    },
    serialNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    manufacturer: {
      type: String,
      default: "",
      trim: true,
    },
    model: {
      type: String,
      default: "",
      trim: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    purchaseCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    condition: {
      type: String,
      enum: CONDITION_OPTIONS,
      default: "good",
    },
    lastMaintenance: {
      type: Date,
    },
    nextMaintenance: {
      type: Date,
    },
    isOperational: {
      type: Boolean,
      default: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
    },
    // Total hours of usage (manually updated)
    totalHoursUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: maintenance logs (populated externally)
machinerySchema.virtual("maintenanceLogs", {
  ref: "MaintenanceLog",
  localField: "_id",
  foreignField: "machine",
});

// Virtual: needs maintenance soon (within 7 days)
machinerySchema.virtual("needsMaintenanceSoon").get(function () {
  if (!this.nextMaintenance) return false;
  const now = new Date();
  const diff = this.nextMaintenance - now;
  return diff <= 7 * 24 * 60 * 60 * 1000 && diff > 0;
});

// Virtual: maintenance overdue
machinerySchema.virtual("maintenanceOverdue").get(function () {
  if (!this.nextMaintenance) return false;
  return this.nextMaintenance < new Date();
});

// Auto-generate serial number if not provided
machinerySchema.pre("save", function () {
  if (!this.serialNumber) {
    const prefix = this.type.substring(0, 3).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.serialNumber = `MCH-${prefix}-${rand}`;
  }
});

// Indexes
machinerySchema.index({ type: 1, isOperational: 1 });
machinerySchema.index({ condition: 1 });
machinerySchema.index({ nextMaintenance: 1 });

module.exports = mongoose.model("Machinery", machinerySchema);
module.exports.MACHINE_TYPES = MACHINE_TYPES;
module.exports.CONDITION_OPTIONS = CONDITION_OPTIONS;
