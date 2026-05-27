const Payment = require("../models/Payment");
const PaymentLog = require("../models/PaymentLog");
const Order = require("../models/Order");
const paymentService = require("../services/paymentService");
const { createAndEmit } = require("./notificationController");
const mongoose = require("mongoose");

/**
 * Create a new payment session for an order
 * POST /api/payments/create
 */
exports.createPayment = async (req, res, next) => {
  try {
    const { orderId, amount, currency = "PKR" } = req.body;

    // Validate input
    paymentService.validatePaymentData(amount, orderId, currency);

    // Check order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check order belongs to user (or user is admin)
    const adminRoles = ["superadmin", "inventoryManager", "productionManager", "tailor"];
    if (order.user.toString() !== req.user.id.toString() && !adminRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Check if order already has a completed payment
    if (order.paymentStatus === "completed") {
      return res.status(400).json({ message: "Order already paid" });
    }

    // Create SafePay session
    const session = await paymentService.createPaymentSession(orderId, amount, currency);

    // Create Payment record
    const payment = await Payment.create({
      order: orderId,
      safepayTracker: session.tracker,
      amount,
      currency,
      status: "pending",
      checkoutUrl: session.checkoutUrl,
      expiresAt: session.expiresAt,
    });

    // Update order with payment reference
    order.payment = payment._id;
    order.safepayTracker = session.tracker;
    order.paymentStatus = "pending";
    await order.save();

    // Create audit log
    await PaymentLog.create({
      payment: payment._id,
      operation: "session_created",
      details: {
        orderId,
        tracker: session.tracker,
        amount,
        currency,
        expiresAt: session.expiresAt,
      },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({
      checkoutUrl: session.checkoutUrl,
      tracker: session.tracker,
      expiresAt: session.expiresAt,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("Create payment error:", error.message);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

/**
 * Handle SafePay webhook events
 * POST /api/payments/webhook
 */
exports.handleWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const isValid = paymentService.verifyWebhookSignature(req);

    if (!isValid) {
      console.warn("⚠️  Webhook signature verification failed", {
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      // Log failed verification attempt
      await PaymentLog.create({
        payment: null,
        operation: "webhook_received",
        details: {
          signatureValid: false,
          ip: req.ip,
          reason: "Invalid signature",
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      }).catch(() => {}); // Don't fail on log error

      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    // Parse webhook payload
    const webhookData = req.body.data || req.body;
    const eventType = webhookData.type || req.body.type || "payment.updated";
    const tracker = webhookData.tracker || webhookData.token;

    if (!tracker) {
      return res.status(400).json({ message: "Missing tracker in webhook" });
    }

    // Find payment by tracker
    const payment = await Payment.findOne({ safepayTracker: tracker });
    if (!payment) {
      console.warn("Webhook for unknown tracker:", tracker);
      return res.status(200).json({ message: "OK" }); // Return 200 to prevent retries
    }

    // Check idempotency — if already processed this event
    const alreadyProcessed = payment.webhookEvents.some(
      (e) => e.eventType === eventType && e.payload?.tracker === tracker
    );

    if (alreadyProcessed && (payment.status === "completed" || payment.status === "refunded")) {
      return res.status(200).json({ message: "Already processed" });
    }

    // Add webhook event record
    payment.webhookEvents.push({
      eventType,
      payload: webhookData,
    });

    // Determine new status based on event type
    let newStatus = payment.status;
    let transactionId = payment.transactionId;
    let paymentMethodName = payment.paymentMethod;
    if (eventType.includes("completed") || eventType.includes("success")) {
      newStatus = "completed";
      transactionId = webhookData.transaction_id || webhookData.transactionId || tracker;
      paymentMethodName = webhookData.payment_method || webhookData.paymentMethod || "card";
    } else if (eventType.includes("failed") || eventType.includes("failure")) {
      newStatus = "failed";
    } else if (eventType.includes("expired")) {
      newStatus = "expired";
    } else if (eventType.includes("refund")) {
      newStatus = "refunded";
    }

    const previousStatus = payment.status;

    // Bug #24: Atomic transition to prevent race conditions with user redirect
    const updateResult = await Payment.updateOne(
      { _id: payment._id, status: "pending" },
      {
        $set: {
          status: newStatus,
          completedAt: newStatus === "completed" ? new Date() : payment.completedAt,
          transactionId,
          paymentMethod: paymentMethodName
        },
        $push: {
          webhookEvents: {
            eventType,
            payload: webhookData
          }
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      // payment was already updated (e.g., by the redirect verifyPayment API call)
      return res.status(200).json({ message: "Already processed by redirect or webhook conflict" });
    }

    // Update order status — Bug #6: Use Order.updateOne to bypass pre-save hook conflict
    const order = await Order.findById(payment.order).populate("user", "name email");
    if (order) {
      const orderUpdate = { paymentStatus: newStatus };
      if (newStatus === "completed") {
        orderUpdate.status = "confirmed";
      }

      await Order.updateOne({ _id: order._id }, { $set: orderUpdate });

      // Apply to in-memory order object for correct notifications below
      order.paymentStatus = newStatus;
      if (newStatus === "completed") {
        order.status = "confirmed";
      }

      // Emit Socket.io notifications
      const io = req.app.get("io");
      if (io && order.user && previousStatus !== newStatus) {
        if (newStatus === "completed") {
          // Notify customer
          await createAndEmit(io, {
            userId: order.user._id || order.user,
            type: "order",
            title: "Payment Successful! 🎉",
            message: `Your payment of Rs. ${payment.amount.toLocaleString()} has been completed. Your order is now confirmed!`,
            link: `/track-order/${order._id}`,
            data: { orderId: order._id, paymentStatus: "completed" },
          });

          // Notify admins
          io.to("role_superadmin").to("role_productionManager").emit("notification", {
            type: "order",
            title: "Payment Received",
            message: `Payment of Rs. ${payment.amount.toLocaleString()} received for order #${order._id.toString().slice(-6).toUpperCase()}`,
            createdAt: new Date(),
          });
        } else if (newStatus === "failed") {
          await createAndEmit(io, {
            userId: order.user._id || order.user,
            type: "order",
            title: "Payment Failed",
            message: `Your payment could not be processed. Please try again.`,
            link: `/my-orders`,
            data: { orderId: order._id, paymentStatus: "failed" },
          });
        }
      }
    }

    // Create audit log
    await PaymentLog.create({
      payment: payment._id,
      operation: "webhook_received",
      details: {
        eventType,
        tracker,
        previousStatus,
        newStatus,
        signatureValid: true,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Return 200 within 5 seconds
    res.status(200).json({ message: "Webhook processed" });
  } catch (error) {
    console.error("Webhook processing error:", error.message);
    res.status(200).json({ message: "OK" }); // Always return 200 to prevent retries
  }
};

/**
 * Verify payment status for an order
 * GET /api/payments/verify/:orderId
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { sig, tracker } = req.query;

    const order = await Order.findById(orderId)
      .populate("product", "name images price")
      .populate("payment");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Bug #20: Check ownership or admin role before exposing payment info
    const adminRoles = ["superadmin", "inventoryManager", "productionManager", "tailor"];
    if (order.user.toString() !== req.user.id.toString() && !adminRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized to access this payment record" });
    }

    // Support Cash on Delivery (COD) order verification directly without Payment model lookup
    if (order.paymentMethod === "cod") {
      return res.json({
        payment: {
          status: order.paymentStatus || "cod_pending",
          amount: order.totalPrice,
          currency: "PKR",
          paymentMethod: "cod",
          completedAt: order.paymentStatus === "completed" ? new Date() : null,
          createdAt: order.createdAt,
        },
        order: {
          _id: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: "cod",
          totalPrice: order.totalPrice,
          shippingAddress: order.shippingAddress,
        }
      });
    }

    const payment = order.payment || (await Payment.findOne({ order: orderId }).sort({ createdAt: -1 }));

    if (!payment) {
      return res.status(404).json({ message: "No payment found for this order" });
    }

    // If sig and tracker provided (redirect from SafePay), verify signature
    if (sig && tracker) {
      const signatureValid = paymentService.verifyRedirectSignature(sig, tracker);

      if (signatureValid) {
        // Bug #24: Atomic transition to prevent race conditions with webhook
        const updateResult = await Payment.updateOne(
          { _id: payment._id, status: "pending" },
          {
            $set: {
              status: "completed",
              completedAt: new Date(),
              transactionId: tracker
            }
          }
        );

        if (updateResult.modifiedCount > 0) {
          payment.status = "completed";
          payment.completedAt = new Date();
          payment.transactionId = tracker;

          // Update order
          order.paymentStatus = "completed";
          order.status = "confirmed";
          await Order.updateOne(
            { _id: order._id },
            { paymentStatus: "completed", status: "confirmed" }
          );

          // Log verification
          await PaymentLog.create({
            payment: payment._id,
            operation: "verification_succeeded",
            details: { tracker, sig, source: "redirect" },
            performedBy: req.user?.id,
            ipAddress: req.ip,
          });
        } else {
          // Already updated by webhook, reload status from database
          const reloadedPayment = await Payment.findById(payment._id);
          payment.status = reloadedPayment.status;
          payment.completedAt = reloadedPayment.completedAt;
          payment.transactionId = reloadedPayment.transactionId;

          order.paymentStatus = reloadedPayment.status;
          if (reloadedPayment.status === "completed") {
            order.status = "confirmed";
          }
        }
      }
    }

    // Log verification attempt
    await PaymentLog.create({
      payment: payment._id,
      operation: "verification_attempted",
      details: {
        status: payment.status,
        tracker: payment.safepayTracker,
      },
      performedBy: req.user?.id,
      ipAddress: req.ip,
    });

    res.json({
      payment: {
        _id: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod,
        completedAt: payment.completedAt,
        checkoutUrl: payment.checkoutUrl,
        expiresAt: payment.expiresAt,
        createdAt: payment.createdAt,
      },
      order: {
        _id: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalPrice: order.totalPrice,
        product: order.product,
      },
    });
  } catch (error) {
    console.error("Verify payment error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Initiate a refund for a completed payment (admin only)
 * POST /api/payments/refund
 */
exports.initiateRefund = async (req, res) => {
  try {
    const { orderId, amount, reason } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({ message: "Order ID and reason are required" });
    }

    const order = await Order.findById(orderId).populate("payment");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const payment = order.payment || (await Payment.findOne({ order: orderId, status: "completed" }));
    if (!payment) {
      return res.status(400).json({ message: "No completed payment found for this order" });
    }

    if (payment.status !== "completed") {
      return res.status(400).json({ message: "Can only refund completed payments" });
    }

    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) {
      return res.status(400).json({ message: "Refund amount cannot exceed payment amount" });
    }

    // Initiate refund via SafePay
    const refundResult = await paymentService.initiateRefund(
      payment.safepayTracker,
      refundAmount,
      reason
    );

    // Update payment status
    payment.status = "refunded";
    payment.refund = {
      refundId: refundResult.refundId,
      amount: refundAmount,
      reason,
      initiatedBy: req.user.id,
      refundedAt: new Date(),
    };
    await payment.save();

    // Update order
    order.paymentStatus = "refunded";
    order.status = "cancelled";
    await Order.updateOne(
      { _id: order._id },
      { paymentStatus: "refunded", status: "cancelled" }
    );

    // Create audit log
    await PaymentLog.create({
      payment: payment._id,
      operation: "refund_initiated",
      details: {
        refundId: refundResult.refundId,
        amount: refundAmount,
        reason,
        tracker: payment.safepayTracker,
      },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Notify customer
    const io = req.app.get("io");
    if (io && order.user) {
      await createAndEmit(io, {
        userId: order.user._id || order.user,
        type: "order",
        title: "Refund Processed",
        message: `A refund of Rs. ${refundAmount.toLocaleString()} has been issued for your order.`,
        link: `/my-orders`,
        data: { orderId: order._id, paymentStatus: "refunded" },
      });
    }

    res.json({
      message: "Refund processed successfully",
      refund: {
        refundId: refundResult.refundId,
        amount: refundAmount,
        reason,
        status: "completed",
      },
    });
  } catch (error) {
    console.error("Refund error:", error.message);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

/**
 * Get payment details for a specific order
 * GET /api/payments/order/:orderId
 */
exports.getPaymentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({ order: orderId })
      .sort({ createdAt: -1 })
      .populate("order", "status paymentStatus totalPrice user");

    if (!payment) {
      return res.status(404).json({ message: "No payment found for this order" });
    }

    // Verify authorization
    const adminRoles = ["superadmin", "inventoryManager", "productionManager", "tailor"];
    if (
      payment.order?.user?.toString() !== req.user.id.toString() &&
      !adminRoles.includes(req.user.role)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(payment);
  } catch (error) {
    console.error("Get payment error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all payments with filters (admin only)
 * GET /api/payments
 */
exports.getAllPayments = async (req, res) => {
  try {
    const {
      status,
      dateFrom,
      dateTo,
      searchQuery,
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Bug #10: Move search filter to MongoDB query level (before pagination/skip)
    if (searchQuery) {
      const q = new RegExp(searchQuery, "i");
      
      // Look up matching users
      const User = mongoose.model("User");
      const users = await User.find({
        $or: [{ name: q }, { email: q }]
      }).select("_id");
      const userIds = users.map((u) => u._id);

      // Look up matching orders
      const orders = await Order.find({
        $or: [
          { user: { $in: userIds } }
        ]
      }).select("_id");
      const orderIds = orders.map((o) => o._id);

      query.$or = [
        { safepayTracker: q },
        { transactionId: q },
        { order: { $in: orderIds } }
      ];

      if (mongoose.Types.ObjectId.isValid(searchQuery)) {
        query.$or.push({ _id: searchQuery });
        query.$or.push({ order: searchQuery });
      }
    }

    const total = await Payment.countDocuments(query);

    // Fetch payments with populated data (correct pagination after search)
    const payments = await Payment.find(query)
      .populate({
        path: "order",
        select: "user product totalPrice status paymentStatus shippingAddress",
        populate: [
          { path: "user", select: "name email phone" },
          { path: "product", select: "name images price" },
        ],
      })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    // Bug #9: Compute analytics using aggregate instead of fetching all payments into memory
    const analyticsPipeline = await Payment.aggregate([
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                totalAmount: { $sum: "$amount" }
              }
            }
          ],
          totalStats: [
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const statusStats = analyticsPipeline[0]?.byStatus || [];
    const overallStats = analyticsPipeline[0]?.totalStats || [];
    const totalPaymentsCount = overallStats[0]?.totalCount || 0;

    let totalRevenue = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let expiredCount = 0;
    let refundedCount = 0;

    statusStats.forEach((item) => {
      if (item._id === "completed") {
        completedCount = item.count;
        totalRevenue = item.totalAmount;
      } else if (item._id === "pending") {
        pendingCount = item.count;
      } else if (item._id === "failed") {
        failedCount = item.count;
      } else if (item._id === "expired") {
        expiredCount = item.count;
      } else if (item._id === "refunded") {
        refundedCount = item.count;
      }
    });

    const successRate = totalPaymentsCount > 0
      ? ((completedCount / totalPaymentsCount) * 100).toFixed(1)
      : 0;

    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      analytics: {
        totalRevenue,
        successRate: parseFloat(successRate),
        pendingCount,
        completedCount,
        failedCount,
        expiredCount,
        refundedCount,
      },
    });
  } catch (error) {
    console.error("Get all payments error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Retry a failed or expired payment
 * POST /api/payments/retry/:orderId
 */
exports.retryPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization
    const adminRoles = ["superadmin", "inventoryManager", "productionManager", "tailor"];
    if (order.user.toString() !== req.user.id.toString() && !adminRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Find existing payment
    const existingPayment = await Payment.findOne({ order: orderId }).sort({ createdAt: -1 });

    if (existingPayment && !["failed", "expired"].includes(existingPayment.status)) {
      if (existingPayment.status === "completed") {
        return res.status(400).json({ message: "Payment already completed" });
      }
      if (existingPayment.status === "pending" && !existingPayment.isExpired) {
        return res.json({
          message: "Existing payment session still active",
          checkoutUrl: existingPayment.checkoutUrl,
          tracker: existingPayment.safepayTracker,
        });
      }
    }

    // Check retry limit (max 5 attempts)
    const attemptCount = await Payment.countDocuments({ order: orderId });
    if (attemptCount >= 5) {
      return res.status(400).json({
        message: "Maximum retry attempts (5) reached. Please contact support.",
      });
    }

    // Invalidate previous payment session
    if (existingPayment && existingPayment.status === "pending") {
      existingPayment.status = "expired";
      await existingPayment.save();
    }

    // Create new payment session
    const session = await paymentService.createPaymentSession(
      orderId,
      order.totalPrice,
      "PKR"
    );

    // Create new Payment record
    const payment = await Payment.create({
      order: orderId,
      safepayTracker: session.tracker,
      amount: order.totalPrice,
      currency: "PKR",
      status: "pending",
      checkoutUrl: session.checkoutUrl,
      expiresAt: session.expiresAt,
      attempts: [{ status: "retry", errorMessage: `Retry attempt #${attemptCount + 1}` }],
    });

    // Update order
    order.payment = payment._id;
    order.safepayTracker = session.tracker;
    order.paymentStatus = "pending";
    await order.save();

    // Create audit log
    await PaymentLog.create({
      payment: payment._id,
      operation: "session_created",
      details: {
        orderId,
        tracker: session.tracker,
        retryAttempt: attemptCount + 1,
        previousPaymentId: existingPayment?._id,
      },
      performedBy: req.user.id,
      ipAddress: req.ip,
    });

    res.json({
      message: "New payment session created",
      checkoutUrl: session.checkoutUrl,
      tracker: session.tracker,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("Retry payment error:", error.message);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

/**
 * Confirm order with Cash on Delivery
 * POST /api/payments/cod/:orderId
 */
exports.confirmCOD = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check ownership or admin
    const adminRoles = ["superadmin", "inventoryManager", "productionManager", "tailor"];
    if (order.user.toString() !== req.user.id.toString() && !adminRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (order.paymentStatus === "completed") {
      return res.status(400).json({ message: "Order already paid" });
    }

    // Switch order payment details to COD pending
    order.paymentMethod = "cod";
    order.paymentStatus = "cod_pending";
    await order.save();

    // Create PaymentLog
    await PaymentLog.create({
      payment: null,
      operation: "status_updated",
      details: {
        action: "converted_to_cod",
        orderId: order._id,
      },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({
      message: "Order updated to Cash on Delivery successfully",
      order: {
        _id: order._id,
        paymentMethod: "cod",
        paymentStatus: "cod_pending",
        status: order.status,
      },
    });
  } catch (error) {
    console.error("Confirm COD error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
