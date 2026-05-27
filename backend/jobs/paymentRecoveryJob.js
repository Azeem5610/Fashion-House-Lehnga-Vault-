const cron = require("node-cron");
const Payment = require("../models/Payment");
const PaymentLog = require("../models/PaymentLog");
const Order = require("../models/Order");
const paymentService = require("../services/paymentService");

let consecutiveFailures = 0;

/**
 * Payment Recovery Job
 * Runs every 15 minutes — checks stale pending payments (>10 min old)
 * and verifies their status with SafePay API
 */
function startPaymentRecoveryJob() {
  const job = cron.schedule("*/15 * * * *", async () => {
    const startTime = Date.now();
    console.log(`[PaymentRecovery] Job started at ${new Date().toISOString()}`);

    try {
      // Find stale pending payments older than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const stalePayments = await Payment.find({
        status: "pending",
        createdAt: { $lt: tenMinutesAgo },
      })
        .limit(100)
        .sort({ createdAt: 1 });

      console.log(`[PaymentRecovery] Found ${stalePayments.length} stale payments`);

      let recovered = 0;
      let expired = 0;
      let errors = 0;

      for (const payment of stalePayments) {
        try {
          // Bug #27: Expiration job handles expired payments. Skip them here to prevent overlaps.
          if (payment.expiresAt && payment.expiresAt < new Date()) {
            continue;
          }

          // Try to verify with SafePay (returns actual status via real API call)
          const result = await paymentService.verifyPaymentStatus(payment.safepayTracker);

          if (result.verified && result.status === "completed") {
            // Bug #26: Actually update Payment status to completed atomically
            const updateResult = await Payment.updateOne(
              { _id: payment._id, status: "pending" },
              {
                $set: {
                  status: "completed",
                  completedAt: new Date(),
                  transactionId: result.raw?.transaction_id || result.raw?.transactionId || payment.safepayTracker
                }
              }
            );

            if (updateResult.modifiedCount > 0) {
              // Update associated order status
              await Order.updateOne(
                { _id: payment.order },
                { paymentStatus: "completed", status: "confirmed" }
              );

              // Log successful recovery
              await PaymentLog.create({
                payment: payment._id,
                operation: "verification_succeeded",
                details: {
                  source: "recovery_job",
                  tracker: payment.safepayTracker,
                  result: "recovered_completed",
                },
              });
              recovered++;
            }
          } else if (result.verified && result.status === "failed") {
            // Update to failed
            const updateResult = await Payment.updateOne(
              { _id: payment._id, status: "pending" },
              { $set: { status: "failed" } }
            );

            if (updateResult.modifiedCount > 0) {
              await Order.updateOne(
                { _id: payment.order },
                { paymentStatus: "failed" }
              );

              await PaymentLog.create({
                payment: payment._id,
                operation: "status_updated",
                details: {
                  source: "recovery_job",
                  tracker: payment.safepayTracker,
                  result: "failed",
                },
              });
            }
          }
        } catch (err) {
          errors++;
          console.error(`[PaymentRecovery] Error processing payment ${payment._id}:`, err.message);
        }
      }

      consecutiveFailures = 0;
      const duration = Date.now() - startTime;
      console.log(
        `[PaymentRecovery] Completed in ${duration}ms — Recovered: ${recovered}, Expired: ${expired}, Errors: ${errors}`
      );
    } catch (error) {
      consecutiveFailures++;
      console.error("[PaymentRecovery] Job failed:", error.message);

      if (consecutiveFailures >= 3) {
        console.error("[PaymentRecovery] ⚠️ ALERT: 3 consecutive failures!");
      }
    }
  });

  console.log("✅ Payment recovery job scheduled (every 15 minutes)");
  return job;
}

module.exports = startPaymentRecoveryJob;
