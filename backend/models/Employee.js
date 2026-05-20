const mongoose = require("mongoose");

// ── Attendance Sub-schema ──
const attendanceSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["present", "absent", "leave", "half-day"],
      required: true,
    },
    notes: { type: String, default: "" },
  },
  { _id: true }
);

// ── Salary Record Sub-schema ──
const salaryRecordSchema = new mongoose.Schema(
  {
    month: { type: String, required: true }, // e.g. "2026-05"
    baseSalary: { type: Number, required: true },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    paidOn: { type: Date },
    status: {
      type: String,
      enum: ["pending", "paid", "partial"],
      default: "pending",
    },
  },
  { _id: true }
);

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
    },
    phone: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["tailor", "embroideryWorker", "productionManager", "dyeingStaff"],
      required: [true, "Employee type is required"],
    },
    specialization: {
      type: String,
      default: "",
    },
    salary: {
      type: Number,
      default: 0,
      min: 0,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    address: {
      type: String,
      default: "",
    },
    cnic: {
      type: String,
      default: "",
    },
    emergencyContact: {
      type: String,
      default: "",
    },
    attendance: [attendanceSchema],
    salaryRecords: [salaryRecordSchema],
    notes: {
      type: String,
      default: "",
    },
    // Reference to User model if the employee has a login account
    user: {
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

// ── Virtual: pending tasks count (populated externally) ──
employeeSchema.virtual("tasks", {
  ref: "Task",
  localField: "_id",
  foreignField: "assignedTo",
});

// ── Index ──
employeeSchema.index({ type: 1, isActive: 1 });

module.exports = mongoose.model("Employee", employeeSchema);
