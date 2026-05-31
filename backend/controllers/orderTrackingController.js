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

    // Push isComplete filter into the DB query (Bug #OT-2 fix)
    if (status === "completed") query.isComplete = true;
    else if (status === "in-progress") query.isComplete = false;
    if (stage) query.currentStage = stage;

    const trackings = await OrderTracking.find(query)
      .populate({
        path: "order",
        populate: [
          { path: "product", select: "name images price" },
          { path: "user", select: "name email" },
        ],
      })
      .sort({ updatedAt: -1 });

    // Filter out orphaned trackings whose order was deleted
    res.json(trackings.filter((t) => t.order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Internal shared stage update logic (Bug #OT-1 fix) ──
// Called by both the HTTP handler (updateStage) and the internal sync (syncStageWithTask)
async function _performStageUpdate({ tracking, stageName, status, notes, assignedTo, user, io }) {
  const stage = tracking.stages.find((s) => s.name === stageName);
  if (!stage) throw new Error(`Invalid stage name: ${stageName}`);

  // Capture previous status for idempotency guard
  const previousStatus = stage.status;

  if (status) {
    stage.status = status;
    if (status === "in-progress" && !stage.startDate) stage.startDate = new Date();
    if (status === "completed") {
      stage.completedDate = new Date();
      const stageIndex = tracking.stages.findIndex((s) => s.name === stageName);
      const nextPending = tracking.stages.find((s, i) => i > stageIndex && s.status === "pending");
      if (nextPending) {
        tracking.currentStage = nextPending.name;
        nextPending.status = "in-progress";
        nextPending.startDate = new Date();
      } else {
        tracking.currentStage = stageName;
      }
    }
  }
  if (notes !== undefined) stage.notes = notes;
  if (assignedTo) stage.assignedTo = assignedTo;
  await tracking.save();

  // Sync Order status
  const stageToStatusMap = {
    "Order Placed": "confirmed", "Fabric Purchased": "fabric-purchased",
    "Dyeing": "dyeing", "Embroidery": "embroidery", "Stitching": "stitching",
    "Finishing": "finishing", "Quality Check": "quality-check", "Delivered": "delivered",
  };
  await Order.findByIdAndUpdate(tracking.order, {
    status: stageToStatusMap[tracking.currentStage] || "in-production",
  });

  // Inventory auto-deduction (idempotency guard: only if not already completed)
  if (stageName === "Fabric Purchased" && status === "completed" && previousStatus !== "completed") {
    try {
      const order = await Order.findById(tracking.order).populate("product", "fabricType name");
      if (order && order.product) {
        const fabricType = order.product.fabricType;
        const inventoryItems = await Inventory.find({
          $or: [
            { name: { $regex: fabricType, $options: "i" } },
            { category: { $regex: fabricType, $options: "i" } },
          ],
          quantity: { $gt: 0 },
        }).sort({ quantity: 1 });
        if (inventoryItems.length > 0) {
          const item = inventoryItems[0];
          const qtyUsed = order.quantity || 1;
          item.quantity = Math.max(0, item.quantity - qtyUsed);
          item.usageHistory.push({
            quantityUsed: qtyUsed,
            usedFor: `Order #${order._id.toString().slice(-6).toUpperCase()} - ${order.product.name}`,
            usedBy: user?.id,
            date: new Date(),
          });
          await item.save();
          await checkLowStock(item, io);
        }
      }
    } catch (invErr) {
      console.error("Inventory auto-deduction error:", invErr.message);
    }
  }

  // Notify customer
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
      if (io) {
        io.to(`user_${order.user}`).emit("notification", {
          type: "production",
          title: `Order Update: ${stageName}`,
          message: `Stage "${stageName}" is now ${status}.`,
        });
      }
    }
  } catch (e) { /* notification is non-critical */ }

  return tracking;
}

// UPDATE a stage (admin)
exports.updateStage = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { stageName, status, notes, assignedTo } = req.body;

    const tracking = await OrderTracking.findById(trackingId);
    if (!tracking) return res.status(404).json({ message: "Tracking not found" });

    await _performStageUpdate({
      tracking, stageName, status, notes, assignedTo,
      user: req.user,
      io: req.app.get("io"),
    });

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

// GET tracking analytics (admin) — uses aggregation pipelines (Bug #OT-3 fix)
exports.getTrackingAnalytics = async (req, res) => {
  try {
    const { STAGE_NAMES } = require("../models/OrderTracking");
    const now = new Date();

    // Count totals and overdue in one aggregation
    const [summary] = await OrderTracking.aggregate([
      {
        $addFields: {
          // isComplete virtual: all stages completed or skipped
          isCompleteCalc: {
            $allElementsTrue: {
              $map: {
                input: "$stages",
                as: "s",
                in: { $in: ["$$s.status", ["completed", "skipped"]] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: ["$isCompleteCalc", 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isCompleteCalc", false] },
                    { $lt: ["$estimatedCompletion", now] },
                    { $ne: ["$estimatedCompletion", null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const total = summary?.total || 0;
    const completed = summary?.completed || 0;
    const inProgress = total - completed;
    const overdue = summary?.overdue || 0;

    // Stage distribution for in-progress orders
    const stageAgg = await OrderTracking.aggregate([
      {
        $addFields: {
          isCompleteCalc: {
            $allElementsTrue: {
              $map: {
                input: "$stages",
                as: "s",
                in: { $in: ["$$s.status", ["completed", "skipped"]] },
              },
            },
          },
        },
      },
      { $match: { isCompleteCalc: false } },
      { $group: { _id: "$currentStage", count: { $sum: 1 } } },
    ]);

    const stageDistribution = {};
    STAGE_NAMES.forEach((name) => { stageDistribution[name] = 0; });
    stageAgg.forEach((s) => { stageDistribution[s._id] = s.count; });

    // Average completion time for completed orders (days)
    const avgAgg = await OrderTracking.aggregate([
      {
        $addFields: {
          isCompleteCalc: {
            $allElementsTrue: {
              $map: {
                input: "$stages",
                as: "s",
                in: { $in: ["$$s.status", ["completed", "skipped"]] },
              },
            },
          },
          firstStart: { $arrayElemAt: ["$stages.startDate", 0] },
          lastCompleted: { $arrayElemAt: ["$stages.completedDate", -1] },
        },
      },
      { $match: { isCompleteCalc: true, firstStart: { $ne: null }, lastCompleted: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgMs: {
            $avg: { $subtract: ["$lastCompleted", "$firstStart"] },
          },
        },
      },
    ]);

    const avgCompletionDays = avgAgg[0]
      ? Math.round(avgAgg[0].avgMs / (1000 * 60 * 60 * 24))
      : 0;

    res.json({ total, completed, inProgress, overdue, avgCompletionDays, stageDistribution });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Sync Stage With Employee Task (Bug #OT-1 fix) ──
// Previously used a fake req/res pattern — now calls _performStageUpdate directly
exports.syncStageWithTask = async (orderId, taskType, taskStatus, assignedTo, user, io) => {
  try {
    const stageMap = {
      embroidery: "Embroidery",
      stitching: "Stitching",
      dyeing: "Dyeing",
      finishing: "Finishing",
      "quality-check": "Quality Check",
    };
    const stageName = stageMap[taskType];
    if (!stageName) return;

    const tracking = await OrderTracking.findOne({ order: orderId });
    if (!tracking) return;

    await _performStageUpdate({ tracking, stageName, status: taskStatus, assignedTo, user, io });
  } catch (error) {
    console.error("Failed to sync task with tracking stage:", error);
  }
};
