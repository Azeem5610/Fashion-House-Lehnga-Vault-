const mongoose = require("mongoose");

const APPOINTMENT_STATUSES = ["pending", "approved", "rejected", "completed", "cancelled"];
const MEETING_TYPES = ["online", "physical"];
const PURPOSE_OPTIONS = [
  "Bridal consultation",
  "Fabric selection",
  "Measurement session",
  "Design discussion",
  "Fitting appointment",
  "Follow-up meeting",
  "Other",
];

const appointmentSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer reference is required"],
    },
    date: {
      type: Date,
      required: [true, "Appointment date is required"],
    },
    time: {
      type: String,
      required: [true, "Appointment time is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: MEETING_TYPES,
      required: [true, "Meeting type is required"],
    },
    purpose: {
      type: String,
      enum: PURPOSE_OPTIONS,
      default: "Bridal consultation",
    },
    notes: {
      type: String,
      default: "",
      maxLength: 500,
    },
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: "pending",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Online meeting link (if type is online and approved)
    meetingLink: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
appointmentSchema.index({ customer: 1, date: -1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ date: 1, time: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
module.exports.APPOINTMENT_STATUSES = APPOINTMENT_STATUSES;
module.exports.MEETING_TYPES = MEETING_TYPES;
module.exports.PURPOSE_OPTIONS = PURPOSE_OPTIONS;
