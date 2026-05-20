const Machinery = require("../models/Machinery");
const MaintenanceLog = require("../models/MaintenanceLog");

// ── GET all machines ──
exports.getAllMachines = async (req, res, next) => {
  try {
    const { type, condition, operational, search } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (condition) filter.condition = condition;
    if (operational !== undefined) filter.isOperational = operational === "true";
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { serialNumber: { $regex: search, $options: "i" } },
        { manufacturer: { $regex: search, $options: "i" } },
      ];
    }

    const machines = await Machinery.find(filter).sort({ createdAt: -1 });
    res.json({ machines });
  } catch (err) {
    next(err);
  }
};

// ── GET single machine with maintenance logs ──
exports.getMachine = async (req, res, next) => {
  try {
    const machine = await Machinery.findById(req.params.id);
    if (!machine) return res.status(404).json({ message: "Machine not found" });

    const logs = await MaintenanceLog.find({ machine: machine._id })
      .sort({ date: -1 })
      .limit(20);

    res.json({ machine, maintenanceLogs: logs });
  } catch (err) {
    next(err);
  }
};

// ── CREATE machine ──
exports.createMachine = async (req, res, next) => {
  try {
    const {
      name, type, serialNumber, manufacturer, model,
      purchaseDate, purchaseCost, condition, location, notes,
    } = req.body;

    const machine = await Machinery.create({
      name, type, serialNumber, manufacturer, model,
      purchaseDate, purchaseCost, condition, location, notes,
    });

    res.status(201).json(machine);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Serial number already exists" });
    }
    next(err);
  }
};

// ── UPDATE machine ──
exports.updateMachine = async (req, res, next) => {
  try {
    const machine = await Machinery.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!machine) return res.status(404).json({ message: "Machine not found" });
    res.json(machine);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Serial number already exists" });
    }
    next(err);
  }
};

// ── DELETE machine ──
exports.deleteMachine = async (req, res, next) => {
  try {
    const machine = await Machinery.findByIdAndDelete(req.params.id);
    if (!machine) return res.status(404).json({ message: "Machine not found" });

    // Also delete all maintenance logs for this machine
    await MaintenanceLog.deleteMany({ machine: machine._id });

    res.json({ message: "Machine and associated logs deleted" });
  } catch (err) {
    next(err);
  }
};

// ── ADD maintenance log ──
exports.addMaintenanceLog = async (req, res, next) => {
  try {
    const machine = await Machinery.findById(req.params.id);
    if (!machine) return res.status(404).json({ message: "Machine not found" });

    const {
      type, description, cost, performedBy,
      date, nextScheduled, partsReplaced, downtimeHours, notes,
    } = req.body;

    const log = await MaintenanceLog.create({
      machine: machine._id,
      type, description, cost, performedBy,
      date: date || new Date(), nextScheduled,
      partsReplaced, downtimeHours, notes,
    });

    // Update machine's last/next maintenance and condition
    const updates = { lastMaintenance: log.date };
    if (nextScheduled) updates.nextMaintenance = nextScheduled;

    // If repair type, update condition based on result
    if (type === "repair" || type === "emergency") {
      updates.condition = "good";
      updates.isOperational = true;
    }

    await Machinery.findByIdAndUpdate(machine._id, updates);

    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
};

// ── GET maintenance logs for a machine ──
exports.getMaintenanceLogs = async (req, res, next) => {
  try {
    const logs = await MaintenanceLog.find({ machine: req.params.id })
      .sort({ date: -1 });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
};

// ── GET all maintenance logs (across all machines) ──
exports.getAllMaintenanceLogs = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const logs = await MaintenanceLog.find(filter)
      .populate("machine", "name type serialNumber")
      .sort({ date: -1 })
      .limit(100);

    res.json({ logs });
  } catch (err) {
    next(err);
  }
};

// ── DELETE maintenance log ──
exports.deleteMaintenanceLog = async (req, res, next) => {
  try {
    const log = await MaintenanceLog.findByIdAndDelete(req.params.logId);
    if (!log) return res.status(404).json({ message: "Log not found" });
    res.json({ message: "Maintenance log deleted" });
  } catch (err) {
    next(err);
  }
};

// ── ANALYTICS ──
exports.getMachineryAnalytics = async (req, res, next) => {
  try {
    const machines = await Machinery.find();
    const logs = await MaintenanceLog.find();

    const totalMachines = machines.length;
    const operational = machines.filter((m) => m.isOperational).length;
    const nonOperational = totalMachines - operational;

    const conditionBreakdown = {};
    machines.forEach((m) => {
      conditionBreakdown[m.condition] = (conditionBreakdown[m.condition] || 0) + 1;
    });

    const typeBreakdown = {};
    machines.forEach((m) => {
      typeBreakdown[m.type] = (typeBreakdown[m.type] || 0) + 1;
    });

    const totalMaintenanceCost = logs.reduce((sum, l) => sum + (l.cost || 0), 0);
    const totalDowntime = logs.reduce((sum, l) => sum + (l.downtimeHours || 0), 0);

    // Machines needing maintenance soon (within 7 days)
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const maintenanceDue = machines.filter(
      (m) => m.nextMaintenance && m.nextMaintenance <= weekFromNow
    ).length;

    // Overdue maintenance
    const maintenanceOverdue = machines.filter(
      (m) => m.nextMaintenance && m.nextMaintenance < now
    ).length;

    // Monthly maintenance cost (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyCosts = await MaintenanceLog.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          totalCost: { $sum: "$cost" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalMachines,
      operational,
      nonOperational,
      conditionBreakdown,
      typeBreakdown,
      totalMaintenanceCost,
      totalDowntime,
      maintenanceDue,
      maintenanceOverdue,
      monthlyCosts,
    });
  } catch (err) {
    next(err);
  }
};
