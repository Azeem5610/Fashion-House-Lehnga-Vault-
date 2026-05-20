const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const User = require("../models/User");

// ── CREATE inventory item ──
exports.createItem = async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    const populated = await item.populate("supplier", "name contactNumber location");
    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "SKU already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

// ── GET all inventory items (with search, filter, pagination) ──
exports.getAllItems = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      search,
      lowStock,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { subcategory: { $regex: search, $options: "i" } },
      ];
    }
    if (lowStock === "true") {
      filter.$expr = { $lte: ["$quantity", "$reorderLevel"] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [items, total] = await Promise.all([
      Inventory.find(filter)
        .populate("supplier", "name contactNumber location")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Inventory.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET single inventory item ──
exports.getItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate("supplier", "name contactNumber location")
      .populate("usageHistory.recordedBy", "name")
      .populate("usageHistory.order", "status totalPrice");
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── UPDATE inventory item ──
exports.updateItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("supplier", "name contactNumber location");
    if (!item) return res.status(404).json({ message: "Item not found" });

    // ── Low stock alert ──
    await checkLowStock(item, req.app.get("io"));

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Reusable low stock checker ──
const checkLowStock = async (item, io) => {
  try {
    if (item.currentQuantity <= item.reorderLevel) {
      // Notify all superadmins
      const admins = await User.find({ role: "superadmin" }).select("_id");
      const notifications = admins.map((admin) => ({
        user: admin._id,
        type: "inventory",
        title: "Low Stock Alert",
        message: `"${item.name}" (${item.sku}) is low — ${item.currentQuantity} ${item.unit} remaining (reorder level: ${item.reorderLevel}).`,
        link: "/admin/inventory",
        data: { inventoryId: item._id, sku: item.sku },
      }));
      await Notification.insertMany(notifications);

      // Real-time broadcast
      if (io) {
        io.to("role_superadmin").to("role_inventoryManager").emit("notification", {
          type: "inventory",
          title: "Low Stock Alert",
          message: `"${item.name}" is running low (${item.currentQuantity} remaining)`,
          createdAt: new Date(),
        });
      }
    }
  } catch (e) {
    console.error("Low stock notification error:", e.message);
  }
};
exports.checkLowStock = checkLowStock;

// ── DELETE inventory item ──
exports.deleteItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET low stock items ──
exports.getLowStock = async (req, res) => {
  try {
    const items = await Inventory.find({
      $expr: { $lte: ["$quantity", "$reorderLevel"] },
    })
      .populate("supplier", "name contactNumber")
      .sort({ quantity: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── RECORD usage (deduct from stock and log) ──
exports.recordUsage = async (req, res) => {
  try {
    const { quantity, reason, order } = req.body;
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.quantity < quantity) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${item.quantity} ${item.unit}`,
      });
    }

    item.quantity -= quantity;
    item.usageHistory.push({
      quantity,
      reason: reason || "Production usage",
      order: order || undefined,
      recordedBy: req.user.id,
    });

    await item.save();
    const populated = await item.populate("supplier", "name contactNumber location");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── ADD stock ──
exports.addStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be positive" });
    }

    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.quantity += quantity;
    await item.save();

    const populated = await item.populate("supplier", "name contactNumber location");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET inventory analytics ──
exports.getAnalytics = async (req, res) => {
  try {
    const [
      totalItems,
      lowStockCount,
      categoryBreakdown,
      totalValueAgg,
    ] = await Promise.all([
      Inventory.countDocuments(),
      Inventory.countDocuments({
        $expr: { $lte: ["$quantity", "$reorderLevel"] },
      }),
      Inventory.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalQuantity: { $sum: "$quantity" },
            totalValue: { $sum: { $multiply: ["$quantity", "$costPerUnit"] } },
          },
        },
      ]),
      Inventory.aggregate([
        {
          $group: {
            _id: null,
            totalValue: { $sum: { $multiply: ["$quantity", "$costPerUnit"] } },
            totalItems: { $sum: "$quantity" },
          },
        },
      ]),
    ]);

    // Subcategory breakdown
    const subcategoryBreakdown = await Inventory.aggregate([
      {
        $group: {
          _id: { category: "$category", subcategory: "$subcategory" },
          count: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalValue: { $sum: { $multiply: ["$quantity", "$costPerUnit"] } },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    res.json({
      totalItems,
      lowStockCount,
      totalValue: totalValueAgg[0]?.totalValue || 0,
      totalQuantity: totalValueAgg[0]?.totalItems || 0,
      categoryBreakdown,
      subcategoryBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
