const Rider = require("../models/Rider");

// CREATE a new rider (admin)
exports.createRider = async (req, res) => {
  try {
    const { name, phone, cnic, vehicleType, vehicleNumber, area, notes } = req.body;

    const rider = await Rider.create({
      name,
      phone,
      cnic: cnic || "",
      vehicleType: vehicleType || "bike",
      vehicleNumber: vehicleNumber || "",
      area: area || "",
      notes: notes || "",
    });

    res.status(201).json(rider);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET all riders (admin) — supports ?status=available&active=true filters
exports.getAllRiders = async (req, res) => {
  try {
    const { status, active } = req.query;
    const query = {};

    if (status) query.status = status;
    // By default only show active riders unless explicitly asked for inactive
    if (active === "false") {
      query.isActive = false;
    } else {
      query.isActive = true;
    }

    const riders = await Rider.find(query).sort({ createdAt: -1 });
    res.json(riders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET single rider by ID (admin)
exports.getRiderById = async (req, res) => {
  try {
    const rider = await Rider.findById(req.params.id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });
    res.json(rider);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE rider (admin)
exports.updateRider = async (req, res) => {
  try {
    const rider = await Rider.findById(req.params.id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const allowedFields = ["name", "phone", "cnic", "vehicleType", "vehicleNumber", "area", "status", "isActive", "notes"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        rider[field] = req.body[field];
      }
    });

    await rider.save();
    res.json(rider);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE rider (soft delete — sets isActive: false)
exports.deleteRider = async (req, res) => {
  try {
    const rider = await Rider.findById(req.params.id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    rider.isActive = false;
    rider.status = "off-duty";
    await rider.save();

    res.json({ message: "Rider deactivated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET rider stats (admin)
exports.getRiderStats = async (req, res) => {
  try {
    const [stats] = await Rider.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ["$isActive", 1, 0] } },
          available: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$status", "available"] }, "$isActive"] }, 1, 0],
            },
          },
          onDelivery: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$status", "on-delivery"] }, "$isActive"] }, 1, 0],
            },
          },
          totalDeliveries: { $sum: "$totalDeliveries" },
        },
      },
    ]);

    res.json({
      total: stats?.total || 0,
      active: stats?.active || 0,
      available: stats?.available || 0,
      onDelivery: stats?.onDelivery || 0,
      totalDeliveries: stats?.totalDeliveries || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
