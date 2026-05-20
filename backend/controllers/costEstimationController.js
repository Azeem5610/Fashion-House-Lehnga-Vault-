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

// @desc    Get cost estimation analytics/summary
// @route   GET /api/cost-estimations/analytics
// @access  superadmin
exports.getAnalytics = async (req, res) => {
  try {
    const estimations = await CostEstimation.find();

    const totalEstimations = estimations.length;
    let totalBaseCost = 0;
    let totalSellingPrice = 0;
    let totalProfit = 0;

    // Cost category totals
    let totalFabric = 0;
    let totalEmbroidery = 0;
    let totalLabor = 0;
    let totalAccessories = 0;
    let totalDyeing = 0;
    let totalExtras = 0;

    estimations.forEach((est) => {
      totalFabric += est.fabricCost || 0;
      totalEmbroidery += est.embroideryCost || 0;
      totalLabor += est.laborCost || 0;
      totalAccessories += est.accessoriesCost || 0;
      totalDyeing += est.dyeingCost || 0;

      const extras = (est.extraCosts || []).reduce((s, e) => s + (e.amount || 0), 0);
      totalExtras += extras;

      const base = (est.fabricCost || 0) + (est.embroideryCost || 0) + (est.laborCost || 0) +
                   (est.accessoriesCost || 0) + (est.dyeingCost || 0) + extras;
      totalBaseCost += base;

      const selling = est.sellingPrice || (base + (base * (est.profitMarginPercent || 0)) / 100);
      totalSellingPrice += selling;
      totalProfit += selling - base;
    });

    const avgProfitMargin = totalBaseCost > 0
      ? ((totalProfit / totalBaseCost) * 100).toFixed(1)
      : 0;

    const costBreakdown = [
      { name: "Fabric", value: totalFabric },
      { name: "Embroidery", value: totalEmbroidery },
      { name: "Labor", value: totalLabor },
      { name: "Accessories", value: totalAccessories },
      { name: "Dyeing", value: totalDyeing },
      { name: "Extras", value: totalExtras },
    ].filter((c) => c.value > 0);

    res.json({
      totalEstimations,
      totalBaseCost,
      totalSellingPrice,
      totalProfit,
      avgProfitMargin: Number(avgProfitMargin),
      costBreakdown,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
};
