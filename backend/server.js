const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const initSocket = require("./config/socket");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);
app.set("io", io);

// Middleware
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
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
app.use("/api/moodboards", require("./routes/moodboardRoutes"));

// Phase 3 & 4 — New module routes
app.use("/api/order-tracking", require("./routes/orderTrackingRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// New modules — Cost Estimation & Rental Records
app.use("/api/cost-estimations", require("./routes/costEstimationRoutes"));
app.use("/api/rentals", require("./routes/rentalRoutes"));

// Virtual Try-On module
app.use("/api/virtual-tryon", require("./routes/virtualTryOnRoutes"));

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