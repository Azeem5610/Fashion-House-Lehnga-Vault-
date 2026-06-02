const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { handleWebhook } = require("./controllers/paymentController");
const rateLimit = require("express-rate-limit");
const initSocket = require("./config/socket");

connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);
app.set("io", io);

// ── Webhook route MUST be mounted BEFORE express.json() ──
// SafePay webhook signature verification needs the raw request body
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: "Too many webhook requests" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.post(
  "/api/payments/webhook",
  webhookLimiter,
  express.raw({ type: "application/json" }),
  handleWebhook
);

// Middleware
app.use(express.json({
  limit: "15mb",
  // Preserve raw body for any other routes that may need it
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());
// Configure CORS to dynamically allow localhost, any Vercel deployment, and CLIENT_URL
const allowedOrigins = ["http://localhost:3000"];
if (process.env.CLIENT_URL) {
  // Support comma-separated origins in CLIENT_URL
  process.env.CLIENT_URL.split(",").forEach(url => allowedOrigins.push(url.trim()));
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => origin === allowed || origin.replace(/\/$/, "") === allowed.replace(/\/$/, ""));
    const isVercel = /\.vercel\.app$/.test(origin);
    const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin);

    if (isAllowed || isVercel || isLocalhost) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
}));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/vendors", require("./routes/vendorRoutes"));
app.use("/api/purchase-orders", require("./routes/purchaseOrderRoutes"));
app.use("/api/design-requests", require("./routes/designRequestRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/inventory", require("./routes/inventoryRoutes"));
app.use("/api/employees", require("./routes/employeeRoutes"));
app.use("/api/machinery", require("./routes/machineryRoutes"));
app.use("/api/appointments", require("./routes/appointmentRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));

// Phase 3 & 4 — New module routes
app.use("/api/order-tracking", require("./routes/orderTrackingRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// New modules — Cost Estimation & Rental Records
app.use("/api/cost-estimations", require("./routes/costEstimationRoutes"));
app.use("/api/rentals", require("./routes/rentalRoutes"));

// Rider / Delivery Module
app.use("/api/riders", require("./routes/riderRoutes"));

// SafePay Payment Integration Routes
app.use("/api/payments", require("./routes/paymentRoutes"));

// Start Background Jobs
const startPaymentRecoveryJob = require("./jobs/paymentRecoveryJob");
const startPaymentExpirationJob = require("./jobs/paymentExpirationJob");
const startOrderCancellationJob = require("./jobs/orderCancellationJob");

startPaymentRecoveryJob();
startPaymentExpirationJob();
startOrderCancellationJob();

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io ready for connections`);
});