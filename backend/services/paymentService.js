const { Safepay } = require("@sfpy/node-sdk");
const crypto = require("crypto");
const mongoose = require("mongoose");

class PaymentService {
  constructor() {
    // Validate credentials exist
    if (!process.env.SAFEPAY_PUBLIC_KEY || !process.env.SAFEPAY_SECRET_KEY) {
      console.warn("⚠️  SafePay credentials not configured. Payment features will not work.");
      this.client = null;
      return;
    }

    // Bug #19: Warn critically if webhook secret is missing
    if (!process.env.SAFEPAY_WEBHOOK_SECRET) {
      console.error("🚨 CRITICAL: SAFEPAY_WEBHOOK_SECRET is not set! Webhook signature verification will be unreliable.");
    }

    this.client = new Safepay({
      // Bug #22: Use env-based environment instead of hardcoded "sandbox"
      environment: process.env.SAFEPAY_ENVIRONMENT || "sandbox",
      apiKey: process.env.SAFEPAY_PUBLIC_KEY,
      v1Secret: process.env.SAFEPAY_SECRET_KEY,
      webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET || "",
    });
  }

  /**
   * Validate payment input data
   */
  validatePaymentData(amount, orderId, currency = "PKR") {
    const errors = [];

    if (!amount || typeof amount !== "number" || amount <= 0) {
      errors.push("Amount must be a positive number");
    }

    if (!orderId) {
      errors.push("Order ID is required");
    } else if (!mongoose.Types.ObjectId.isValid(orderId)) {
      errors.push("Invalid Order ID format");
    }

    if (currency !== "PKR") {
      errors.push("Only PKR currency is supported");
    }

    if (errors.length > 0) {
      const error = new Error(errors.join(", "));
      error.statusCode = 400;
      throw error;
    }

    return true;
  }

  /**
   * Create a payment session with SafePay
   * Returns: { tracker, checkoutUrl, expiresAt }
   */
  async createPaymentSession(orderId, amount, currency = "PKR") {
    if (!this.client) {
      throw new Error("SafePay client not initialized. Check credentials.");
    }

    this.validatePaymentData(amount, orderId, currency);

    try {
      // Step 1: Create payment token via SafePay Payments API
      const paymentData = await this.client.payments.create({
        amount: amount * 100, // SafePay expects amount in paisa (smallest unit)
        currency,
      });

      const tracker = paymentData.token;

      // Step 2: Generate checkout URL
      const checkoutUrl = this.client.checkout.create({
        cancelUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/my-orders`,
        orderId: orderId.toString(),
        redirectUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/payment-status/${orderId}`,
        source: "custom",
        token: tracker,
        webhooks: true,
      });

      // Session expires in 30 minutes
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      return {
        tracker,
        checkoutUrl,
        expiresAt,
      };
    } catch (error) {
      console.error("SafePay session creation error:", error.message);
      const err = new Error(
        error.response?.data?.message || "Failed to create payment session"
      );
      err.statusCode = 502;
      throw err;
    }
  }

  /**
   * Verify payment status from SafePay API
   * Bug #4 fix: Actually calls SafePay API instead of returning stub data.
   * Includes retry logic with exponential backoff.
   */
  async verifyPaymentStatus(tracker) {
    if (!this.client) {
      throw new Error("SafePay client not initialized");
    }

    let lastError = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Call SafePay API to retrieve actual payment status
        const paymentData = await this.client.payments.retrieve(tracker);

        const status = paymentData?.state || paymentData?.status || "unknown";
        const isCompleted = ["PAID", "completed", "success"].includes(status);
        const isFailed = ["FAILED", "failed", "failure"].includes(status);

        return {
          tracker,
          verified: true,
          status: isCompleted ? "completed" : isFailed ? "failed" : status,
          raw: paymentData,
          attempt,
        };
      } catch (error) {
        lastError = error;
        console.error(`[PaymentService] Verify attempt ${attempt} failed for ${tracker}:`, error.message);
        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    throw lastError || new Error("Payment verification failed after retries");
  }

  /**
   * Verify webhook signature using SafePay SDK
   */
  verifyWebhookSignature(req) {
    if (!this.client) {
      return false;
    }

    try {
      return this.client.verify.webhook(req);
    } catch (error) {
      console.error("Webhook signature verification error:", error.message);
      return false;
    }
  }

  /**
   * Verify redirect signature (when user returns from SafePay)
   */
  verifyRedirectSignature(sig, tracker) {
    if (!this.client) {
      return false;
    }

    try {
      return this.client.verify.signature({
        body: { sig, tracker },
      });
    } catch (error) {
      console.error("Redirect signature verification error:", error.message);
      return false;
    }
  }

  /**
   * Initiate a refund through SafePay
   * Bug #5 fix: Attempts real SafePay refund API call.
   * Falls back to local record if SDK lacks refund support, with a warning.
   */
  async initiateRefund(tracker, amount, reason) {
    if (!this.client) {
      throw new Error("SafePay client not initialized");
    }

    try {
      // Attempt real SafePay refund via SDK if available
      if (typeof this.client.payments?.refund === "function") {
        const refundResult = await this.client.payments.refund({
          tracker,
          amount: amount * 100, // paisa
          reason,
        });

        return {
          refundId: refundResult.refund_id || refundResult.id || `ref_${Date.now()}`,
          status: refundResult.status || "completed",
          amount,
          reason,
          timestamp: new Date(),
        };
      }

      // Fallback: SDK doesn't have refund method — log warning and create local record
      console.warn(
        "⚠️  SafePay SDK does not support refunds directly. Recording refund locally. " +
        "Manual refund may be required via SafePay dashboard."
      );

      const refundId = `ref_local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        refundId,
        status: "pending_manual",
        amount,
        reason,
        timestamp: new Date(),
        note: "Refund recorded locally. Process manually via SafePay dashboard.",
      };
    } catch (error) {
      console.error("SafePay refund error:", error.message);
      const err = new Error("Failed to process refund");
      err.statusCode = 502;
      throw err;
    }
  }
}

// Export singleton instance
module.exports = new PaymentService();
