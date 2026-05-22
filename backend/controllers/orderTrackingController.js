const OrderTracking = require("../models/OrderTracking");
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const Inventory = require("../models/Inventory");
const Product = require("../models/Product");
const { checkLowStock } = require("./inventoryController");

// CREATE tracking for an order (admin)
exports.createTracking = async (req, res) => {
  try {
    const { orderId, estimatedCompletion } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Check if tracking already exists
    const existing = await OrderTracking.findOne({ order: orderId });
    if (existing) return res.status(400).json({ message: "Tracking already exists for this order" });

    const tracking = await OrderTracking.create({
      order: orderId,
      estimatedCompletion,
    });

    // Update order with tracking reference
    order.tracking = tracking._id;
    await order.save();

    // Notify customer
    try {
      await Notification.create({
        user: order.user,
        type: "order",
        title: "Order Tracking Started",
        message: "Your order is now being tracked. You can follow the progress in real-time.",
        link: `/my-orders`,
        data: { orderId: order._id },
      });
    } catch (e) { /* notification is non-critical */ }

    const populated = await tracking.populate({
      path: "order",
      populate: [
        { path: "product", select: "name images price" },
        { path: "user", select: "name email" },
      ],
    });

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET tracking by order ID (customer or admin)
exports.getTrackingByOrder = async (req, res) => {
  try {
    const tracking = await OrderTracking.findOne({ order: req.params.orderId })
      .populate({
        path: "order",
        populate: [
          { path: "product", select: "name images price" },
          { path: "user", select: "name email" },
        ],
      })
      .populate("stages.assignedTo", "user");

    if (!tracking) {
      return res.status(404).json({ message: "Tracking not found for this order" });
    }

    // If customer, verify ownership
    if (req.user.role === "customer") {
      const order = await Order.findById(req.params.orderId);
      if (!order || order.user.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    res.json(tracking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET all tracked orders (admin)
exports.getAllTracking = async (req, res) => {
  try {
    const { status, stage } = req.query;
    const query = {};

    if (stage) query.currentStage = stage;

    let trackings = await OrderTracking.find(query)
      .populate({
        path: "order",
        populate: [
          { path: "product", select: "name images price" },
          { path: "user", select: "name email" },
        ],
      })
      .sort({ updatedAt: -1 });

    // Filter out trackings where order was deleted
    trackings = trackings.filter((t) => t.order);

    if (status === "completed") {
      trackings = trackings.filter((t) => t.isComplete);
    } else if (status === "in-progress") {
      trackings = trackings.filter((t) => !t.isComplete);
    }

    res.json(trackings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE a stage (admin)
exports.updateStage = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { stageName, status, notes, assignedTo } = req.body;

    const tracking = await OrderTracking.findById(trackingId);
    if (!tracking) return res.status(404).json({ message: "Tracking not found" });

    const stage = tracking.stages.find((s) => s.name === stageName);
    if (!stage) return res.status(400).json({ message: "Invalid stage name" });

    // Update stage fields
    if (status) {
      stage.status = status;
      if (status === "in-progress" && !stage.startDate) {
        stage.startDate = new Date();
      }
      if (status === "completed") {
        stage.completedDate = new Date();

        // Auto-advance currentStage to next pending stage
        const stageIndex = tracking.stages.findIndex((s) => s.name === stageName);
        const nextPending = tracking.stages.find(
          (s, i) => i > stageIndex && s.status === "pending"
        );
        if (nextPending) {
          tracking.currentStage = nextPending.name;
          nextPending.status = "in-progress";
          nextPending.startDate = new Date();
        } else {
          // All stages done
          tracking.currentStage = stageName;
        }
      }
    }
    if (notes !== undefined) stage.notes = notes;
    if (assignedTo) stage.assignedTo = assignedTo;
    await tracking.save();

    // ── Sync back to Order status ──
    const stageToStatusMap = {
      "Order Placed": "confirmed",
      "Fabric Purchased": "fabric-purchased",
      "Dyeing": "dyeing",
      "Embroidery": "embroidery",
      "Stitching": "stitching",
      "Finishing": "finishing",
      "Quality Check": "quality-check",
      "Delivered": "delivered"
    };

    const mappedStatus = stageToStatusMap[tracking.currentStage] || "in-production";
    await Order.findByIdAndUpdate(tracking.order, { status: mappedStatus });

    // ── Inventory auto-consumption on Fabric Purchased completion ──
    if (stageName === "Fabric Purchased" && status === "completed") {
      try {
        const order = await Order.findById(tracking.order).populate("product", "fabricType name");
        if (order && order.product) {
          // Find inventory items matching the fabric type
          const fabricType = order.product.fabricType;
          const inventoryItems = await Inventory.find({
            $or: [
              { name: { $regex: fabricType, $options: "i" } },
              { category: { $regex: fabricType, $options: "i" } },
            ],
            currentQuantity: { $gt: 0 },
          }).sort({ currentQuantity: 1 }); // use lowest stock first

          if (inventoryItems.length > 0) {
            const item = inventoryItems[0];
            const qtyUsed = order.quantity || 1;
            item.currentQuantity = Math.max(0, item.currentQuantity - qtyUsed);
            item.usageHistory.push({
              quantityUsed: qtyUsed,
              usedFor: `Order #${order._id.toString().slice(-6).toUpperCase()} - ${order.product.name}`,
              usedBy: req.user.id,
              date: new Date(),
            });
            await item.save();

            // Check if stock is now low
            const io = req.app.get("io");
            await checkLowStock(item, io);
          }
        }
      } catch (invErr) {
        console.error("Inventory auto-deduction error:", invErr.message);
        // Non-critical — don't block the tracking update
      }
    }

    // Notify customer about stage update
    try {
      const order = await Order.findById(tracking.order);
      if (order) {
        await Notification.create({
          user: order.user,
          type: "production",
          title: `Order Update: ${stageName}`,
          message: `Your order stage "${stageName}" is now ${status}.`,
          link: `/my-orders`,
          data: { orderId: order._id, stage: stageName, status },
        });

        // Emit socket event if available
        const io = req.app.get("io");
        if (io) {
          io.to(`user_${order.user}`).emit("notification", {
            type: "production",
            title: `Order Update: ${stageName}`,
            message: `Stage "${stageName}" is now ${status}.`,
          });
        }
      }
    } catch (e) { /* notification is non-critical */ }

    const populated = await tracking.populate({
      path: "order",
      populate: [
        { path: "product", select: "name images price" },
        { path: "user", select: "name email" },
      ],
    });

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE tracking (admin)
exports.deleteTracking = async (req, res) => {
  try {
    const tracking = await OrderTracking.findById(req.params.id);
    if (!tracking) return res.status(404).json({ message: "Tracking not found" });

    // Remove tracking reference from order
    await Order.findByIdAndUpdate(tracking.order, { $unset: { tracking: 1 } });

    await tracking.deleteOne();
    res.json({ message: "Tracking deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET tracking analytics (admin)
exports.getTrackingAnalytics = async (req, res) => {
  try {
    const all = await OrderTracking.find();
    const total = all.length;
    const completed = all.filter((t) => t.isComplete).length;
    const inProgress = total - completed;

    // Stage distribution
    const stageDistribution = {};
    const { STAGE_NAMES } = require("../models/OrderTracking");
    STAGE_NAMES.forEach((name) => { stageDistribution[name] = 0; });
    all.forEach((t) => {
      if (!t.isComplete) {
        stageDistribution[t.currentStage] = (stageDistribution[t.currentStage] || 0) + 1;
      }
    });

    // Average completion time (for completed orders)
    let avgCompletionDays = 0;
    const completedTrackings = all.filter((t) => t.isComplete);
    if (completedTrackings.length > 0) {
      const totalDays = completedTrackings.reduce((sum, t) => {
        const firstStage = t.stages[0];
        const lastStage = t.stages[t.stages.length - 1];
        if (firstStage.startDate && lastStage.completedDate) {
          return sum + (lastStage.completedDate - firstStage.startDate) / (1000 * 60 * 60 * 24);
        }
        return sum;
      }, 0);
      avgCompletionDays = Math.round(totalDays / completedTrackings.length);
    }

    // Overdue orders (estimated completion passed but not complete)
    const now = new Date();
    const overdue = all.filter(
      (t) => !t.isComplete && t.estimatedCompletion && new Date(t.estimatedCompletion) < now
    ).length;

    res.json({
      total,
      completed,
      inProgress,
      overdue,
      avgCompletionDays,
      stageDistribution,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Sync Stage With Employee Task ──
exports.syncStageWithTask = async (orderId, taskType, taskStatus, assignedTo, user, io) => {
  try {
    const stageMap = {
      "embroidery": "Embroidery",
      "stitching": "Stitching",
      "dyeing": "Dyeing",
      "finishing": "Finishing",
      "quality-check": "Quality Check",
    };
    const stageName = stageMap[taskType];
    if (!stageName) return;

    const tracking = await OrderTracking.findOne({ order: orderId });
    if (!tracking) return;

    // We mock req and res to reuse the comprehensive logic in updateStage
    const req = {
      params: { trackingId: tracking._id },
      body: { stageName, status: taskStatus, assignedTo },
      user,
      app: { get: (key) => (key === "io" ? io : null) },
    };
    const res = {
      json: () => {},
      status: () => ({ json: () => {} }),
    };

    await exports.updateStage(req, res);
  } catch (error) {
    console.error("Failed to sync task with tracking stage:", error);
  }
};
