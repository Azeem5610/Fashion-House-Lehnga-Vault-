const Product = require("../models/Product");
const { cloudinary } = require("../config/cloudinary");

// CREATE product (admin)
exports.createProduct = async (req, res) => {
  try {
    const { name, description, category, fabricType, price, sizes, inStock } = req.body;

    const images = req.files
      ? req.files.map((f) => ({ url: f.path, public_id: f.filename }))
      : [];

    const product = await Product.create({
      name,
      description,
      category,
      fabricType,
      price: Number(price),
      sizes: sizes ? (typeof sizes === "string" ? JSON.parse(sizes) : sizes) : [],
      images,
      inStock: inStock !== undefined ? inStock : true,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET all products (public) — with filters
exports.getAllProducts = async (req, res) => {
  try {
    const { category, fabricType, minPrice, maxPrice, sort } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (fabricType) filter.fabricType = fabricType;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let query = Product.find(filter);

    if (sort === "price-asc") query = query.sort({ price: 1 });
    else if (sort === "price-desc") query = query.sort({ price: -1 });
    else query = query.sort({ createdAt: -1 });

    const products = await query;
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET single product
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE product (admin)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { name, description, category, fabricType, price, sizes, inStock, removeImages } = req.body;

    if (name) product.name = name;
    if (description !== undefined) product.description = description;
    if (category) product.category = category;
    if (fabricType) product.fabricType = fabricType;
    if (price) product.price = Number(price);
    if (sizes) product.sizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
    if (inStock !== undefined) product.inStock = inStock === "true" || inStock === true;

    // Remove specified images from Cloudinary
    if (removeImages) {
      const toRemove = typeof removeImages === "string" ? JSON.parse(removeImages) : removeImages;
      for (const pid of toRemove) {
        await cloudinary.uploader.destroy(pid);
        product.images = product.images.filter((img) => img.public_id !== pid);
      }
    }

    // Add new uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((f) => ({ url: f.path, public_id: f.filename }));
      product.images.push(...newImages);
    }

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE product (admin)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Delete images from Cloudinary
    for (const img of product.images) {
      await cloudinary.uploader.destroy(img.public_id);
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
