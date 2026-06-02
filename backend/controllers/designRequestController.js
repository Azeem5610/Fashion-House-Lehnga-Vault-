const DesignRequest = require("../models/DesignRequest");
const Order = require("../models/Order");
const { cloudinary } = require("../config/cloudinary");
const { createAndEmit } = require("./notificationController");

// CREATE design request (customer uploads reference images)
exports.createDesignRequest = async (req, res) => {
  try {
    const { description, requestType } = req.body;

    const images = req.files
      ? req.files.map((f) => ({ url: f.path, public_id: f.filename }))
      : [];

    if (images.length === 0) {
      return res.status(400).json({ message: "Please upload at least one reference image" });
    }

    const request = await DesignRequest.create({
      user: req.user.id,
      images,
      description,
      requestType: requestType || "exact-copy",
    });

    // Notify admins
    const io = req.app.get("io");
    if (io) {
      io.to("role_superadmin").to("role_productionManager").emit("notification", {
        type: "order",
        title: "New Design Request",
        message: `${req.user.name} submitted a design request (${requestType || "exact-copy"})`,
        createdAt: new Date(),
      });
    }

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET my design requests (customer)
exports.getMyDesignRequests = async (req, res) => {
  try {
    const requests = await DesignRequest.find({ user: req.user.id })
      .populate({
        path: "convertedOrder",
        select: "status totalPrice rider",
        populate: { path: "rider", select: "name phone vehicleType vehicleNumber" }
      })
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET all design requests (admin)
exports.getAllDesignRequests = async (req, res) => {
  try {
    const requests = await DesignRequest.find()
      .populate("user", "name email phone")
      .populate({
        path: "convertedOrder",
        select: "status totalPrice rider",
        populate: { path: "rider", select: "name phone vehicleType vehicleNumber" }
      })
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE design request status (admin)
exports.updateDesignRequestStatus = async (req, res) => {
  try {
    const request = await DesignRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Design request not found" });

    const { status, adminNotes } = req.body;
    if (status) request.status = status;
    if (adminNotes !== undefined) request.adminNotes = adminNotes;

    await request.save();

    // Notify customer of status change
    const io = req.app.get("io");
    const statusMessages = {
      contacted: "We've received your design request and will contact you shortly.",
      quoted: "A price quote is ready for your design request! Check it out.",
      approved: "Your design request has been approved and will enter production.",
      "in-production": "Your custom design is now in production!",
      completed: "Your custom design is complete! 🎉",
      rejected: "Unfortunately, we're unable to fulfill this design request at this time.",
    };

    if (status && statusMessages[status]) {
      await createAndEmit(io, {
        userId: request.user,
        type: "order",
        title: "Design Request Update",
        message: statusMessages[status],
        link: "/my-orders",
        data: { designRequestId: request._id, status },
      });
    }

    const populated = await request.populate("user", "name email phone");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// SEND PRICE QUOTE (admin)
exports.sendQuote = async (req, res) => {
  try {
    const { quotedPrice, estimatedDays, adminNotes } = req.body;
    if (!quotedPrice || quotedPrice <= 0) {
      return res.status(400).json({ message: "Valid price is required" });
    }

    const request = await DesignRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Design request not found" });

    request.quotedPrice = quotedPrice;
    request.estimatedDays = estimatedDays || 0;
    request.adminNotes = adminNotes || request.adminNotes;
    request.status = "quoted";
    await request.save();

    // Notify customer
    const io = req.app.get("io");
    await createAndEmit(io, {
      userId: request.user,
      type: "order",
      title: "Price Quote Ready",
      message: `Your design request has been quoted at Rs.${quotedPrice.toLocaleString()}. Estimated delivery: ${estimatedDays || "TBD"} days.`,
      link: "/my-orders",
      data: { designRequestId: request._id, quotedPrice },
    });

    const populated = await request.populate("user", "name email phone");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CONVERT design request to order (admin)
exports.convertToOrder = async (req, res) => {
  try {
    const request = await DesignRequest.findById(req.params.id).populate("user", "name email");
    if (!request) return res.status(404).json({ message: "Design request not found" });

    if (request.convertedOrder) {
      return res.status(400).json({ message: "This request has already been converted to an order" });
    }
    if (!request.quotedPrice || request.quotedPrice <= 0) {
      return res.status(400).json({ message: "Please send a price quote first" });
    }

    // Safely parse shippingAddress
    let shippingAddress = { address: "TBD", city: "TBD", phone: "TBD" };
    if (req.body && req.body.shippingAddress) {
      const sa = req.body.shippingAddress;
      shippingAddress = {
        address: sa.address && sa.address.trim() ? sa.address.trim() : "TBD",
        city: sa.city && sa.city.trim() ? sa.city.trim() : "TBD",
        phone: sa.phone && sa.phone.trim() ? sa.phone.trim() : "TBD",
      };
    }

    // Create order from design request
    const order = await Order.create({
      user: request.user._id,
      product: null, // custom design, no catalog product
      size: "",
      quantity: 1,
      totalPrice: request.quotedPrice,
      shippingAddress,
      notes: `Design Request: ${request.requestType}. ${request.description}`,
      status: "confirmed",
      paymentMethod: "cod",         // Custom orders are direct arrangements — no SafePay session
      paymentStatus: "cod_pending", // Allows pre-save hook to pass without completed payment
    });

    // Link order to design request
    request.convertedOrder = order._id;
    request.status = "approved";
    await request.save();

    // Notify customer
    const io = req.app.get("io");
    await createAndEmit(io, {
      userId: request.user._id,
      type: "order",
      title: "Design Request Approved!",
      message: `Your custom design has been converted to an order. Total: Rs.${request.quotedPrice.toLocaleString()}`,
      link: `/track-order/${order._id}`,
      data: { orderId: order._id },
    });

    res.status(201).json({ order, designRequest: request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
