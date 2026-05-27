const cron = require("node-cron");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const PaymentLog = require("../models/PaymentLog");

/**
 * Order Cancellation Job
 * Runs every hour — cancels orders with expired payments >24 hours old
 * that have no retry attempts
 */
function startOrderCancellationJob() {
  const job = cron.schedule("0 * * * *", async () => {
    const startTime = Date.now();
    console.log(`[OrderCancellation] Job started at ${new Date().toISOString()}`);

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find orders with expired payments older than 24 hours
      const expiredPayments = await Payment.find({
        status: "expired",
        updatedAt: { $lt: twentyFourHoursAgo },
      }).limit(100);

      console.log(`[OrderCancellation] Found ${expiredPayments.length} candidates`);

      let cancelled = 0;

      for (const payment of expiredPayments) {
        try {
          // Check if there are newer payment attempts for this order
          const newerPayment = await Payment.findOne({
            order: payment.order,
            createdAt: { $gt: payment.createdAt },
            status: { $in: ["pending", "completed"] },
          });

          if (newerPayment) {
            continue; // Skip — there's a newer active payment
          }

          // Cancel the order
          const order = await Order.findById(payment.order);
          if (order && order.status === "pending" && order.paymentStatus === "expired") {
            await Order.findByIdAndUpdate(
              order._id,
              { status: "cancelled" },
              { timestamps: true }
            );

            // Create audit log
            await PaymentLog.create({
              payment: payment._id,
              operation: "status_updated",
              details: {
                action: "order_auto_cancelled",
                reason: "Payment expired for more than 24 hours with no retry",
                orderId: order._id,
              },
            });

            cancelled++;
          }
        } catch (err) {
          console.error(
            `[OrderCancellation] Error cancelling order for payment ${payment._id}:`,
            err.message
          );
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `[OrderCancellation] Completed in ${duration}ms — Cancelled: ${cancelled}`
      );
    } catch (error) {
      console.error("[OrderCancellation] Job failed:", error.message);
    }
  });

  console.log("✅ Order cancellation job scheduled (every hour)");
  return job;
}

module.exports = startOrderCancellationJob;
