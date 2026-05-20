const Moodboard = require("../models/Moodboard");

// ── GET user's moodboards ──
exports.getMyMoodboards = async (req, res, next) => {
  try {
    const moodboards = await Moodboard.find({ user: req.user.id })
      .populate("products", "name price images category fabricType")
      .sort({ updatedAt: -1 });
    res.json({ moodboards });
  } catch (err) {
    next(err);
  }
};

// ── GET single moodboard ──
exports.getMoodboard = async (req, res, next) => {
  try {
    const moodboard = await Moodboard.findById(req.params.id)
      .populate("products", "name price images category fabricType");

    if (!moodboard) return res.status(404).json({ message: "Moodboard not found" });

    // Only owner or public board can be viewed
    if (
      moodboard.user.toString() !== req.user.id &&
      !moodboard.isPublic
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(moodboard);
  } catch (err) {
    next(err);
  }
};

// ── GET public moodboards (for inspiration gallery) ──
exports.getPublicMoodboards = async (req, res, next) => {
  try {
    const { tag } = req.query;
    const filter = { isPublic: true };
    if (tag) filter.tags = tag;

    const moodboards = await Moodboard.find(filter)
      .populate("user", "name")
      .populate("products", "name price images")
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ moodboards });
  } catch (err) {
    next(err);
  }
};

// ── CREATE moodboard ──
exports.createMoodboard = async (req, res, next) => {
  try {
    const { name, description, images, products, notes, isPublic, tags } = req.body;
    if (!name) return res.status(400).json({ message: "Moodboard name is required" });

    const moodboard = await Moodboard.create({
      user: req.user.id,
      name,
      description,
      images: images || [],
      products: products || [],
      notes,
      isPublic: isPublic || false,
      tags: tags || [],
    });

    res.status(201).json(moodboard);
  } catch (err) {
    next(err);
  }
};

// ── UPDATE moodboard ──
exports.updateMoodboard = async (req, res, next) => {
  try {
    const moodboard = await Moodboard.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!moodboard) return res.status(404).json({ message: "Moodboard not found" });

    const { name, description, images, products, notes, isPublic, tags } = req.body;

    if (name !== undefined) moodboard.name = name;
    if (description !== undefined) moodboard.description = description;
    if (images !== undefined) moodboard.images = images;
    if (products !== undefined) moodboard.products = products;
    if (notes !== undefined) moodboard.notes = notes;
    if (isPublic !== undefined) moodboard.isPublic = isPublic;
    if (tags !== undefined) moodboard.tags = tags;

    await moodboard.save();

    const populated = await Moodboard.findById(moodboard._id)
      .populate("products", "name price images category fabricType");

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

// ── ADD image to moodboard ──
exports.addImage = async (req, res, next) => {
  try {
    const moodboard = await Moodboard.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!moodboard) return res.status(404).json({ message: "Moodboard not found" });

    const { url, public_id, caption } = req.body;
    if (!url) return res.status(400).json({ message: "Image URL is required" });

    moodboard.images.push({ url, public_id: public_id || "", caption: caption || "" });
    await moodboard.save();

    res.json(moodboard);
  } catch (err) {
    next(err);
  }
};

// ── REMOVE image from moodboard ──
exports.removeImage = async (req, res, next) => {
  try {
    const moodboard = await Moodboard.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!moodboard) return res.status(404).json({ message: "Moodboard not found" });

    moodboard.images = moodboard.images.filter(
      (img) => img._id.toString() !== req.params.imageId
    );
    await moodboard.save();

    res.json(moodboard);
  } catch (err) {
    next(err);
  }
};

// ── ADD product to moodboard ──
exports.addProduct = async (req, res, next) => {
  try {
    const moodboard = await Moodboard.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!moodboard) return res.status(404).json({ message: "Moodboard not found" });

    const { productId } = req.body;
    if (moodboard.products.includes(productId)) {
      return res.status(400).json({ message: "Product already in moodboard" });
    }

    moodboard.products.push(productId);
    await moodboard.save();

    const populated = await Moodboard.findById(moodboard._id)
      .populate("products", "name price images category fabricType");

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

// ── REMOVE product from moodboard ──
exports.removeProduct = async (req, res, next) => {
  try {
    const moodboard = await Moodboard.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!moodboard) return res.status(404).json({ message: "Moodboard not found" });

    moodboard.products = moodboard.products.filter(
      (p) => p.toString() !== req.params.productId
    );
    await moodboard.save();

    const populated = await Moodboard.findById(moodboard._id)
      .populate("products", "name price images category fabricType");

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

// ── DELETE moodboard ──
exports.deleteMoodboard = async (req, res, next) => {
  try {
    const moodboard = await Moodboard.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!moodboard) return res.status(404).json({ message: "Moodboard not found" });
    res.json({ message: "Moodboard deleted" });
  } catch (err) {
    next(err);
  }
};
