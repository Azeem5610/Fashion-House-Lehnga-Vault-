const PurchaseOrder = require("../models/PurchaseOrder");
const Vendor = require("../models/Vendor");
const Inventory = require("../models/Inventory");

// ── CREATE purchase order + generate WhatsApp link ──
exports.createPurchaseOrder = async (req, res) => {
  try {
    const { vendor: vendorId, items, expectedDelivery, notes } = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    // Calculate item totals
    const processedItems = items.map((item) => ({
      ...item,
      totalCost: (item.quantity || 0) * (item.unitCost || 0),
    }));

    const po = new PurchaseOrder({
      vendor: vendorId,
      items: processedItems,
      expectedDelivery,
      notes,
      createdBy: req.user.id,
    });

    await po.save();

    // Update vendor total orders
    vendor.totalOrders += 1;
    await vendor.save();

    // Generate WhatsApp message
    let message = `Assalam-o-Alaikum ${vendor.name},\n\nNew Purchase Order: ${po.orderNumber}\n\nItems:\n`;
    processedItems.forEach((item, i) => {
      message += `${i + 1}. ${item.name} — ${item.quantity} ${item.unit || "pcs"}`;
      if (item.unitCost) message += ` @ Rs.${item.unitCost}/${item.unit || "pc"}`;
      message += `\n`;
    });
    message += `\nTotal: Rs.${po.totalCost.toLocaleString()}`;
    if (expectedDelivery) {
      message += `\nExpected Delivery: ${new Date(expectedDelivery).toLocaleDateString("en-PK")}`;
    }
    if (notes) message += `\nNotes: ${notes}`;
    message += `\n\nPlease confirm.\nJazakAllah!`;

    const phone = vendor.whatsapp || vendor.contactNumber;
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    const populated = await po.populate("vendor", "name contactNumber whatsapp location");
    res.status(201).json({ ...populated.toObject(), whatsappLink });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET all purchase orders ──
exports.getAllPurchaseOrders = async (req, res) => {
  try {
    const { status, vendor, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (vendor) filter.vendor = vendor;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate("vendor", "name contactNumber whatsapp location")
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PurchaseOrder.countDocuments(filter),
    ]);

    res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET single purchase order ──
exports.getPurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate("vendor", "name contactNumber whatsapp location")
      .populate("createdBy", "name")
      .populate("items.inventory", "name sku");
    if (!po) return res.status(404).json({ message: "Purchase order not found" });
    res.json(po);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── UPDATE purchase order status ──
exports.updatePurchaseOrderStatus = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: "Purchase order not found" });

    const { status } = req.body;
    po.status = status;

    // If received, set actual delivery date, update vendor stats, and stock inventory
    if (status === "received") {
      po.actualDelivery = new Date();

      // Update vendor completed orders count
      const vendor = await Vendor.findById(po.vendor);
      if (vendor) {
        vendor.completedOrders += 1;
        await vendor.save();
      }

      // Stock up inventory for each received item that has an inventory link
      for (const item of po.items) {
        if (item.inventory) {
          await Inventory.findByIdAndUpdate(
            item.inventory,
            { $inc: { quantity: item.quantity } },
            { new: true }
          );
        }
      }
    }

    await po.save();
    const populated = await po.populate("vendor", "name contactNumber whatsapp location");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE purchase order ──
exports.deletePurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!po) return res.status(404).json({ message: "Purchase order not found" });
    res.json({ message: "Purchase order deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
