const Vendor = require("../models/Vendor");
const PurchaseOrder = require("../models/PurchaseOrder");

// ── CREATE vendor ──
exports.createVendor = async (req, res) => {
  try {
    const vendor = await Vendor.create(req.body);
    res.status(201).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET all vendors ──
exports.getAllVendors = async (req, res) => {
  try {
    const { search, specialty, active } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }
    if (specialty) {
      filter.specialties = { $in: [specialty] };
    }
    if (active !== undefined) {
      filter.isActive = active === "true";
    }

    const vendors = await Vendor.find(filter).sort({ createdAt: -1 });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET single vendor ──
exports.getVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    // Get recent purchase orders for this vendor
    const recentOrders = await PurchaseOrder.find({ vendor: vendor._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ vendor, recentOrders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── UPDATE vendor ──
exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE vendor ──
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json({ message: "Vendor deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GENERATE WhatsApp order link ──
exports.generateWhatsAppOrder = async (req, res) => {
  try {
    const { vendorId, items, message } = req.body;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    let orderText = message || `Assalam-o-Alaikum ${vendor.name},\n\nWe would like to place an order:\n\n`;

    if (items && items.length > 0) {
      items.forEach((item, i) => {
        orderText += `${i + 1}. ${item.name} — ${item.quantity} ${item.unit || "pcs"}\n`;
      });
      orderText += `\nPlease confirm availability and delivery time.\nJazakAllah!`;
    }

    const phone = vendor.whatsapp || vendor.contactNumber;
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(orderText)}`;

    res.json({ whatsappLink, message: orderText });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET vendor analytics ──
exports.getVendorAnalytics = async (req, res) => {
  try {
    const [totalVendors, activeVendors, vendorPerformance] = await Promise.all([
      Vendor.countDocuments(),
      Vendor.countDocuments({ isActive: true }),
      Vendor.aggregate([
        {
          $project: {
            name: 1,
            rating: 1,
            totalOrders: 1,
            completedOrders: 1,
            performance: {
              $cond: {
                if: { $eq: ["$totalOrders", 0] },
                then: 0,
                else: {
                  $multiply: [
                    { $divide: ["$completedOrders", "$totalOrders"] },
                    100,
                  ],
                },
              },
            },
          },
        },
        { $sort: { rating: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Orders by vendor
    const ordersByVendor = await PurchaseOrder.aggregate([
      {
        $group: {
          _id: "$vendor",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$totalCost" },
        },
      },
      {
        $lookup: {
          from: "vendors",
          localField: "_id",
          foreignField: "_id",
          as: "vendor",
        },
      },
      { $unwind: "$vendor" },
      {
        $project: {
          vendorName: "$vendor.name",
          totalOrders: 1,
          totalSpent: 1,
        },
      },
      { $sort: { totalSpent: -1 } },
    ]);

    res.json({
      totalVendors,
      activeVendors,
      topVendors: vendorPerformance,
      ordersByVendor,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
