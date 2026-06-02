const Order = require("../models/Order");
const Product = require("../models/Product");
const OrderTracking = require("../models/OrderTracking");
const Payment = require("../models/Payment");
const PaymentLog = require("../models/PaymentLog");
const Rider = require("../models/Rider");
const paymentService = require("../services/paymentService");
const { createAndEmit } = require("./notificationController");

// Status-to-stage mapping for auto-syncing tracking
const STATUS_TO_STAGE = {
  "fabric-purchased": "Fabric Purchased",
  "dyeing": "Dyeing",
  "embroidery": "Embroidery",
  "stitching": "Stitching",
  "finishing": "Finishing",
  "quality-check": "Quality Check",
  "delivered": "Delivered",
};

// CREATE order (customer) — supports both ready-made and customized
exports.createOrder = async (req, res) => {
  try {
    const { productId, size, quantity, shippingAddress, notes, paymentMethod = "safepay" } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Validate paymentMethod
    if (!["safepay", "cod"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method. Use 'safepay' or 'cod'." });
    }

    const qty = quantity || 1;
    const totalPrice = product.price * qty;

    const order = await Order.create({
      user: req.user.id,
      product: productId,
      size: size || "",
      quantity: qty,
      totalPrice,
      shippingAddress,
      notes: notes || "",
      paymentMethod,
      // COD orders get cod_pending status; SafePay orders stay pending until payment
      paymentStatus: paymentMethod === "cod" ? "cod_pending" : "pending",
    });

    const populated = await order.populate("product", "name images price");

    // Send notification to admin(s)
    const io = req.app.get("io");
    if (io) {
      io.to("role_superadmin").to("role_productionManager").emit("notification", {
        type: "order",
        title: "New Order Received",
        message: `${req.user.name} placed an order for ${product.name} — Rs.${totalPrice.toLocaleString()} (${paymentMethod.toUpperCase()})`,
        createdAt: new Date(),
      });
    }

    const responseObj = populated.toObject();

    // Bug #25: Payment session is NOT auto-created here.
    // For SafePay orders, the frontend should call POST /payments/create or navigate to CheckoutPage.
    // For COD orders, no payment session is needed.

    res.status(201).json(responseObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET my orders (customer)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("product", "name images price category")
      .populate("payment")
      .populate("rider", "name phone vehicleType vehicleNumber")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET all orders (admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("product", "name images price category")
      .populate("user", "name email phone")
      .populate("payment")
      .populate("rider", "name phone vehicleType vehicleNumber status")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET single order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("product", "name images price category sizes")
      .populate("user", "name email phone")
      .populate("payment")
      .populate("rider", "name phone vehicleType vehicleNumber status");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Verify ownership
    const adminRoles = ["superadmin", "inventoryManager", "productionManager", "tailor"];
    if (order.user._id.toString() !== req.user.id.toString() && !adminRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE order status (admin) — NOW with notification + tracking sync
exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("product", "name images price")
      .populate("user", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const previousStatus = order.status;
    const newStatus = req.body.status;
    const riderId = req.body.riderId;
    const newPaymentStatus = req.body.paymentStatus;

    if (newPaymentStatus) {
      order.paymentStatus = newPaymentStatus;

      // Sync Payment document if exists
      if (newPaymentStatus === "completed") {
        await Payment.updateOne(
          { order: order._id },
          { $set: { status: "completed", completedAt: new Date(), transactionId: `admin_manual_${Date.now()}` } }
        );
      } else {
        await Payment.updateOne(
          { order: order._id },
          { $set: { status: newPaymentStatus } }
        );
      }
    }

    if (newStatus) {
      // Validate payment before status updates to confirmed (allows COD pending)
      if (newStatus === "confirmed" && order.paymentStatus !== "completed" && order.paymentStatus !== "cod_pending") {
        return res.status(400).json({ message: "Cannot confirm order without completed payment or Cash on Delivery pending" });
      }
      order.status = newStatus;
    }

    // ── Rider assignment ──
    if (riderId) {
      const rider = await Rider.findById(riderId);
      if (rider && rider.isActive) {
        // Release previous rider if swapping
        if (order.rider && order.rider.toString() !== riderId) {
          await Rider.findByIdAndUpdate(order.rider, { status: "available" });
        }
        order.rider = riderId;
        rider.status = "on-delivery";
        await rider.save();
      }
    }

    await order.save();

    const io = req.app.get("io");

    // ── Sync with OrderTracking if exists ──
    const stageName = STATUS_TO_STAGE[newStatus];
    if (stageName) {
      const tracking = await OrderTracking.findOne({ order: order._id });
      if (tracking) {
        const stage = tracking.stages.find(s => s.name === stageName);
        if (stage && stage.status !== "completed") {
          // Complete all previous stages
          const stageIdx = tracking.stages.findIndex(s => s.name === stageName);
          for (let i = 0; i < stageIdx; i++) {
            if (tracking.stages[i].status !== "completed" && tracking.stages[i].status !== "skipped") {
              tracking.stages[i].status = "completed";
              tracking.stages[i].completedDate = new Date();
            }
          }
          // Mark current stage in-progress or completed
          stage.status = "in-progress";
          stage.startDate = stage.startDate || new Date();
          tracking.currentStage = stageName;
          await tracking.save();
        }
      }
    }

    // If delivered, complete all tracking stages and release rider
    if (newStatus === "delivered") {
      const tracking = await OrderTracking.findOne({ order: order._id });
      if (tracking) {
        tracking.stages.forEach(s => {
          if (s.status !== "skipped") {
            s.status = "completed";
            s.completedDate = s.completedDate || new Date();
          }
        });
        tracking.currentStage = "Delivered";
        await tracking.save();
      }

      // Release rider and increment delivery count
      if (order.rider) {
        await Rider.findByIdAndUpdate(order.rider, {
          status: "available",
          $inc: { totalDeliveries: 1 },
        });
      }
    }

    // ── Send notification to customer ──
    if (order.user && previousStatus !== newStatus) {
      const statusMessages = {
        "confirmed": "Your order has been confirmed! We're preparing it for production.",
        "in-production": "Your order has entered the production pipeline!",
        "fabric-purchased": "Fabric for your order has been purchased.",
        "dyeing": "Your fabric is now in the dyeing stage.",
        "embroidery": "Embroidery work has started on your order.",
        "stitching": "Your lehnga is being stitched!",
        "finishing": "Your order is in the finishing stage — almost done!",
        "quality-check": "Your order is undergoing a quality check.",
        "shipped": "Your order has been shipped! It's on its way.",
        "delivered": "Your order has been delivered. We hope you love it! ✨",
        "cancelled": "Your order has been cancelled. Contact us if you have questions.",
      };

      await createAndEmit(io, {
        userId: order.user._id,
        type: "order",
        title: "Order Status Updated",
        message: statusMessages[newStatus] || `Your order status changed to: ${newStatus}`,
        link: `/track-order/${order._id}`,
        data: { orderId: order._id, status: newStatus },
      });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CANCEL order (customer — only pending/confirmed)
exports.cancelMyOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Verify ownership
    if (order.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Only allow cancel if pending or confirmed
    if (!["pending", "confirmed"].includes(order.status)) {
      return res.status(400).json({
        message: "Cannot cancel an order that is already in production or shipped",
      });
    }

    order.status = "cancelled";

    // Bug #8: Also expire associated payment and update paymentStatus
    if (order.paymentStatus === "pending" || order.paymentStatus === "cod_pending") {
      order.paymentStatus = "expired";
    }
    await order.save();

    // Expire any pending Payment records for this order
    await Payment.updateMany(
      { order: order._id, status: "pending" },
      { status: "expired" }
    );

    const populated = await order.populate("product", "name images price");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
