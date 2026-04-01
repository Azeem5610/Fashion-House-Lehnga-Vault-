const PurchaseOrder = require("../models/PurchaseOrder");
const Vendor = require("../models/Vendor");

// CREATE purchase order + generate WhatsApp link
exports.createPurchaseOrder = async (req, res) => {
  try {
    const { vendor: vendorId, fabricType, length } = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    const po = await PurchaseOrder.create({ vendor: vendorId, fabricType, length });

    // Generate WhatsApp message
    const message = `Hello ${vendor.name}, we want to order ${length} meters of ${fabricType} fabric.`;
    const whatsappLink = `https://wa.me/${vendor.contactNumber}?text=${encodeURIComponent(message)}`;

    const populated = await po.populate("vendor", "name contactNumber location");
    res.status(201).json({ ...populated.toObject(), whatsappLink });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET all purchase orders
exports.getAllPurchaseOrders = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find()
      .populate("vendor", "name contactNumber location")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE purchase order status
exports.updatePurchaseOrderStatus = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: "Purchase order not found" });

    po.status = req.body.status;
    await po.save();

    const populated = await po.populate("vendor", "name contactNumber location");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
