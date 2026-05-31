const CostEstimation = require("../models/CostEstimation");
const Order = require("../models/Order");

// @desc    Create a new cost estimation
// @route   POST /api/cost-estimations
// @access  superadmin
exports.createEstimation = async (req, res) => {
  try {
    const {
      title, order, product,
      fabricCost, embroideryCost, laborCost, accessoriesCost, dyeingCost,
      extraCosts, profitMarginPercent, sellingPrice, notes,
    } = req.body;

    const estimation = await CostEstimation.create({
      title,
      order: order || undefined,
      product: product || undefined,
      fabricCost: fabricCost || 0,
      embroideryCost: embroideryCost || 0,
      laborCost: laborCost || 0,
      accessoriesCost: accessoriesCost || 0,
      dyeingCost: dyeingCost || 0,
      extraCosts: extraCosts || [],
      profitMarginPercent: profitMarginPercent || 0,
      sellingPrice: sellingPrice || 0,
      notes: notes || "",
      createdBy: req.user.id,
    });

    const populated = await CostEstimation.findById(estimation._id)
      .populate("order", "status totalPrice")
      .populate("product", "name")
      .populate("createdBy", "name");

    res.status(201).json(populated);
  } catch (err) {
    console.error("Create estimation error:", err);
    res.status(500).json({ message: err.message || "Failed to create estimation" });
  }
};

// @desc    Get all cost estimations (with filters)
// @route   GET /api/cost-estimations
// @access  superadmin
exports.getEstimations = async (req, res) => {
  try {
    const { search, sort = "-createdAt" } = req.query;
    const filter = {};

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const estimations = await CostEstimation.find(filter)
      .sort(sort)
      .populate("order", "status totalPrice")
      .populate("product", "name")
      .populate("createdBy", "name");

    res.json(estimations);
  } catch (err) {
    console.error("Get estimations error:", err);
    res.status(500).json({ message: "Failed to fetch estimations" });
  }
};

// @desc    Get single cost estimation
// @route   GET /api/cost-estimations/:id
// @access  superadmin
exports.getEstimation = async (req, res) => {
  try {
    const estimation = await CostEstimation.findById(req.params.id)
      .populate("order", "status totalPrice user")
      .populate("product", "name price")
      .populate("createdBy", "name");

    if (!estimation) {
      return res.status(404).json({ message: "Estimation not found" });
    }

    res.json(estimation);
  } catch (err) {
    console.error("Get estimation error:", err);
    res.status(500).json({ message: "Failed to fetch estimation" });
  }
};

// @desc    Update cost estimation
// @route   PUT /api/cost-estimations/:id
// @access  superadmin
exports.updateEstimation = async (req, res) => {
  try {
    const estimation = await CostEstimation.findById(req.params.id);
    if (!estimation) {
      return res.status(404).json({ message: "Estimation not found" });
    }

    const allowedFields = [
      "title", "order", "product",
      "fabricCost", "embroideryCost", "laborCost", "accessoriesCost", "dyeingCost",
      "extraCosts", "profitMarginPercent", "sellingPrice", "notes",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        estimation[field] = req.body[field];
      }
    });

    await estimation.save();

    const populated = await CostEstimation.findById(estimation._id)
      .populate("order", "status totalPrice")
      .populate("product", "name")
      .populate("createdBy", "name");

    res.json(populated);
  } catch (err) {
    console.error("Update estimation error:", err);
    res.status(500).json({ message: err.message || "Failed to update estimation" });
  }
};

// @desc    Delete cost estimation
// @route   DELETE /api/cost-estimations/:id
// @access  superadmin
exports.deleteEstimation = async (req, res) => {
  try {
    const estimation = await CostEstimation.findByIdAndDelete(req.params.id);
    if (!estimation) {
      return res.status(404).json({ message: "Estimation not found" });
    }
    res.json({ message: "Estimation deleted" });
  } catch (err) {
    console.error("Delete estimation error:", err);
    res.status(500).json({ message: "Failed to delete estimation" });
  }
};

// @desc    Get cost estimation analytics/summary (Optimized via Aggregation Pipeline)
// @route   GET /api/cost-estimations/analytics
// @access  superadmin
exports.getAnalytics = async (req, res) => {
  try {
    const stats = await CostEstimation.aggregate([
      {
        $addFields: {
          extras: {
            $reduce: {
              input: { $ifNull: ["$extraCosts", []] },
              initialValue: 0,
              in: { $add: ["$$value", { $ifNull: ["$$this.amount", 0] }] },
            },
          },
        },
      },
      {
        $addFields: {
          baseCost: {
            $add: [
              { $ifNull: ["$fabricCost", 0] },
              { $ifNull: ["$embroideryCost", 0] },
              { $ifNull: ["$laborCost", 0] },
              { $ifNull: ["$accessoriesCost", 0] },
              { $ifNull: ["$dyeingCost", 0] },
              "$extras",
            ],
          },
        },
      },
      {
        $addFields: {
          sellingPriceVal: {
            $cond: [
              { $gt: [{ $ifNull: ["$sellingPrice", 0] }, 0] },
              "$sellingPrice",
              {
                $add: [
                  "$baseCost",
                  {
                    $divide: [
                      { $multiply: ["$baseCost", { $ifNull: ["$profitMarginPercent", 0] }] },
                      100,
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalEstimations: { $sum: 1 },
          totalFabric: { $sum: { $ifNull: ["$fabricCost", 0] } },
          totalEmbroidery: { $sum: { $ifNull: ["$embroideryCost", 0] } },
          totalLabor: { $sum: { $ifNull: ["$laborCost", 0] } },
          totalAccessories: { $sum: { $ifNull: ["$accessoriesCost", 0] } },
          totalDyeing: { $sum: { $ifNull: ["$dyeingCost", 0] } },
          totalExtras: { $sum: "$extras" },
          totalBaseCost: { $sum: "$baseCost" },
          totalSellingPrice: { $sum: "$sellingPriceVal" },
        },
      },
    ]);

    const result = stats?.[0] || {};
    const totalEstimations = result.totalEstimations || 0;
    const totalBaseCost = result.totalBaseCost || 0;
    const totalSellingPrice = result.totalSellingPrice || 0;
    const totalProfit = totalSellingPrice - totalBaseCost;

    const avgProfitMargin = totalBaseCost > 0
      ? Number(((totalProfit / totalBaseCost) * 100).toFixed(1))
      : 0;

    const costBreakdown = [
      { name: "Fabric", value: result.totalFabric || 0 },
      { name: "Embroidery", value: result.totalEmbroidery || 0 },
      { name: "Labor", value: result.totalLabor || 0 },
      { name: "Accessories", value: result.totalAccessories || 0 },
      { name: "Dyeing", value: result.totalDyeing || 0 },
      { name: "Extras", value: result.totalExtras || 0 },
    ].filter((c) => c.value > 0);

    res.json({
      totalEstimations,
      totalBaseCost,
      totalSellingPrice,
      totalProfit,
      avgProfitMargin,
      costBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
