const Appointment = require("../models/Appointment");

// ── CUSTOMER: Book appointment ──
exports.bookAppointment = async (req, res, next) => {
  try {
    const { date, time, type, purpose, notes } = req.body;

    // Check for conflicting appointment (same date & time)
    const existing = await Appointment.findOne({
      date, time, status: { $in: ["pending", "approved"] },
    });
    if (existing) {
      return res.status(400).json({
        message: "This time slot is already booked. Please choose another time.",
      });
    }

    const appointment = await Appointment.create({
      customer: req.user.id,
      date, time, type,
      purpose: purpose || "Bridal consultation",
      notes,
    });

    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
};

// ── CUSTOMER: Get own appointments ──
exports.getMyAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ customer: req.user.id })
      .sort({ date: -1 });
    res.json({ appointments });
  } catch (err) {
    next(err);
  }
};

// ── CUSTOMER: Cancel own appointment ──
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      customer: req.user.id,
    });
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (appointment.status === "completed") {
      return res.status(400).json({ message: "Cannot cancel a completed appointment" });
    }

    appointment.status = "cancelled";
    await appointment.save();
    res.json(appointment);
  } catch (err) {
    next(err);
  }
};

// ── ADMIN: Get all appointments ──
exports.getAllAppointments = async (req, res, next) => {
  try {
    const { status, date, type } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.date = { $gte: start, $lt: end };
    }

    const appointments = await Appointment.find(filter)
      .populate("customer", "name email phone")
      .populate("approvedBy", "name")
      .sort({ date: -1, time: 1 });

    res.json({ appointments });
  } catch (err) {
    next(err);
  }
};

// ── ADMIN: Approve/Reject appointment ──
exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status, adminNotes, meetingLink } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (status) appointment.status = status;
    if (adminNotes !== undefined) appointment.adminNotes = adminNotes;
    if (meetingLink) appointment.meetingLink = meetingLink;

    if (status === "approved") {
      appointment.approvedBy = req.user.id;
    }

    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate("customer", "name email phone")
      .populate("approvedBy", "name");

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

// ── ADMIN: Delete appointment ──
exports.deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    res.json({ message: "Appointment deleted" });
  } catch (err) {
    next(err);
  }
};

// ── ADMIN: Get appointment analytics ──
exports.getAppointmentAnalytics = async (req, res, next) => {
  try {
    const total = await Appointment.countDocuments();
    const pending = await Appointment.countDocuments({ status: "pending" });
    const approved = await Appointment.countDocuments({ status: "approved" });
    const completed = await Appointment.countDocuments({ status: "completed" });
    const cancelled = await Appointment.countDocuments({ status: "cancelled" });
    const rejected = await Appointment.countDocuments({ status: "rejected" });

    // Today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await Appointment.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ["pending", "approved"] },
    });

    // This week's appointments
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const weekCount = await Appointment.countDocuments({
      date: { $gte: startOfWeek, $lt: endOfWeek },
      status: { $in: ["pending", "approved"] },
    });

    // Purpose breakdown
    const purposeBreakdown = await Appointment.aggregate([
      { $group: { _id: "$purpose", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Type breakdown
    const typeBreakdown = await Appointment.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    res.json({
      total, pending, approved, completed, cancelled, rejected,
      todayCount, weekCount,
      purposeBreakdown, typeBreakdown,
    });
  } catch (err) {
    next(err);
  }
};
