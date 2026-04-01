const Order = require("../models/Order");
const Product = require("../models/Product");

// CREATE order (customer)
exports.createOrder = async (req, res) => {
  try {
    const { productId, size, quantity, shippingAddress } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.category !== "ready-made") {
      return res.status(400).json({ message: "Only ready-made products can be ordered directly" });
    }

    const qty = quantity || 1;
    const totalPrice = product.price * qty;

    const order = await Order.create({
      user: req.user.id,
      product: productId,
      size,
      quantity: qty,
      totalPrice,
      shippingAddress,
    });

    const populated = await order.populate("product", "name images price");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET my orders (customer)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("product", "name images price")
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
      .populate("product", "name images price")
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE order status (admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = req.body.status;
    await order.save();

    const populated = await order.populate("product", "name images price");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
