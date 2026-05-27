const express = require("express");
const router = express.Router();
const { protect, adminOnly, financeOnly } = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");
const {
  createPayment,
  handleWebhook,
  verifyPayment,
  initiateRefund,
  getPaymentByOrder,
  getAllPayments,
  retryPayment,
  confirmCOD,
} = require("../controllers/paymentController");

// Rate limiting for webhook endpoint — 100 req/min per IP
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { message: "Too many webhook requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Public Routes ───────────────────────────────────────────
// Webhook — no auth, uses raw body for signature verification
router.post("/webhook", webhookLimiter, handleWebhook);

// ─── Protected Routes ────────────────────────────────────────
router.post("/create", protect, createPayment);
router.get("/verify/:orderId", protect, verifyPayment);
router.get("/order/:orderId", protect, getPaymentByOrder);
router.post("/retry/:orderId", protect, retryPayment);
router.post("/cod/:orderId", protect, confirmCOD);

// ─── Admin Only Routes ──────────────────────────────────────
// Bug #21: Use financeOnly to prevent tailors from accessing payment data/refunds
router.post("/refund", protect, financeOnly, initiateRefund);
router.get("/", protect, financeOnly, getAllPayments);

module.exports = router;
