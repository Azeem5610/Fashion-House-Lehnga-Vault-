const mongoose = require("mongoose");

const MAINTENANCE_TYPES = ["routine", "repair", "emergency", "inspection"];

const maintenanceLogSchema = new mongoose.Schema(
  {
    machine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machinery",
      required: [true, "Machine reference is required"],
    },
    type: {
      type: String,
      enum: MAINTENANCE_TYPES,
      required: [true, "Maintenance type is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    performedBy: {
      type: String,
      default: "",
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    nextScheduled: {
      type: Date,
    },
    partsReplaced: {
      type: String,
      default: "",
    },
    // Was the machine down during this maintenance?
    downtimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["completed", "in-progress", "scheduled"],
      default: "completed",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
maintenanceLogSchema.index({ machine: 1, date: -1 });
maintenanceLogSchema.index({ type: 1 });
maintenanceLogSchema.index({ status: 1 });

module.exports = mongoose.model("MaintenanceLog", maintenanceLogSchema);
module.exports.MAINTENANCE_TYPES = MAINTENANCE_TYPES;
