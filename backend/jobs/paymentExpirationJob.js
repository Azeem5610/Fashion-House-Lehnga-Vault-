const cron = require("node-cron");
const Payment = require("../models/Payment");
const PaymentLog = require("../models/PaymentLog");
const Order = require("../models/Order");

/**
 * Payment Expiration Job
 * Runs every 10 minutes — marks expired payment sessions
 * and notifies customers
 */
function startPaymentExpirationJob() {
  const job = cron.schedule("*/10 * * * *", async () => {
    const startTime = Date.now();
    console.log(`[PaymentExpiration] Job started at ${new Date().toISOString()}`);

    try {
      // Find pending payments past their expiration time
      const expiredPayments = await Payment.find({
        status: "pending",
        expiresAt: { $lt: new Date() },
      }).limit(100);

      console.log(`[PaymentExpiration] Found ${expiredPayments.length} expired payments`);

      let processed = 0;

      for (const payment of expiredPayments) {
        try {
          payment.status = "expired";
          await payment.save();

          // Update order payment status
          await Order.updateOne(
            { _id: payment.order },
            { paymentStatus: "expired" }
          );

          // Create audit log
          await PaymentLog.create({
            payment: payment._id,
            operation: "status_updated",
            details: {
              previousStatus: "pending",
              newStatus: "expired",
              source: "expiration_job",
              expiresAt: payment.expiresAt,
            },
          });

          processed++;
        } catch (err) {
          console.error(
            `[PaymentExpiration] Error expiring payment ${payment._id}:`,
            err.message
          );
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `[PaymentExpiration] Completed in ${duration}ms — Expired: ${processed}`
      );
    } catch (error) {
      console.error("[PaymentExpiration] Job failed:", error.message);
    }
  });

  console.log("✅ Payment expiration job scheduled (every 10 minutes)");
  return job;
}

module.exports = startPaymentExpirationJob;
