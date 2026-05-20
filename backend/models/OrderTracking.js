const mongoose = require("mongoose");

const STAGE_NAMES = [
  "Order Placed",
  "Fabric Purchased",
  "Dyeing",
  "Embroidery",
  "Stitching",
  "Finishing",
  "Quality Check",
  "Delivered",
];

const stageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: STAGE_NAMES,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "skipped"],
      default: "pending",
    },
    startDate: { type: Date },
    completedDate: { type: Date },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const orderTrackingSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    stages: {
      type: [stageSchema],
      default: () =>
        STAGE_NAMES.map((name, idx) => ({
          name,
          status: idx === 0 ? "completed" : "pending",
          startDate: idx === 0 ? new Date() : undefined,
          completedDate: idx === 0 ? new Date() : undefined,
        })),
    },
    currentStage: {
      type: String,
      enum: STAGE_NAMES,
      default: "Order Placed",
    },
    estimatedCompletion: { type: Date },
  },
  { timestamps: true }
);

// Virtual: progress percentage
orderTrackingSchema.virtual("progress").get(function () {
  const completed = this.stages.filter(
    (s) => s.status === "completed" || s.status === "skipped"
  ).length;
  return Math.round((completed / this.stages.length) * 100);
});

// Virtual: is fully completed
orderTrackingSchema.virtual("isComplete").get(function () {
  return this.stages.every(
    (s) => s.status === "completed" || s.status === "skipped"
  );
});

orderTrackingSchema.set("toJSON", { virtuals: true });
orderTrackingSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("OrderTracking", orderTrackingSchema);
module.exports.STAGE_NAMES = STAGE_NAMES;
