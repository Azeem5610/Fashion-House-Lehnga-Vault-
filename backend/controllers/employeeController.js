const Employee = require("../models/Employee");
const Task = require("../models/Task");
const { syncStageWithTask } = require("./orderTrackingController");

// ── CREATE employee ──
exports.createEmployee = async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET all employees ──
exports.getAllEmployees = async (req, res) => {
  try {
    const { type, active, search } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (active !== undefined) filter.isActive = active === "true";
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { specialization: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const employees = await Employee.find(filter)
      .sort({ createdAt: -1 });

    // Attach pending task counts
    const employeeIds = employees.map((e) => e._id);
    const taskCounts = await Task.aggregate([
      { $match: { assignedTo: { $in: employeeIds }, status: { $in: ["pending", "in-progress"] } } },
      { $group: { _id: "$assignedTo", pendingTasks: { $sum: 1 } } },
    ]);

    const taskMap = {};
    taskCounts.forEach((t) => { taskMap[t._id.toString()] = t.pendingTasks; });

    const result = employees.map((emp) => ({
      ...emp.toObject(),
      pendingTasks: taskMap[emp._id.toString()] || 0,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET single employee ──
exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const tasks = await Task.find({ assignedTo: employee._id })
      .populate("order", "status totalPrice")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ employee, tasks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── UPDATE employee ──
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE employee ──
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    // Also delete assigned tasks
    await Task.deleteMany({ assignedTo: employee._id });
    res.json({ message: "Employee deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── RECORD attendance ──
exports.recordAttendance = async (req, res) => {
  try {
    const { date, status, notes } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // Check if attendance already recorded for this date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const existing = employee.attendance.find((a) => {
      const d = new Date(a.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === attendanceDate.getTime();
    });

    if (existing) {
      existing.status = status;
      existing.notes = notes || "";
    } else {
      employee.attendance.push({ date: attendanceDate, status, notes });
    }

    await employee.save();
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── ADD salary record ──
exports.addSalaryRecord = async (req, res) => {
  try {
    const { month, baseSalary, bonus, deductions, status } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const totalPaid = (baseSalary || 0) + (bonus || 0) - (deductions || 0);

    // Check if salary already recorded for this month
    const existing = employee.salaryRecords.find((s) => s.month === month);
    if (existing) {
      existing.baseSalary = baseSalary;
      existing.bonus = bonus || 0;
      existing.deductions = deductions || 0;
      existing.totalPaid = totalPaid;
      existing.status = status || "pending";
      if (status === "paid") existing.paidOn = new Date();
    } else {
      employee.salaryRecords.push({
        month,
        baseSalary,
        bonus: bonus || 0,
        deductions: deductions || 0,
        totalPaid,
        status: status || "pending",
        paidOn: status === "paid" ? new Date() : undefined,
      });
    }

    await employee.save();
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── CREATE task ──
exports.createTask = async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      createdBy: req.user.id,
    });
    
    if (task.order) {
      await syncStageWithTask(
        task.order,
        task.type,
        task.status,
        task.assignedTo,
        req.user,
        req.app.get("io")
      );
    }

    const populated = await task.populate("assignedTo", "name type specialization");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET all tasks ──
exports.getAllTasks = async (req, res) => {
  try {
    const { status, assignedTo, type, priority } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name type specialization")
      .populate("order", "status totalPrice")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── UPDATE task ──
exports.updateTask = async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { ...req.body };

    // Auto-set completedDate
    if (status === "completed") {
      updateData.completedDate = new Date();
    }
    if (status === "in-progress" && !req.body.startDate) {
      updateData.startDate = new Date();
    }

    const task = await Task.findByIdAndUpdate(req.params.taskId, updateData, {
      new: true,
      runValidators: true,
    }).populate("assignedTo", "name type specialization");

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.order) {
      await syncStageWithTask(
        task.order,
        task.type,
        task.status,
        task.assignedTo._id || task.assignedTo,
        req.user,
        req.app.get("io")
      );
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE task ──
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET employee productivity / analytics ──
exports.getProductivity = async (req, res) => {
  try {
    // Tasks by status
    const tasksByStatus = await Task.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Tasks by employee
    const tasksByEmployee = await Task.aggregate([
      {
        $group: {
          _id: "$assignedTo",
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $in: ["$status", ["pending", "in-progress"]] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $project: {
          name: "$employee.name",
          type: "$employee.type",
          total: 1,
          completed: 1,
          pending: 1,
          completionRate: {
            $cond: {
              if: { $eq: ["$total", 0] },
              then: 0,
              else: { $multiply: [{ $divide: ["$completed", "$total"] }, 100] },
            },
          },
        },
      },
      { $sort: { completionRate: -1 } },
    ]);

    // Employee type breakdown
    const employeesByType = await Employee.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    // Total employees
    const totalEmployees = await Employee.countDocuments({ isActive: true });

    // Overdue tasks
    const overdueTasks = await Task.countDocuments({
      status: { $in: ["pending", "in-progress"] },
      dueDate: { $lt: new Date() },
    });

    res.json({
      totalEmployees,
      overdueTasks,
      tasksByStatus,
      tasksByEmployee,
      employeesByType,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
