const VirtualTryOn = require("../models/VirtualTryOn");
const Wishlist = require("../models/Wishlist");
const Moodboard = require("../models/Moodboard");
const Order = require("../models/Order");
const Product = require("../models/Product");
const cloudinary = require("cloudinary").v2;

// ── Helper: get or create wishlist ──
const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [], collections: [] });
  }
  return wishlist;
};

// ── Upload bride image (multer-cloudinary handles file) ──
exports.uploadBrideImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    res.json({
      url: req.file.path,
      public_id: req.file.filename,
    });
  } catch (err) {
    next(err);
  }
};

// ── CREATE session ──
exports.createSession = async (req, res, next) => {
  try {
    const { uploadedImage, lehnga, mode, transformData, sessionName } = req.body;

    const session = await VirtualTryOn.create({
      user: req.user.id,
      uploadedImage: uploadedImage || { url: "", public_id: "" },
      lehnga: lehnga || null,
      mode: mode || "mannequin",
      transformData: transformData || {},
      sessionName: sessionName || `Try-On ${new Date().toLocaleDateString("en-PK")}`,
    });

    const populated = await VirtualTryOn.findById(session._id)
      .populate("lehnga", "name price images fabricType category");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// ── UPDATE transform data (autosave) ──
exports.updateSession = async (req, res, next) => {
  try {
    const session = await VirtualTryOn.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { transformData, sessionName, lehnga, mode, uploadedImage } = req.body;

    if (transformData !== undefined) session.transformData = transformData;
    if (sessionName !== undefined) session.sessionName = sessionName;
    if (lehnga !== undefined) session.lehnga = lehnga;
    if (mode !== undefined) session.mode = mode;
    if (uploadedImage !== undefined) session.uploadedImage = uploadedImage;

    await session.save();

    const populated = await VirtualTryOn.findById(session._id)
      .populate("lehnga", "name price images fabricType category");

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

// ── SAVE final preview (base64 dataURL → Cloudinary) ──
exports.saveFinalPreview = async (req, res, next) => {
  try {
    const session = await VirtualTryOn.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { dataUrl } = req.body;
    if (!dataUrl) return res.status(400).json({ message: "dataUrl is required" });

    // Delete old preview from Cloudinary if exists
    if (session.finalPreview?.public_id) {
      await cloudinary.uploader.destroy(session.finalPreview.public_id).catch(() => {});
    }

    // Upload new preview
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: "fashion_house/tryon_previews",
      resource_type: "image",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    });

    session.finalPreview = {
      url: result.secure_url,
      public_id: result.public_id,
    };

    await session.save();
    res.json(session);
  } catch (err) {
    next(err);
  }
};

// ── GET all sessions for current user ──
exports.getUserSessions = async (req, res, next) => {
  try {
    const sessions = await VirtualTryOn.find({ user: req.user.id })
      .populate("lehnga", "name price images fabricType category")
      .sort({ updatedAt: -1 })
      .limit(20);

    res.json({ sessions });
  } catch (err) {
    next(err);
  }
};

// ── GET single session ──
exports.getSession = async (req, res, next) => {
  try {
    const session = await VirtualTryOn.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("lehnga", "name price images fabricType category description sizes");

    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json(session);
  } catch (err) {
    next(err);
  }
};

// ── DELETE session ──
exports.deleteSession = async (req, res, next) => {
  try {
    const session = await VirtualTryOn.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!session) return res.status(404).json({ message: "Session not found" });

    // Cleanup Cloudinary assets
    if (session.uploadedImage?.public_id) {
      await cloudinary.uploader.destroy(session.uploadedImage.public_id).catch(() => {});
    }
    if (session.finalPreview?.public_id) {
      await cloudinary.uploader.destroy(session.finalPreview.public_id).catch(() => {});
    }

    res.json({ message: "Session deleted" });
  } catch (err) {
    next(err);
  }
};

// ── ADD LEHNGA TO WISHLIST from try-on ──
exports.addToWishlist = async (req, res, next) => {
  try {
    const session = await VirtualTryOn.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (!session.lehnga) return res.status(400).json({ message: "No lehnga selected in this session" });

    const wishlist = await getOrCreateWishlist(req.user.id);
    const productId = session.lehnga.toString();

    if (!wishlist.products.map(p => p.toString()).includes(productId)) {
      wishlist.products.push(productId);
      await wishlist.save();
    }

    session.addedToWishlist = true;
    await session.save();

    res.json({ message: "Added to wishlist", addedToWishlist: true });
  } catch (err) {
    next(err);
  }
};

// ── ADD PREVIEW TO MOODBOARD from try-on ──
exports.addToMoodboard = async (req, res, next) => {
  try {
    const session = await VirtualTryOn.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (!session.finalPreview?.url) {
      return res.status(400).json({ message: "Save a preview first before adding to moodboard" });
    }

    const { moodboardId } = req.body;
    if (!moodboardId) return res.status(400).json({ message: "moodboardId is required" });

    const moodboard = await Moodboard.findOne({ _id: moodboardId, user: req.user.id });
    if (!moodboard) return res.status(404).json({ message: "Moodboard not found" });

    moodboard.images.push({
      url: session.finalPreview.url,
      public_id: session.finalPreview.public_id,
      caption: session.sessionName || "Virtual Try-On Preview",
    });
    await moodboard.save();

    session.addedToMoodboard = true;
    await session.save();

    res.json({ message: "Preview added to moodboard", addedToMoodboard: true });
  } catch (err) {
    next(err);
  }
};

// ── CONVERT TO ORDER from try-on ──
exports.convertToOrder = async (req, res, next) => {
  try {
    const session = await VirtualTryOn.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("lehnga", "name price");

    if (!session) return res.status(404).json({ message: "Session not found" });
    if (!session.lehnga) return res.status(400).json({ message: "No lehnga selected in this session" });

    const { size, quantity, shippingAddress, notes } = req.body;
    if (!shippingAddress?.address || !shippingAddress?.city || !shippingAddress?.phone) {
      return res.status(400).json({ message: "Shipping address, city, and phone are required" });
    }

    const totalPrice = session.lehnga.price * (quantity || 1);

    const order = await Order.create({
      user: req.user.id,
      product: session.lehnga._id,
      size: size || "",
      quantity: quantity || 1,
      totalPrice,
      shippingAddress,
      notes: notes || `Created from Virtual Try-On: ${session.sessionName}`,
      status: "pending",
    });

    session.convertedToOrder = true;
    session.orderId = order._id;
    await session.save();

    res.status(201).json({ message: "Order created", order, convertedToOrder: true });
  } catch (err) {
    next(err);
  }
};

// ── ANALYTICS — most tried lehngas ──
exports.getMostTriedLehngas = async (req, res, next) => {
  try {
    const data = await VirtualTryOn.aggregate([
      { $match: { lehnga: { $ne: null } } },
      { $group: { _id: "$lehnga", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          count: 1,
          "product.name": 1,
          "product.price": 1,
          "product.images": { $slice: ["$product.images", 1] },
        },
      },
    ]);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
