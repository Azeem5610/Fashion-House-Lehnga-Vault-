const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Assigned employee is required"],
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    type: {
      type: String,
      enum: ["embroidery", "stitching", "dyeing", "finishing", "cutting", "quality-check", "other"],
      required: [true, "Task type is required"],
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "cancelled"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    startDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    completedDate: {
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

// ── Indexes ──
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ status: 1, priority: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model("Task", taskSchema);
