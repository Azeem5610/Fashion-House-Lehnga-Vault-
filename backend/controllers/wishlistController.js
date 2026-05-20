const Wishlist = require("../models/Wishlist");

// Helper: get or create wishlist for user
const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [], collections: [] });
  }
  return wishlist;
};

// ── GET wishlist (populated) ──
exports.getWishlist = async (req, res, next) => {
  try {
    let wishlist = await getOrCreateWishlist(req.user.id);
    wishlist = await Wishlist.findById(wishlist._id)
      .populate("products", "name price images category fabricType inStock")
      .populate("collections.products", "name price images category fabricType inStock");
    res.json(wishlist);
  } catch (err) {
    next(err);
  }
};

// ── ADD product to wishlist ──
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: "Product ID is required" });

    const wishlist = await getOrCreateWishlist(req.user.id);

    if (wishlist.products.includes(productId)) {
      return res.status(400).json({ message: "Product already in wishlist" });
    }

    wishlist.products.push(productId);
    await wishlist.save();

    const populated = await Wishlist.findById(wishlist._id)
      .populate("products", "name price images category fabricType inStock");

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

// ── REMOVE product from wishlist ──
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const wishlist = await getOrCreateWishlist(req.user.id);

    wishlist.products = wishlist.products.filter(
      (p) => p.toString() !== productId
    );
    await wishlist.save();

    const populated = await Wishlist.findById(wishlist._id)
      .populate("products", "name price images category fabricType inStock");

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

// ── CHECK if product is in wishlist ──
exports.checkWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) return res.json({ inWishlist: false });

    const inWishlist = wishlist.products.some(
      (p) => p.toString() === req.params.productId
    );
    res.json({ inWishlist });
  } catch (err) {
    next(err);
  }
};

// ── CREATE collection ──
exports.createCollection = async (req, res, next) => {
  try {
    const { name, productIds } = req.body;
    if (!name) return res.status(400).json({ message: "Collection name is required" });

    const wishlist = await getOrCreateWishlist(req.user.id);

    // Check for duplicate name
    const exists = wishlist.collections.some(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) return res.status(400).json({ message: "Collection name already exists" });

    wishlist.collections.push({
      name,
      products: productIds || [],
    });
    await wishlist.save();

    const populated = await Wishlist.findById(wishlist._id)
      .populate("products", "name price images category fabricType inStock")
      .populate("collections.products", "name price images category fabricType inStock");

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

// ── ADD product to collection ──
exports.addToCollection = async (req, res, next) => {
  try {
    const { collectionId } = req.params;
    const { productId } = req.body;

    const wishlist = await getOrCreateWishlist(req.user.id);
    const collection = wishlist.collections.id(collectionId);
    if (!collection) return res.status(404).json({ message: "Collection not found" });

    if (collection.products.includes(productId)) {
      return res.status(400).json({ message: "Product already in collection" });
    }

    collection.products.push(productId);
    await wishlist.save();

    const populated = await Wishlist.findById(wishlist._id)
      .populate("products", "name price images category fabricType inStock")
      .populate("collections.products", "name price images category fabricType inStock");

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

// ── REMOVE product from collection ──
exports.removeFromCollection = async (req, res, next) => {
  try {
    const { collectionId, productId } = req.params;

    const wishlist = await getOrCreateWishlist(req.user.id);
    const collection = wishlist.collections.id(collectionId);
    if (!collection) return res.status(404).json({ message: "Collection not found" });

    collection.products = collection.products.filter(
      (p) => p.toString() !== productId
    );
    await wishlist.save();

    const populated = await Wishlist.findById(wishlist._id)
      .populate("products", "name price images category fabricType inStock")
      .populate("collections.products", "name price images category fabricType inStock");

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

// ── DELETE collection ──
exports.deleteCollection = async (req, res, next) => {
  try {
    const { collectionId } = req.params;
    const wishlist = await getOrCreateWishlist(req.user.id);

    wishlist.collections = wishlist.collections.filter(
      (c) => c._id.toString() !== collectionId
    );
    await wishlist.save();

    const populated = await Wishlist.findById(wishlist._id)
      .populate("products", "name price images category fabricType inStock")
      .populate("collections.products", "name price images category fabricType inStock");

    res.json(populated);
  } catch (err) {
    next(err);
  }
};
