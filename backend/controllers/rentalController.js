const RentalRecord = require("../models/RentalRecord");

// @desc    Create a new rental record
// @route   POST /api/rentals
// @access  superadmin
exports.createRental = async (req, res) => {
  try {
    const {
      month, rentAmount, shopName, landlordName, landlordPhone,
      status, paidAmount, paymentDate, paymentMethod, receiptNumber,
      utilities, maintenance, notes,
    } = req.body;

    const rental = await RentalRecord.create({
      month,
      rentAmount,
      shopName: shopName || "Main Shop",
      landlordName: landlordName || "",
      landlordPhone: landlordPhone || "",
      status: status || "pending",
      paidAmount: paidAmount || 0,
      paymentDate: paymentDate || undefined,
      paymentMethod: paymentMethod || "cash",
      receiptNumber: receiptNumber || "",
      utilities: utilities || 0,
      maintenance: maintenance || 0,
      notes: notes || "",
      recordedBy: req.user.id,
    });

    const populated = await RentalRecord.findById(rental._id)
      .populate("recordedBy", "name");

    res.status(201).json(populated);
  } catch (err) {
    console.error("Create rental error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "A rental record for this shop and month already exists" });
    }
    res.status(500).json({ message: err.message || "Failed to create rental record" });
  }
};

// @desc    Get all rental records
// @route   GET /api/rentals
// @access  superadmin
exports.getRentals = async (req, res) => {
  try {
    const { year, status, shopName } = req.query;
    const filter = {};

    if (year) {
      filter.month = { $regex: `^${year}` };
    }
    if (status) {
      filter.status = status;
    }
    if (shopName) {
      filter.shopName = { $regex: shopName, $options: "i" };
    }

    const rentals = await RentalRecord.find(filter)
      .sort({ month: -1 })
      .populate("recordedBy", "name");

    res.json(rentals);
  } catch (err) {
    console.error("Get rentals error:", err);
    res.status(500).json({ message: "Failed to fetch rental records" });
  }
};

// @desc    Get single rental record
// @route   GET /api/rentals/:id
// @access  superadmin
exports.getRental = async (req, res) => {
  try {
    const rental = await RentalRecord.findById(req.params.id)
      .populate("recordedBy", "name");

    if (!rental) {
      return res.status(404).json({ message: "Rental record not found" });
    }

    res.json(rental);
  } catch (err) {
    console.error("Get rental error:", err);
    res.status(500).json({ message: "Failed to fetch rental record" });
  }
};

// @desc    Update rental record
// @route   PUT /api/rentals/:id
// @access  superadmin
exports.updateRental = async (req, res) => {
  try {
    const rental = await RentalRecord.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: "Rental record not found" });
    }

    const allowedFields = [
      "month", "rentAmount", "shopName", "landlordName", "landlordPhone",
      "status", "paidAmount", "paymentDate", "paymentMethod", "receiptNumber",
      "utilities", "maintenance", "notes",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        rental[field] = req.body[field];
      }
    });

    // Auto-set status based on payment
    if (req.body.paidAmount !== undefined) {
      const total = (rental.rentAmount || 0) + (rental.utilities || 0) + (rental.maintenance || 0);
      if (rental.paidAmount >= total) {
        rental.status = "paid";
      } else if (rental.paidAmount > 0) {
        rental.status = "partial";
      }
    }

    await rental.save();

    const populated = await RentalRecord.findById(rental._id)
      .populate("recordedBy", "name");

    res.json(populated);
  } catch (err) {
    console.error("Update rental error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "A rental record for this shop and month already exists" });
    }
    res.status(500).json({ message: err.message || "Failed to update rental record" });
  }
};

// @desc    Delete rental record
// @route   DELETE /api/rentals/:id
// @access  superadmin
exports.deleteRental = async (req, res) => {
  try {
    const rental = await RentalRecord.findByIdAndDelete(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: "Rental record not found" });
    }
    res.json({ message: "Rental record deleted" });
  } catch (err) {
    console.error("Delete rental error:", err);
    res.status(500).json({ message: "Failed to delete rental record" });
  }
};

// @desc    Get rental analytics/summary
// @route   GET /api/rentals/analytics
// @access  superadmin
exports.getAnalytics = async (req, res) => {
  try {
    const { year } = req.query;
    const filter = {};
    if (year) {
      filter.month = { $regex: `^${year}` };
    }

    const rentals = await RentalRecord.find(filter).sort({ month: 1 });

    let totalRent = 0;
    let totalUtilities = 0;
    let totalMaintenance = 0;
    let totalPaid = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    const monthlyData = [];

    rentals.forEach((r) => {
      totalRent += r.rentAmount || 0;
      totalUtilities += r.utilities || 0;
      totalMaintenance += r.maintenance || 0;
      totalPaid += r.paidAmount || 0;
      if (r.status === "pending" || r.status === "partial") pendingCount++;
      if (r.status === "overdue") overdueCount++;

      // Build monthly chart data
      const [y, m] = r.month.split("-");
      const monthLabel = new Date(y, parseInt(m) - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      monthlyData.push({
        month: monthLabel,
        rent: r.rentAmount || 0,
        utilities: r.utilities || 0,
        maintenance: r.maintenance || 0,
        total: (r.rentAmount || 0) + (r.utilities || 0) + (r.maintenance || 0),
        paid: r.paidAmount || 0,
      });
    });

    const totalExpense = totalRent + totalUtilities + totalMaintenance;
    const totalBalance = totalExpense - totalPaid;

    res.json({
      totalRecords: rentals.length,
      totalRent,
      totalUtilities,
      totalMaintenance,
      totalExpense,
      totalPaid,
      totalBalance,
      pendingCount,
      overdueCount,
      monthlyData,
    });
  } catch (err) {
    console.error("Rental analytics error:", err);
    res.status(500).json({ message: "Failed to fetch rental analytics" });
  }
};
